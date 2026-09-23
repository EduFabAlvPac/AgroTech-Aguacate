/**
 * Capa de datos de Auditoría (ADR-011 Sprint 5) — pestaña "Auditoría" de
 * Equipo. El chequeo de "es OWNER de su organización" se queda en la page
 * (implica un redirect(), es un concern de la ruta, no de lectura de
 * datos) — mismo criterio que src/lib/data/equipo.ts.
 */
import { db } from "@/lib/db";

export interface AuditoriaEvento {
  id: string;
  createdAt: Date;
  actorEmail: string | null;
  accion: string;
  detalle: unknown;
  resultado: string;
}

const LIMITE_PANTALLA = 100;

/** Últimos eventos de la organización, más recientes primero — acotado a
 * `LIMITE_PANTALLA` para la pestaña (no es un reporte, es una vista rápida;
 * el CSV de exportarAuditoriaCSV() no tiene ese límite). */
export async function getAuditoriaOrganizacion(organizacionId: string): Promise<AuditoriaEvento[]> {
  return db.auditLog.findMany({
    where: { organizacionId },
    orderBy: { createdAt: "desc" },
    take: LIMITE_PANTALLA,
    select: { id: true, createdAt: true, actorEmail: true, accion: true, detalle: true, resultado: true },
  });
}
