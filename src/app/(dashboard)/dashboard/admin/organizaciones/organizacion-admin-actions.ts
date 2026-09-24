"use server";

/**
 * Server Actions — panel Super Admin de organizaciones (Colectivo/Cooperativa,
 * PR C). Conversión a pago MANUAL: no hay pasarela ni precios oficiales (el
 * ADR-012 no existe todavía), así que el Super Admin activa el plan o extiende
 * la prueba a mano. Solo Super Admin (`requireSuperAdmin`, chequeo fresco
 * contra BD). Cada acción se audita en la cadena de la organización afectada.
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import { registrarAuditoria } from "@/lib/audit";
import { nuevoFinTrial } from "@/lib/plan";
import type { Prisma } from "@prisma/client";

export interface OrgAdminActionState {
  error?: string;
  ok?: boolean;
}

const MAX_DIAS_EXTENSION = 90;

export async function extenderTrial(organizacionId: string, dias: number): Promise<OrgAdminActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    if (!Number.isInteger(dias) || dias < 1 || dias > MAX_DIAS_EXTENSION) {
      return { error: `Ingresa entre 1 y ${MAX_DIAS_EXTENSION} días` };
    }

    const org = await db.organizacion.findUnique({
      where: { id: organizacionId },
      select: { esTrial: true, trialFinEn: true, configuracion: true, eliminadoEn: true },
    });
    if (!org || org.eliminadoEn) return { error: "Organización no encontrada" };
    if (!org.esTrial) return { error: "Esta organización ya no está en prueba (tiene plan activo)" };

    const nuevoFin = nuevoFinTrial(org.trialFinEn, dias);
    // Los avisos por correo (7/3/1/0) vuelven a empezar para el nuevo plazo.
    const cfg = (org.configuracion && typeof org.configuracion === "object" ? org.configuracion : {}) as Record<string, unknown>;
    await db.organizacion.update({
      where: { id: organizacionId },
      data: {
        trialFinEn: nuevoFin,
        estadoPlan: "EN_TRIAL",
        configuracion: { ...cfg, trialAvisos: [] } as Prisma.InputJsonValue,
      },
    });

    await registrarAuditoria({
      actorId: session!.user.id,
      actorEmail: session!.user.email,
      accion: "organizacion.extender_trial",
      detalle: { dias, trialFinEn: nuevoFin.toISOString() },
      organizacionId,
      recurso: "Organizacion",
      recursoId: organizacionId,
    });

    revalidatePath("/dashboard/admin/organizaciones");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[extenderTrial]", error);
    return { error: "Error interno" };
  }
}

/** `limiteAsociados` null = sin límite. `vigenteHasta` ISO `YYYY-MM-DD` o vacío. */
export async function activarPlanColectivo(
  organizacionId: string,
  limiteAsociados: number | null,
  vigenteHasta: string | null
): Promise<OrgAdminActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    if (limiteAsociados !== null && (!Number.isInteger(limiteAsociados) || limiteAsociados < 1 || limiteAsociados > 100_000)) {
      return { error: "El límite de asociados debe ser un número entero positivo (o vacío para ilimitado)" };
    }
    let hasta: Date | null = null;
    if (vigenteHasta) {
      hasta = new Date(`${vigenteHasta}T23:59:59`);
      if (Number.isNaN(hasta.getTime())) return { error: "Fecha de vigencia inválida" };
      if (hasta.getTime() < Date.now()) return { error: "La vigencia debe ser una fecha futura" };
    }

    const org = await db.organizacion.findUnique({ where: { id: organizacionId }, select: { id: true, eliminadoEn: true, planIniciadoEn: true } });
    if (!org || org.eliminadoEn) return { error: "Organización no encontrada" };

    await db.organizacion.update({
      where: { id: organizacionId },
      data: {
        plan: "COLECTIVO",
        esTrial: false,
        estadoPlan: "ACTIVA",
        limiteAsociadosPlan: limiteAsociados,
        planVigenteHasta: hasta,
        planIniciadoEn: org.planIniciadoEn ?? new Date(),
      },
    });

    await registrarAuditoria({
      actorId: session!.user.id,
      actorEmail: session!.user.email,
      accion: "organizacion.activar_plan",
      detalle: { plan: "COLECTIVO", limiteAsociados, vigenteHasta: hasta?.toISOString() ?? null },
      organizacionId,
      recurso: "Organizacion",
      recursoId: organizacionId,
    });

    revalidatePath("/dashboard/admin/organizaciones");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[activarPlanColectivo]", error);
    return { error: "Error interno" };
  }
}
