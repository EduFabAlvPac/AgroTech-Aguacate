/**
 * Backfill de Fase 0 (multi-tenancy) — ver CLAUDE.md §2.1 y docs/REQUERIMIENTOS.md ADR-001.
 *
 * Por cada User existente sin Membresia:
 *   1. Crea una Organizacion 1:1 (transparente — el usuario sigue viendo exactamente
 *      lo mismo que antes, solo que ahora "vive" dentro de su propia organización).
 *   2. Crea una Membresia con rol OWNER.
 *   3. Asigna organizacionId a todas las Fincas de ese usuario que aún no lo tengan.
 *
 * Idempotente: un User que ya tiene alguna Membresia se omite, así que correr este
 * script varias veces (o tras agregar usuarios nuevos) es seguro.
 *
 * Uso: npx tsx prisma/backfill-organizaciones.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(base: string): string {
  return base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "org";
}

async function slugUnico(base: string): Promise<string> {
  const raiz = slugify(base);
  let slug = raiz;
  let intento = 1;
  // Colisiones se resuelven con un sufijo incremental — en la práctica el volumen
  // de usuarios del piloto hace esto un caso borde, no un cuello de botella.
  while (await prisma.organizacion.findUnique({ where: { slug } })) {
    intento += 1;
    slug = `${raiz}-${intento}`;
  }
  return slug;
}

async function main() {
  console.log("🏢 Backfill de organizaciones — Fase 0 multi-tenancy");

  const usuariosSinMembresia = await prisma.user.findMany({
    where: { membresias: { none: {} } },
    select: { id: true, name: true, email: true },
  });

  if (usuariosSinMembresia.length === 0) {
    console.log("✅ Todos los usuarios ya tienen organización. Nada que hacer.");
    return;
  }

  console.log(`Encontrados ${usuariosSinMembresia.length} usuario(s) sin organización.`);

  for (const user of usuariosSinMembresia) {
    const nombreOrg = user.name ? `Finca de ${user.name}` : `Organización de ${user.email}`;
    const slug = await slugUnico(user.name ?? user.email.split("@")[0]);

    await prisma.$transaction(async (tx) => {
      const organizacion = await tx.organizacion.create({
        data: { nombre: nombreOrg, slug },
      });

      await tx.membresia.create({
        data: { userId: user.id, organizacionId: organizacion.id, rol: "OWNER", aceptada: true },
      });

      const { count } = await tx.finca.updateMany({
        where: { userId: user.id, organizacionId: null },
        data: { organizacionId: organizacion.id },
      });

      console.log(`  → ${user.email}: organización "${slug}" creada, ${count} finca(s) vinculada(s).`);
    });
  }

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
