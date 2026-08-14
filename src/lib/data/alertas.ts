/**
 * Capa de datos de Alertas — Fase 1 (ADR-006). Reemplaza la query Prisma
 * que vivía inline en alertas/page.tsx.
 */
import { db } from "@/lib/db";
import type { AlertaClimatica } from "@prisma/client";

/** Últimas 50 alertas de la finca activa, activas primero, más recientes primero. */
export async function getAlertas(fincaActivaId: string | null, sinFincaSentinel: string): Promise<AlertaClimatica[]> {
  return db.alertaClimatica.findMany({
    where: { fincaId: fincaActivaId ?? sinFincaSentinel },
    orderBy: [{ activa: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
}
