/**
 * Designa (o revoca) el flag esSuperAdmin de un usuario — ver CLAUDE.md §2.3.
 * Es la única forma de acceder al panel de administración de fichas técnicas
 * (/dashboard/admin/fichas-tecnicas); no hay flujo de auto-designación por UI
 * a propósito (evita que cualquier usuario se auto-promueva).
 *
 * Uso:
 *   npx tsx prisma/set-super-admin.ts usuario@ejemplo.co        (otorga)
 *   npx tsx prisma/set-super-admin.ts usuario@ejemplo.co --revoke (revoca)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const revocar = process.argv.includes("--revoke");

  if (!email) {
    console.error("Uso: npx tsx prisma/set-super-admin.ts <email> [--revoke]");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.update({
    where: { email },
    data: { esSuperAdmin: !revocar },
  });

  console.log(`✅ ${user.email}: esSuperAdmin = ${user.esSuperAdmin}`);
}

main()
  .catch((error) => {
    console.error("❌ Error:", error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
