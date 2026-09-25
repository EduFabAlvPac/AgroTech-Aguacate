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
import { nuevoFinTrial, estadoEfectivoOrg } from "@/lib/plan";
import { organizacionSchema } from "@/lib/validations";
import { normalizarNit } from "@/lib/organizacion-colectivo";
import { revocarSesionesDeUsuario } from "@/lib/sesiones";
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

// ─── Administración completa (consultar, editar, suspender, eliminar) ────────

const vacioANull = (v: string | undefined) => (v === undefined || v.trim() === "" ? null : v.trim());

async function auditar(session: { user: { id: string; email?: string | null } } | null, accion: string, organizacionId: string, detalle: Record<string, unknown>) {
  await registrarAuditoria({
    actorId: session!.user.id, actorEmail: session!.user.email, accion, detalle,
    organizacionId, recurso: "Organizacion", recursoId: organizacionId,
  });
}

/** Corrige los datos identitarios/de contacto. `tipo` y `plan` no se editan
 * acá: cambiar el tipo altera roles y límites (el plan tiene sus propias
 * acciones: activar plan / extender prueba). */
export async function editarOrganizacionAdmin(organizacionId: string, datos: unknown): Promise<OrgAdminActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    const parsed = organizacionSchema.safeParse(datos);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    const { nombre, nit, ciudad, departamento, emailContacto, celularContacto } = parsed.data;

    const org = await db.organizacion.findUnique({ where: { id: organizacionId }, select: { id: true } });
    if (!org) return { error: "Organización no encontrada" };

    const nitNorm = nit && nit.trim() ? normalizarNit(nit) : null;
    if (nitNorm) {
      const otra = await db.organizacion.findFirst({ where: { nit: nitNorm, id: { not: organizacionId } }, select: { nombre: true } });
      if (otra) return { error: `Ese NIT ya está registrado por «${otra.nombre}»` };
    }

    await db.organizacion.update({
      where: { id: organizacionId },
      data: {
        nombre: nombre.trim(), nit: nitNorm, ciudad: vacioANull(ciudad), departamento: vacioANull(departamento),
        emailContacto: vacioANull(emailContacto), celularContacto: vacioANull(celularContacto),
      },
    });
    await auditar(session, "organizacion.editar_admin", organizacionId, { nombre: nombre.trim(), nit: nitNorm });
    revalidatePath("/dashboard/admin/organizaciones");
    revalidatePath(`/dashboard/admin/organizaciones/${organizacionId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[editarOrganizacionAdmin]", error);
    return { error: "No se pudo guardar. Revisa los datos e intenta de nuevo." };
  }
}

/** Suspende (inactiva): la organización queda en modo lectura para todos sus
 * miembros — pueden ver todo, no agregar ni editar. Reversible. */
export async function suspenderOrganizacion(organizacionId: string, motivo: string): Promise<OrgAdminActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    const motivoLimpio = (motivo ?? "").trim();
    if (motivoLimpio.length < 3) return { error: "Escribe el motivo de la suspensión (mínimo 3 caracteres)" };

    const org = await db.organizacion.findUnique({ where: { id: organizacionId }, select: { configuracion: true, eliminadoEn: true, membresias: { where: { user: { esSuperAdmin: true } }, select: { id: true } } } });
    if (!org || org.eliminadoEn) return { error: "Organización no encontrada" };
    if (org.membresias.length > 0) return { error: "No puedes suspender tu propia organización de Super Admin" };

    const cfg = (org.configuracion && typeof org.configuracion === "object" ? org.configuracion : {}) as Record<string, unknown>;
    await db.organizacion.update({
      where: { id: organizacionId },
      data: {
        estadoPlan: "SUSPENDIDA_PAGO",
        configuracion: { ...cfg, suspension: { motivo: motivoLimpio, en: new Date().toISOString() } } as Prisma.InputJsonValue,
      },
    });
    await auditar(session, "organizacion.suspender", organizacionId, { motivo: motivoLimpio });
    revalidatePath("/dashboard/admin/organizaciones");
    revalidatePath(`/dashboard/admin/organizaciones/${organizacionId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[suspenderOrganizacion]", error);
    return { error: "No se pudo suspender la organización" };
  }
}

export async function reactivarOrganizacion(organizacionId: string): Promise<OrgAdminActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    const org = await db.organizacion.findUnique({
      where: { id: organizacionId },
      select: { esTrial: true, trialFinEn: true, estadoPlan: true, trialMaxAsociados: true, limiteAsociadosPlan: true, configuracion: true, eliminadoEn: true },
    });
    if (!org || org.eliminadoEn) return { error: "Organización no encontrada" };

    // Una prueba VENCIDA no se "reactiva": hay que extenderla o activar el plan.
    if (org.esTrial && org.trialFinEn && org.trialFinEn.getTime() < Date.now()) {
      return { error: "Su prueba ya venció: usa «Extender prueba» o «Activar plan Colectivo» para devolverle la escritura." };
    }
    const cfg = (org.configuracion && typeof org.configuracion === "object" ? org.configuracion : {}) as Record<string, unknown>;
    const { suspension: _quitada, ...resto } = cfg;
    await db.organizacion.update({
      where: { id: organizacionId },
      data: { estadoPlan: org.esTrial ? "EN_TRIAL" : "ACTIVA", configuracion: resto as Prisma.InputJsonValue },
    });
    await auditar(session, "organizacion.reactivar", organizacionId, {});
    revalidatePath("/dashboard/admin/organizaciones");
    revalidatePath(`/dashboard/admin/organizaciones/${organizacionId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[reactivarOrganizacion]", error);
    return { error: "No se pudo reactivar la organización" };
  }
}

/** Eliminación LÓGICA (no borra filas): la organización desaparece para sus
 * miembros y para el resto de la app, y se puede restaurar. Exige escribir el
 * nombre exacto. Nunca la organización de un Super Admin. */
export async function eliminarOrganizacion(organizacionId: string, nombreConfirmacion: string): Promise<OrgAdminActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    const org = await db.organizacion.findUnique({
      where: { id: organizacionId },
      select: { nombre: true, eliminadoEn: true, membresias: { select: { userId: true, user: { select: { esSuperAdmin: true } } } } },
    });
    if (!org) return { error: "Organización no encontrada" };
    if (org.eliminadoEn) return { error: "Esa organización ya está eliminada" };
    if (org.membresias.some((m) => m.user.esSuperAdmin)) return { error: "No puedes eliminar una organización a la que pertenece un Super Admin" };
    if ((nombreConfirmacion ?? "").trim() !== org.nombre.trim()) return { error: "El nombre no coincide: escríbelo exactamente para confirmar" };

    await db.organizacion.update({ where: { id: organizacionId }, data: { eliminadoEn: new Date(), activa: false } });
    // Sus miembros pierden el acceso YA (las sesiones abiertas dejan de servir en ≤ 5 min).
    for (const m of org.membresias) await revocarSesionesDeUsuario(m.userId);
    await auditar(session, "organizacion.eliminar", organizacionId, { nombre: org.nombre, miembros: org.membresias.length });
    revalidatePath("/dashboard/admin/organizaciones");
    revalidatePath(`/dashboard/admin/organizaciones/${organizacionId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarOrganizacion]", error);
    return { error: "No se pudo eliminar la organización" };
  }
}

export async function restaurarOrganizacion(organizacionId: string): Promise<OrgAdminActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    const org = await db.organizacion.findUnique({ where: { id: organizacionId }, select: { eliminadoEn: true, nombre: true } });
    if (!org) return { error: "Organización no encontrada" };
    if (!org.eliminadoEn) return { error: "Esa organización no está eliminada" };
    await db.organizacion.update({ where: { id: organizacionId }, data: { eliminadoEn: null, activa: true } });
    await auditar(session, "organizacion.restaurar", organizacionId, { nombre: org.nombre });
    revalidatePath("/dashboard/admin/organizaciones");
    revalidatePath(`/dashboard/admin/organizaciones/${organizacionId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[restaurarOrganizacion]", error);
    return { error: "No se pudo restaurar la organización" };
  }
}
