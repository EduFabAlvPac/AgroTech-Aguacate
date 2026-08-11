/**
 * Backfill: Comprador.fincaId — mismo patrón que backfill-organizaciones.ts
 * (Fase 0). Compradores se creó originalmente scoped solo por userId
 * (mono-tenant); esto lo alinea con el resto del modelo multi-finca para que
 * la matriz de RBAC en authz.ts (ya define permisos para "comprador") pueda
 * aplicarse de verdad. Ver CLAUDE.md §2.4 y prisma/schema.prisma (Comprador).
 *
 * Idempotente: solo toca compradores con fincaId null.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const compradoresSinFinca = await db.comprador.findMany({
    where: { fincaId: null },
    select: { id: true, userId: true, nombre: true },
  });

  console.log(`Compradores sin fincaId: ${compradoresSinFinca.length}`);

  let actualizados = 0;
  let sinFincaDelUsuario = 0;

  for (const c of compradoresSinFinca) {
    const finca = await db.finca.findFirst({ where: { userId: c.userId }, select: { id: true } });
    if (!finca) {
      console.warn(`  ⚠ Comprador "${c.nombre}" (${c.id}) — su usuario no tiene finca, se omite`);
      sinFincaDelUsuario++;
      continue;
    }
    await db.comprador.update({ where: { id: c.id }, data: { fincaId: finca.id } });
    actualizados++;
  }

  console.log(`\nActualizados: ${actualizados}`);
  if (sinFincaDelUsuario > 0) console.log(`Omitidos (sin finca): ${sinFincaDelUsuario}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
