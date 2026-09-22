/**
 * Backfill de ADR-011 Sprint 1 (IAM) — ver docs/ADR-011-Modelo-Identidad-Roles-Permisos.md
 * y CLAUDE.md §2.1/§2.3.
 *
 * Llena las columnas "sombra" que el modelo nuevo agrega sobre lo que ya
 * existe (ninguna reemplaza a `rol`/`aceptada`/`activa`, que siguen siendo
 * la fuente de verdad hasta el cutover de un sprint posterior):
 *
 *   Membresia.estado        ← aceptada/activa (ver mapeo abajo)
 *   Membresia.rolesIam      ← rol, vía rolLegacyARolIam() (policies.ts)
 *   Membresia.esRolPrimario ← true en la membresía más antigua de cada usuario
 *   User.metodoAuthPreferido← experiencia/password (ver mapeo abajo)
 *   Organizacion.planIniciadoEn ← createdAt, solo donde sea null
 *
 * Idempotente a propósito: NO marca "ya procesado" en ningún lado, recorre
 * TODAS las filas y recalcula cada vez — correrlo dos veces da el mismo
 * resultado. Así, si se agrega un usuario/membresía nueva después de un
 * primer corrido, un segundo corrido los deja al día sin distinguir casos.
 *
 * Uso: npx tsx prisma/backfill-iam.ts  (o: npm run db:backfill-iam)
 */
import { PrismaClient } from "@prisma/client";
import { rolLegacyARolIam } from "../src/lib/authz/policies";

const prisma = new PrismaClient();

async function backfillMembresias() {
  const membresias = await prisma.membresia.findMany({
    select: {
      id: true,
      userId: true,
      rol: true,
      aceptada: true,
      activa: true,
      createdAt: true,
      organizacion: { select: { tipo: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (membresias.length === 0) {
    console.log("  (sin membresías)");
    return;
  }

  // La más antigua de cada usuario es la "primaria" — un usuario puede
  // tener varias membresías (dueño de su propia org + colaborador invitado
  // en otra), y esRolPrimario decide cuál manda cuando haga falta un único
  // rol "de referencia" (ver ADR-011 §5).
  const primeraPorUsuario = new Map<string, string>();
  for (const m of membresias) {
    if (!primeraPorUsuario.has(m.userId)) primeraPorUsuario.set(m.userId, m.id);
  }

  let actualizadas = 0;
  await prisma.$transaction(
    membresias.map((m) => {
      const estado = !m.aceptada ? "PENDIENTE_INVITACION" : !m.activa ? "SUSPENDIDA" : "ACTIVA";
      const rolesIam = rolLegacyARolIam(m.rol, m.organizacion.tipo);
      const esRolPrimario = primeraPorUsuario.get(m.userId) === m.id;
      actualizadas += 1;
      return prisma.membresia.update({
        where: { id: m.id },
        data: { estado, rolesIam, esRolPrimario },
      });
    })
  );

  console.log(`  → ${actualizadas} membresía(s) actualizada(s).`);
}

async function backfillUsuarios() {
  const usuarios = await prisma.user.findMany({
    select: { id: true, experiencia: true, password: true },
  });

  if (usuarios.length === 0) {
    console.log("  (sin usuarios)");
    return;
  }

  let actualizados = 0;
  await prisma.$transaction(
    usuarios.map((u) => {
      // Sin adaptador de cuentas (Google entra directo por Credentials
      // "virtual" en auth.ts) — la única forma confiable de saber que una
      // cuenta entró por Google es que nunca tuvo contraseña.
      const metodoAuthPreferido =
        u.experiencia === "CAMPESINO" ? "WHATSAPP_MAGIC_LINK" : !u.password ? "GOOGLE" : "EMAIL_PASSWORD";
      actualizados += 1;
      return prisma.user.update({ where: { id: u.id }, data: { metodoAuthPreferido } });
    })
  );

  console.log(`  → ${actualizados} usuario(s) actualizado(s).`);
}

async function backfillOrganizaciones() {
  const organizaciones = await prisma.organizacion.findMany({
    where: { planIniciadoEn: null },
    select: { id: true, createdAt: true },
  });

  if (organizaciones.length === 0) {
    console.log("  (sin organizaciones pendientes — ya todas tienen planIniciadoEn)");
    return;
  }

  await prisma.$transaction(
    organizaciones.map((o) => prisma.organizacion.update({ where: { id: o.id }, data: { planIniciadoEn: o.createdAt } }))
  );

  console.log(`  → ${organizaciones.length} organización(es) actualizada(s).`);
}

async function main() {
  console.log("🔐 Backfill de IAM — ADR-011 Sprint 1");

  console.log("Membresías (estado, rolesIam, esRolPrimario)...");
  await backfillMembresias();

  console.log("Usuarios (metodoAuthPreferido)...");
  await backfillUsuarios();

  console.log("Organizaciones (planIniciadoEn)...");
  await backfillOrganizaciones();

  console.log("✅ Backfill completo.");
}

main()
  .catch((error) => {
    console.error("❌ Error en el backfill:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
