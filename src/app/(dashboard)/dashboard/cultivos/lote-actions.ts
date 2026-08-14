"use server";

/**
 * Server Actions — Lote (Fase 1, ADR-006). Reemplaza el fetch manual que
 * antes hacía LoteForm.tsx contra /api/lotes y /api/lotes/[id] — misma
 * validación (loteFormSchema/loteUpdateWithGeoSchema) y misma autorización
 * (requireAccess) que ya tenían esas rutas; las rutas API se mantienen (las
 * sigue usando el módulo Mapa), esto es una segunda entrada al mismo caso
 * de uso, no un reemplazo.
 *
 * Qué revalida cada acción (para que getCultivos/getDashboardKpis nunca
 * sirvan datos viejos después de mutar):
 * - crearLote      → revalidatePath("/dashboard/cultivos"), "/dashboard" (hectáreas activas en KPIs)
 * - actualizarLote → revalidatePath("/dashboard/cultivos"), "/dashboard"
 * - eliminarLote   → revalidatePath("/dashboard/cultivos"), "/dashboard"
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { loteFormSchema, loteUpdateWithGeoSchema } from "@/lib/validations";
import type { Lote } from "@prisma/client";

// Nota: un archivo "use server" solo puede exportar funciones async — el
// estado inicial de useActionState (`{}`) se define en el componente
// cliente que lo consume, no aquí.
export interface LoteActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  lote?: Lote;
}

function parseNumOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function fieldErrorsFromZod(issues: { path: (string | number)[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0] as string;
    if (field && !out[field]) out[field] = issue.message;
  }
  return out;
}

export async function crearLote(_prev: LoteActionState, formData: FormData): Promise<LoteActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  let fincaId = (formData.get("fincaId") as string) || undefined;
  if (!fincaId) {
    const { fincaActivaId } = await resolverFincaActiva(session);
    if (!fincaActivaId) return { error: "Finca no encontrada. Configura tu finca primero." };
    fincaId = fincaActivaId;
  }

  const parsed = loteFormSchema.safeParse({
    nombre: formData.get("nombre"),
    areaHa: parseNumOrNull(formData.get("areaHa")) ?? undefined,
    altitud: parseNumOrNull(formData.get("altitud")),
    pendiente: parseNumOrNull(formData.get("pendiente")),
    notas: (formData.get("notas") as string) || null,
    fincaId,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  try {
    await requireAccess(session, "lote", "create", { fincaId });
    const lote = await db.lote.create({
      data: {
        nombre: parsed.data.nombre,
        areaHa: parsed.data.areaHa,
        altitud: parsed.data.altitud ?? undefined,
        pendiente: parsed.data.pendiente ?? undefined,
        notas: parsed.data.notas ?? undefined,
        finca: { connect: { id: fincaId } },
      },
    });
    revalidatePath("/dashboard/cultivos");
    revalidatePath("/dashboard");
    return { lote };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearLote]", error);
    return { error: "Error interno" };
  }
}

export async function actualizarLote(
  loteId: string,
  _prev: LoteActionState,
  formData: FormData
): Promise<LoteActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const parsed = loteUpdateWithGeoSchema.safeParse({
    nombre: formData.get("nombre") || undefined,
    areaHa: parseNumOrNull(formData.get("areaHa")) ?? undefined,
    altitud: parseNumOrNull(formData.get("altitud")),
    pendiente: parseNumOrNull(formData.get("pendiente")),
    notas: (formData.get("notas") as string) || null,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  try {
    const existente = await db.lote.findUnique({ where: { id: loteId }, select: { id: true, fincaId: true } });
    if (!existente) return { error: "Lote no encontrado" };
    await requireAccess(session, "lote", "update", { fincaId: existente.fincaId });

    const { nombre, areaHa, altitud, pendiente, notas } = parsed.data;
    const lote = await db.lote.update({
      where: { id: loteId },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(areaHa !== undefined && { areaHa }),
        ...(altitud !== undefined && { altitud }),
        ...(pendiente !== undefined && { pendiente }),
        ...(notas !== undefined && { notas }),
      },
    });
    revalidatePath("/dashboard/cultivos");
    revalidatePath("/dashboard");
    return { lote };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[actualizarLote]", error);
    return { error: "Error interno" };
  }
}

export interface EliminarLoteState {
  error?: string;
  ok?: boolean;
}

export async function eliminarLote(loteId: string, _prev: EliminarLoteState): Promise<EliminarLoteState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await db.lote.findUnique({ where: { id: loteId }, select: { id: true, fincaId: true } });
    if (!existente) return { error: "Lote no encontrado" };
    await requireAccess(session, "lote", "delete", { fincaId: existente.fincaId });

    const activeCultivos = await db.cultivo.count({ where: { loteId, estado: "ACTIVO" } });
    if (activeCultivos > 0) {
      return { error: "Existen cultivos activos en este lote. Finaliza o pausa los cultivos antes de eliminar." };
    }

    await db.lote.delete({ where: { id: loteId } });
    revalidatePath("/dashboard/cultivos");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarLote]", error);
    return { error: "Error interno" };
  }
}
