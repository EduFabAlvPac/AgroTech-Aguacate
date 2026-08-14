/**
 * Capa de datos de Compradores — Fase 1 (ADR-006). Reemplaza las 2 queries
 * que vivían inline en compradores/page.tsx.
 */
import { db } from "@/lib/db";
import type { Comprador } from "@prisma/client";

export type CompradorConVentas = Comprador & { _count: { ingresos: number } };

export interface CompradoresResumen {
  compradores: CompradorConVentas[];
  especiesDisponibles: string[];
}

export async function getCompradoresResumen(fincaActivaId: string | null, sinFincaSentinel: string): Promise<CompradoresResumen> {
  const fincaId = fincaActivaId ?? sinFincaSentinel;

  const [compradores, cultivosDeLaFinca] = await Promise.all([
    db.comprador.findMany({
      where: { fincaId },
      include: { _count: { select: { ingresos: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.cultivo.findMany({
      where: { lote: { fincaId } },
      select: { especie: true },
      distinct: ["especie"],
    }),
  ]);

  // Especies disponibles para el filtro/formulario: las que ya tiene
  // sembradas la finca, más los 3 cultivos priorizados de CLAUDE.md §1
  // (Aguacate/Café/Cacao) aunque aún no se hayan sembrado — un comprador
  // puede interesarse en un cultivo antes de que el productor lo siembre.
  const especiesDisponibles = [...new Set([...cultivosDeLaFinca.map((c) => c.especie), "Aguacate", "Café", "Cacao"])];

  return { compradores, especiesDisponibles };
}
