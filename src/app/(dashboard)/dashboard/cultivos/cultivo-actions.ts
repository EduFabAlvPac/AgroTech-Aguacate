"use server";

/**
 * Server Actions — Cultivo (Fase 1, ADR-006). Mismo patrón que
 * lote-actions.ts: misma autorización (requireAccess) y misma lógica que
 * ya tenían /api/cultivos y /api/cultivos/[id] — las rutas API se
 * mantienen (uso externo/futuro), esto es una segunda entrada.
 *
 * El cambio de etapa (dropdown en CultivosList) queda en un archivo aparte
 * (etapa-actions.ts) a propósito — es una mutación mucho más chica y
 * frecuente, no tiene sentido cargarla con todo el formulario completo.
 *
 * Qué revalida cada acción:
 * - crearCultivo    → revalidatePath("/dashboard/cultivos"), "/dashboard" (KPIs: plantas, próxima actividad, cosecha estimada)
 * - actualizarCultivo → revalidatePath("/dashboard/cultivos"), "/dashboard"
 * - eliminarCultivo → revalidatePath("/dashboard/cultivos"), "/dashboard"
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverVariedad } from "@/lib/fichas-tecnicas";
import type { Cultivo, EtapaCultivo, EstadoCultivo } from "@prisma/client";

const cultivoInclude = {
  lote: { include: { finca: true } },
  registros: { orderBy: { fecha: "desc" as const }, take: 5 },
  _count: { select: { registros: true, gastos: true } },
};

export interface CultivoActionState {
  error?: string;
  cultivo?: Cultivo;
}

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function crearCultivo(_prev: CultivoActionState, formData: FormData): Promise<CultivoActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const loteId = str(formData, "loteId");
  const variedadIdInput = str(formData, "variedadId");

  let especieFinal = str(formData, "especie");
  let variedadFinal = str(formData, "variedad");
  let especieIdFinal: string | undefined;
  let variedadIdFinal: string | undefined;
  let fichaTecnicaIdFinal: string | undefined;

  if (variedadIdInput) {
    const resuelto = await resolverVariedad(variedadIdInput);
    if (!resuelto) return { error: "Variedad no encontrada en el catálogo" };
    especieFinal = resuelto.especie;
    variedadFinal = resuelto.variedad;
    especieIdFinal = resuelto.especieId;
    variedadIdFinal = resuelto.variedadId;
    fichaTecnicaIdFinal = resuelto.fichaTecnicaId ?? undefined;
  }

  if (!loteId || !especieFinal) return { error: "loteId y especie son requeridos" };

  try {
    const lote = await db.lote.findUnique({ where: { id: loteId }, select: { id: true, fincaId: true } });
    if (!lote) return { error: "Lote no encontrado" };
    await requireAccess(session, "cultivo", "create", { fincaId: lote.fincaId });

    const existingActive = await db.cultivo.findFirst({ where: { loteId, estado: "ACTIVO" } });
    if (existingActive) return { error: "Este lote ya tiene un cultivo activo" };

    const fechaSiembra = str(formData, "fechaSiembra");
    const cantidadPlantas = str(formData, "cantidadPlantas");
    const densidadHa = str(formData, "densidadHa");

    const cultivo = await db.cultivo.create({
      data: {
        loteId,
        especie: especieFinal,
        variedad: variedadFinal,
        especieId: especieIdFinal,
        variedadId: variedadIdFinal,
        fichaTecnicaId: fichaTecnicaIdFinal,
        fechaSiembra: fechaSiembra ? new Date(fechaSiembra) : undefined,
        cantidadPlantas: cantidadPlantas ? Number(cantidadPlantas) : undefined,
        densidadHa: densidadHa ? Number(densidadHa) : undefined,
        etapa: (str(formData, "etapa") as EtapaCultivo) ?? "PREPARACION",
        estado: (str(formData, "estado") as EstadoCultivo) ?? "ACTIVO",
        notas: str(formData, "notas"),
        portainjerto: str(formData, "portainjerto"),
        proveedorMaterial: str(formData, "proveedorMaterial"),
        sistemaSiembra: str(formData, "sistemaSiembra"),
        distanciaSiembra: str(formData, "distanciaSiembra"),
        observaciones: str(formData, "observaciones"),
      },
      include: cultivoInclude,
    });

    revalidatePath("/dashboard/cultivos");
    revalidatePath("/dashboard");
    return { cultivo };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearCultivo]", error);
    return { error: "Error interno" };
  }
}

export async function actualizarCultivo(
  cultivoId: string,
  _prev: CultivoActionState,
  formData: FormData
): Promise<CultivoActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await db.cultivo.findUnique({
      where: { id: cultivoId },
      include: { lote: { select: { fincaId: true } } },
    });
    if (!existente) return { error: "No encontrado" };
    await requireAccess(session, "cultivo", "update", { fincaId: existente.lote.fincaId });

    const data: Record<string, unknown> = {};
    const variedadIdInput = formData.get("variedadId");
    if (variedadIdInput !== null) {
      if (variedadIdInput === "") {
        data.variedadId = null;
        data.fichaTecnicaId = null;
      } else {
        const resuelto = await resolverVariedad(variedadIdInput as string);
        if (!resuelto) return { error: "Variedad no encontrada en el catálogo" };
        data.especie = resuelto.especie;
        data.variedad = resuelto.variedad;
        data.especieId = resuelto.especieId;
        data.variedadId = resuelto.variedadId;
        data.fichaTecnicaId = resuelto.fichaTecnicaId;
      }
    } else {
      if (formData.has("especie")) data.especie = str(formData, "especie");
      if (formData.has("variedad")) data.variedad = str(formData, "variedad") ?? null;
    }
    if (formData.has("fechaSiembra")) {
      const f = str(formData, "fechaSiembra");
      data.fechaSiembra = f ? new Date(f) : null;
    }
    if (formData.has("cantidadPlantas")) {
      const c = str(formData, "cantidadPlantas");
      data.cantidadPlantas = c ? Number(c) : null;
    }
    if (formData.has("densidadHa")) {
      const d = str(formData, "densidadHa");
      data.densidadHa = d ? Number(d) : null;
    }
    if (formData.has("etapa")) data.etapa = str(formData, "etapa");
    if (formData.has("estado")) data.estado = str(formData, "estado");
    if (formData.has("notas")) data.notas = str(formData, "notas") ?? null;
    if (formData.has("portainjerto")) data.portainjerto = str(formData, "portainjerto") ?? null;
    if (formData.has("proveedorMaterial")) data.proveedorMaterial = str(formData, "proveedorMaterial") ?? null;
    if (formData.has("sistemaSiembra")) data.sistemaSiembra = str(formData, "sistemaSiembra") ?? null;
    if (formData.has("distanciaSiembra")) data.distanciaSiembra = str(formData, "distanciaSiembra") ?? null;
    if (formData.has("observaciones")) data.observaciones = str(formData, "observaciones") ?? null;

    const cultivo = await db.cultivo.update({
      where: { id: cultivoId },
      data,
      include: cultivoInclude,
    });

    revalidatePath("/dashboard/cultivos");
    revalidatePath("/dashboard");
    return { cultivo };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[actualizarCultivo]", error);
    return { error: "Error interno" };
  }
}

export interface EliminarCultivoState {
  error?: string;
  ok?: boolean;
}

export async function eliminarCultivo(cultivoId: string, _prev: EliminarCultivoState): Promise<EliminarCultivoState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await db.cultivo.findUnique({
      where: { id: cultivoId },
      include: { lote: { select: { fincaId: true } } },
    });
    if (!existente) return { error: "No encontrado" };
    await requireAccess(session, "cultivo", "delete", { fincaId: existente.lote.fincaId });

    await db.cultivo.delete({ where: { id: cultivoId } });
    revalidatePath("/dashboard/cultivos");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarCultivo]", error);
    return { error: "Error interno" };
  }
}
