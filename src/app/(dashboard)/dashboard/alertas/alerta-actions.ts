"use server";

/**
 * Server Actions — Alertas (Fase 1, ADR-006). Mismo patrón que los demás
 * módulos: misma validación/autorización que ya tenían /api/alertas/[id]
 * (PUT/DELETE) y /api/alertas/generate (POST) — las rutas API se
 * mantienen, esto es una segunda entrada.
 *
 * generarAlertas reutiliza generarAlertasParaFinca de lib/alert-engine.ts
 * — la MISMA función que usa el cron diario — y devuelve la lista
 * actualizada en una sola llamada (antes: POST /generate seguido de un GET
 * /api/alertas por separado desde el cliente).
 *
 * Qué revalida: revalidatePath("/dashboard/alertas") en las cuatro. El
 * contador de alertas activas del sidebar (badge en el menú) se lee en
 * cada navegación vía layout, así que también se revalida "/dashboard"
 * para que ese contador no quede desactualizado tras generar/descartar.
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { generarAlertasParaFinca } from "@/lib/alert-engine";
import type { AlertaClimatica } from "@prisma/client";

async function fetchAlertaConFinca(id: string) {
  return db.alertaClimatica.findUnique({ where: { id }, select: { id: true, fincaId: true } });
}

export interface AlertaActionState {
  error?: string;
  alerta?: AlertaClimatica;
}

export async function marcarLeida(alertaId: string, _prev: AlertaActionState): Promise<AlertaActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await fetchAlertaConFinca(alertaId);
    if (!existente || !existente.fincaId) return { error: "No encontrada" };
    await requireAccess(session, "alerta", "update", { fincaId: existente.fincaId });

    const alerta = await db.alertaClimatica.update({ where: { id: alertaId }, data: { leida: true } });
    revalidatePath("/dashboard/alertas");
    return { alerta };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[marcarLeida]", error);
    return { error: "Error al marcar la alerta como leída" };
  }
}

/**
 * Vence una alerta (activa=false) — usado por el auto-expirado silencioso
 * de AlertasClient cuando fechaFin < ahora. Mismo PUT que hacía el fetch
 * manual, sin cambiar el resultado visible (sigue siendo silencioso, sin
 * toast).
 */
export async function marcarVencida(alertaId: string, _prev: AlertaActionState): Promise<AlertaActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await fetchAlertaConFinca(alertaId);
    if (!existente || !existente.fincaId) return { error: "No encontrada" };
    await requireAccess(session, "alerta", "update", { fincaId: existente.fincaId });

    const alerta = await db.alertaClimatica.update({ where: { id: alertaId }, data: { activa: false } });
    revalidatePath("/dashboard/alertas");
    return { alerta };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[marcarVencida]", error);
    return { error: "Error al vencer la alerta" };
  }
}

export interface DescartarAlertaState {
  error?: string;
  ok?: boolean;
}

export async function descartarAlerta(alertaId: string, _prev: DescartarAlertaState): Promise<DescartarAlertaState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await fetchAlertaConFinca(alertaId);
    if (!existente || !existente.fincaId) return { error: "No encontrada" };
    await requireAccess(session, "alerta", "delete", { fincaId: existente.fincaId });

    await db.alertaClimatica.delete({ where: { id: alertaId } });
    revalidatePath("/dashboard/alertas");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[descartarAlerta]", error);
    return { error: "Error al descartar la alerta" };
  }
}

export interface GenerarAlertasState {
  error?: string;
  message?: string;
  alertas?: AlertaClimatica[];
}

export async function generarAlertas(): Promise<GenerarAlertasState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const { fincaActivaId } = await resolverFincaActiva(session);
    if (!fincaActivaId) return { error: "Registra una finca antes de generar alertas" };

    const finca = await db.finca.findUnique({ where: { id: fincaActivaId }, select: { id: true } });
    if (!finca) return { error: "Registra una finca antes de generar alertas" };
    await requireAccess(session, "alerta", "create", { fincaId: finca.id });

    const resultado = await generarAlertasParaFinca(finca.id);
    const alertas = await db.alertaClimatica.findMany({
      where: { fincaId: finca.id },
      orderBy: [{ activa: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    revalidatePath("/dashboard/alertas");
    revalidatePath("/dashboard");
    return {
      message: `Generación completada: ${resultado.created} alertas creadas, ${resultado.skipped} omitidas (duplicadas)`,
      alertas,
    };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[generarAlertas]", error);
    return { error: "Error al generar alertas" };
  }
}
