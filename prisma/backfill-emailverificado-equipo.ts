/**
 * Fix de datos — colaboradores de Equipo bloqueados por emailVerificado.
 *
 * Bug real detectado en QA del Sprint 1 de ADR-011 (ver PR de sesiones/
 * tokens): `agregarMiembro()` (equipo-actions.ts) y `POST /api/equipo`
 * crean la cuenta de un colaborador sin marcar `User.emailVerificado`, así
 * que desde que existe la verificación obligatoria de correo (PR #48,
 * Fase 1 Tanda 2) **ningún colaborador nuevo agregado desde Equipo puede
 * iniciar sesión**. La creación ya se corrigió (ahora marca
 * `emailVerificado` al crear la cuenta, es el dueño quien la vincula y
 * comparte la contraseña por fuera de la app); este script repara a los
 * que ya quedaron atrapados en producción.
 *
 * Cómo distingue "colaborador de Equipo bloqueado por el bug" de "cuenta
 * de self-signup legítimamente pendiente de verificar" (que NO se debe
 * tocar — ese es el propósito real de la verificación): un colaborador de
 * Equipo siempre tiene una `Membresia` con `invitadoPorId` seteado (lo
 * pone agregarMiembro/POST /api/equipo); un self-signup (`/registro`) crea
 * su propia Membresia OWNER sin `invitadoPorId`. Las cuentas Campesino no
 * tienen Membresia (no aplica el filtro) y de todas formas su login no
 * depende de `emailVerificado`.
 *
 * Idempotente: solo toca filas con `emailVerificado IS NULL`, así que
 * correrlo de nuevo no hace nada si ya no queda ninguna.
 *
 * Uso: npx tsx prisma/backfill-emailverificado-equipo.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("✉️  Fix de emailVerificado para colaboradores de Equipo bloqueados");

  const afectados = await prisma.user.findMany({
    where: {
      emailVerificado: null,
      membresias: { some: { invitadoPorId: { not: null } } },
    },
    select: { id: true, email: true, createdAt: true },
  });

  if (afectados.length === 0) {
    console.log("✅ No hay cuentas afectadas. Nada que hacer.");
    return;
  }

  console.log(`Encontradas ${afectados.length} cuenta(s) de colaborador bloqueada(s) por el bug.`);

  await prisma.$transaction(
    afectados.map((u) =>
      // createdAt, no now(): coherente con el mismo criterio que ya usa el
      // db push original para las cuentas "viejas" (ver comentario en
      // auth.ts) — la fecha real en que la cuenta se creó, no la del fix.
      prisma.user.update({ where: { id: u.id }, data: { emailVerificado: u.createdAt } })
    )
  );

  for (const u of afectados) {
    console.log(`  → ${u.email}: emailVerificado reparado.`);
  }

  console.log("✅ Fix completo.");
}

main()
  .catch((error) => {
    console.error("❌ Error en el fix:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
