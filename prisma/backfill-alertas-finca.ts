/**
 * Backfill de aislamiento para AlertaClimatica — ver CLAUDE.md §7 y
 * docs/REQUERIMIENTOS.md §3.1. Antes de este cambio el modelo no tenía dueño
 * (ni userId, ni fincaId) y GET /api/alertas devolvía TODAS las alertas de la
 * base de datos a cualquier usuario autenticado.
 *
 * Las alertas existentes (fincaId=null) no tienen forma confiable de
 * atribuirse a un usuario específico — el histórico nunca guardó esa
 * relación. Este script solo puede backfillear con seguridad cuando hay
 * EXACTAMENTE UNA finca en todo el sistema (caso real hoy: el piloto). Si
 * en el futuro hay más de una finca, las alertas huérfanas se dejan sin
 * asignar a propósito — mejor invisibles para todos que visibles para
 * cualquiera (el riesgo de seguridad va en esa dirección, no al revés).
 *
 * Uso: npx tsx prisma/backfill-alertas-finca.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔒 Backfill de aislamiento — AlertaClimatica.fincaId");

  const huerfanas = await prisma.alertaClimatica.count({ where: { fincaId: null } });
  if (huerfanas === 0) {
    console.log("✅ No hay alertas huérfanas. Nada que hacer.");
    return;
  }

  const fincas = await prisma.finca.findMany({ select: { id: true, nombre: true } });

  if (fincas.length !== 1) {
    console.warn(
      `⚠️  Hay ${fincas.length} finca(s) en el sistema — no se puede backfillear con seguridad ` +
        `a qué finca pertenece cada una de las ${huerfanas} alerta(s) huérfana(s). Se dejan sin asignar ` +
        `(quedan invisibles bajo el nuevo scoping, en vez de arriesgar asignarlas a la finca equivocada).`
    );
    return;
  }

  const finca = fincas[0];
  const { count } = await prisma.alertaClimatica.updateMany({
    where: { fincaId: null },
    data: { fincaId: finca.id },
  });

  console.log(`✅ ${count} alerta(s) huérfana(s) asignada(s) a "${finca.nombre}" (única finca del sistema).`);
}

main()
  .catch((error) => {
    console.error("❌ Error en el backfill:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
