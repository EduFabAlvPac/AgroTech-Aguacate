/**
 * Capa de datos de Mapa — Fase 1 (ADR-006). Reemplaza la query Prisma que
 * vivía inline en mapa/page.tsx.
 */
import { db } from "@/lib/db";
import type { Finca, Lote, Cultivo, AnalisisSuelo } from "@prisma/client";

export type LoteConCultivoYSuelo = Lote & {
  cultivos: Partial<Cultivo>[];
  _count: { cultivos: number };
  analisisSuelo: AnalisisSuelo[];
};
export type FincaConLotesMapa = (Finca & { lotes: LoteConCultivoYSuelo[] }) | null;

/**
 * Finca activa con sus lotes (geoJson, cultivo activo resumido, conteo de
 * cultivos y análisis de suelo) — todo lo que necesita MapaContainer.
 */
export async function getMapaFinca(fincaActivaId: string | null): Promise<FincaConLotesMapa> {
  if (!fincaActivaId) return null;
  return db.finca.findUnique({
    where: { id: fincaActivaId },
    include: {
      lotes: {
        include: {
          cultivos: {
            select: { id: true, etapa: true, variedad: true, cantidadPlantas: true, fechaSiembra: true, estado: true },
            take: 1,
          },
          _count: {
            select: { cultivos: true },
          },
          analisisSuelo: { orderBy: { fechaMuestreo: "desc" } },
        },
      },
    },
  }) as Promise<FincaConLotesMapa>;
}
