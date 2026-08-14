"use server";

/**
 * Server Actions — Lote (Fase 1, ADR-006). Reemplaza el fetch manual que
 * antes hacía LoteForm.tsx (Cultivos) Y LeafletMap.tsx/MapaContainer.tsx
 * (Mapa) contra /api/lotes y /api/lotes/[id] — misma validación
 * (loteCreateWithGeoSchema/loteUpdateWithGeoSchema) y misma autorización
 * (requireAccess) que ya tenían esas rutas; las rutas API se mantienen (uso
 * externo/futuro), esto es una segunda entrada al mismo caso de uso.
 *
 * El módulo Mapa dibuja el polígono con Leaflet y guarda geoJson/lat/lng
 * junto con nombre/área — por eso crearLote/actualizarLote aceptan esos
 * campos como opcionales (LoteForm.tsx de Cultivos simplemente no los
 * manda, igual que antes).
 *
 * Qué revalida cada acción (para que getCultivos/getMapaFinca/
 * getDashboardKpis nunca sirvan datos viejos después de mutar):
 * - crearLote      → revalidatePath("/dashboard/cultivos"), "/dashboard/mapa", "/dashboard" (hectáreas activas en KPIs)
 * - actualizarLote → revalidatePath("/dashboard/cultivos"), "/dashboard/mapa", "/dashboard"
 * - eliminarLote   → revalidatePath("/dashboard/cultivos"), "/dashboard/mapa", "/dashboard"
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { loteCreateWithGeoSchema, loteUpdateWithGeoSchema, geoJsonPolygonSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import type { Lote } from "@prisma/client";

function parseGeoJson(fd: FormData): { present: boolean; value?: Prisma.InputJsonValue | null; error?: string } {
  if (!fd.has("geoJson")) return { present: false };
  const raw = fd.get("geoJson");
  if (raw === "" || raw === null) return { present: true, value: null };
  try {
    const parsed = JSON.parse(raw as string);
    const result = geoJsonPolygonSchema.safeParse(parsed);
    if (!result.success) return { present: true, error: `GeoJSON inválido: ${result.error.errors[0]?.message ?? "formato incorrecto"}` };
    return { present: true, value: parsed };
  } catch {
    return { present: true, error: "GeoJSON inválido: no es JSON válido" };
  }
}

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

  const geo = parseGeoJson(formData);
  if (geo.error) return { error: geo.error };

  const parsed = loteCreateWithGeoSchema.safeParse({
    nombre: formData.get("nombre"),
    areaHa: parseNumOrNull(formData.get("areaHa")) ?? undefined,
    altitud: parseNumOrNull(formData.get("altitud")),
    pendiente: parseNumOrNull(formData.get("pendiente")),
    notas: (formData.get("notas") as string) || null,
    fincaId,
    lat: parseNumOrNull(formData.get("lat")),
    lng: parseNumOrNull(formData.get("lng")),
    geoJson: geo.present ? geo.value : undefined,
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
        lat: parsed.data.lat ?? undefined,
        lng: parsed.data.lng ?? undefined,
        finca: { connect: { id: fincaId } },
        ...(geo.present ? { geoJson: parsed.data.geoJson as Prisma.InputJsonValue } : {}),
      },
    });
    revalidatePath("/dashboard/cultivos");
    revalidatePath("/dashboard/mapa");
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

  const geo = parseGeoJson(formData);
  if (geo.error) return { error: geo.error };

  const parsed = loteUpdateWithGeoSchema.safeParse({
    nombre: formData.get("nombre") || undefined,
    areaHa: parseNumOrNull(formData.get("areaHa")) ?? undefined,
    altitud: parseNumOrNull(formData.get("altitud")),
    pendiente: parseNumOrNull(formData.get("pendiente")),
    notas: (formData.get("notas") as string) || null,
    geoJson: geo.present ? geo.value : undefined,
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
        // geoJson: solo se toca si vino explícitamente en el FormData —
        // igual que /api/lotes/[id] PUT, null lo borra, presente lo
        // reemplaza, ausente lo deja intacto. Prisma exige Prisma.JsonNull
        // (no un `null` plano) para vaciar un campo Json en un update.
        ...(geo.present ? { geoJson: geo.value === null ? Prisma.JsonNull : (geo.value as Prisma.InputJsonValue) } : {}),
      },
    });
    revalidatePath("/dashboard/cultivos");
    revalidatePath("/dashboard/mapa");
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
    revalidatePath("/dashboard/mapa");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarLote]", error);
    return { error: "Error interno" };
  }
}
