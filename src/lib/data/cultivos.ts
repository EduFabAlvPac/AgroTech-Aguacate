/**
 * Capa de datos de Cultivos — Fase 1 (ADR-006). Lectura primero; las
 * mutaciones (crear/editar/eliminar Lote/Cultivo/Registro, cambiar Etapa)
 * se extraen aparte como Server Actions, un commit por entidad — ver
 * src/app/(dashboard)/dashboard/cultivos/actions.ts.
 */
import { db } from "@/lib/db";
import type { Finca, Lote, Cultivo, RegistroCultivo } from "@prisma/client";

export type CultivoConDatos = Cultivo & {
  registros: RegistroCultivo[];
  _count: { registros: number; gastos: number };
};
export type LoteConCultivos = Lote & { cultivos: CultivoConDatos[] };
export type FincaConLotes = (Finca & { lotes: LoteConCultivos[] }) | null;

/**
 * Lotes + cultivos (con últimos 3 registros y conteos) de la finca activa.
 * Misma query que antes vivía inline en cultivos/page.tsx.
 */
export async function getCultivos(fincaActivaId: string | null): Promise<FincaConLotes> {
  if (!fincaActivaId) return null;
  return db.finca.findUnique({
    where: { id: fincaActivaId },
    include: {
      lotes: {
        include: {
          cultivos: {
            include: {
              registros: { orderBy: { fecha: "desc" }, take: 3 },
              _count: { select: { registros: true, gastos: true } },
            },
          },
        },
      },
    },
  });
}
