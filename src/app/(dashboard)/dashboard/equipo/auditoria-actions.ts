"use server";

/**
 * Server Action — exportar CSV de Auditoría (ADR-011 Sprint 5). Entregable
 * literal del ADR: "ORG_OWNER descarga CSV de accesos últimos 30 días".
 * Mismo patrón que exportarMisDatos() (config-actions.ts): una Server Action
 * no puede mandar Content-Disposition, así que arma el CSV como string y el
 * cliente arma el Blob y dispara la descarga.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { membresiaOwner } from "@/lib/equipo";
import { filasACSV } from "@/lib/auditoria-csv";

export interface ExportarAuditoriaState {
  error?: string;
  csv?: string;
  filename?: string;
}

export async function exportarAuditoriaCSV(): Promise<ExportarAuditoriaState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede exportar la auditoría" };

  try {
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);

    const filas = await db.auditLog.findMany({
      where: { organizacionId: propia.organizacionId, createdAt: { gte: desde } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, actorEmail: true, accion: true, resultado: true, detalle: true },
    });

    return {
      csv: filasACSV(filas),
      filename: `germia-auditoria-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  } catch (error) {
    console.error("[exportarAuditoriaCSV]", error);
    return { error: "Error interno" };
  }
}
