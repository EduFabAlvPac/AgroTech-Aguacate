/**
 * Log de auditoría — acciones sensibles (eliminar/exportar cuenta, cambios de
 * equipo, bloqueos de login). Ver prisma/schema.prisma (AuditLog) y CLAUDE.md
 * §7 (OWASP, Ley 1581).
 */
import { db } from "./db";

export async function registrarAuditoria(params: {
  actorId?: string | null;
  actorEmail?: string | null;
  accion: string;
  detalle?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorEmail: params.actorEmail ?? null,
        accion: params.accion,
        detalle: params.detalle as any,
      },
    });
  } catch (error) {
    // Nunca debe tumbar la acción principal (eliminar cuenta, invitar
    // colaborador...) por un fallo al escribir el log — se reporta y sigue.
    console.error("[registrarAuditoria]", error);
  }
}
