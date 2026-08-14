"use server";

/**
 * Server Actions — Comprador (Fase 1, ADR-006). Misma validación
 * (compradorFormSchema) y misma autorización (requireAccess) que ya tenían
 * /api/compradores y /api/compradores/[id] — las rutas API se mantienen,
 * esto es una segunda entrada.
 *
 * Qué revalida: revalidatePath("/dashboard/compradores") en las tres. No
 * se revalida "/dashboard" — a diferencia de Gasto/Ingreso, un comprador
 * no alimenta ningún resumen del Dashboard hoy.
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { compradorFormSchema } from "@/lib/validations";
import type { Comprador, TipoComprador } from "@prisma/client";

export interface CompradorActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  comprador?: Comprador;
}

function fieldErrorsFromZod(issues: { path: (string | number)[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0] as string;
    if (field && !out[field]) out[field] = issue.message;
  }
  return out;
}

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function getEspeciesInteres(fd: FormData): string[] {
  const raw = fd.get("especiesInteres");
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => typeof e === "string") : [];
  } catch {
    return [];
  }
}

export async function crearComprador(_prev: CompradorActionState, formData: FormData): Promise<CompradorActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const parsed = compradorFormSchema.safeParse({
    nombre: str(formData, "nombre"),
    tipo: str(formData, "tipo") as TipoComprador | undefined,
    ciudad: str(formData, "ciudad"),
    departamento: str(formData, "departamento"),
    contacto: str(formData, "contacto"),
    email: str(formData, "email") ?? "",
    telefono: str(formData, "telefono"),
    capacidadTon: (() => { const v = str(formData, "capacidadTon"); return v ? Number(v) : undefined; })(),
    precioKg: (() => { const v = str(formData, "precioKg"); return v ? Number(v) : undefined; })(),
    notas: str(formData, "notas"),
    estado: str(formData, "estado") ?? "ACTIVO",
    especiesInteres: getEspeciesInteres(formData),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  try {
    const { fincaActivaId } = await resolverFincaActiva(session);
    if (!fincaActivaId) return { error: "Registra una finca antes de agregar compradores" };
    await requireAccess(session, "comprador", "create", { fincaId: fincaActivaId });

    const comprador = await db.comprador.create({
      data: {
        userId: session.user.id,
        fincaId: fincaActivaId,
        nombre: parsed.data.nombre,
        tipo: parsed.data.tipo,
        ciudad: parsed.data.ciudad,
        departamento: parsed.data.departamento || undefined,
        contacto: parsed.data.contacto || undefined,
        email: parsed.data.email || undefined,
        telefono: parsed.data.telefono || undefined,
        capacidadTon: parsed.data.capacidadTon,
        precioKg: parsed.data.precioKg,
        notas: parsed.data.notas || undefined,
        estado: parsed.data.estado,
        especiesInteres: parsed.data.especiesInteres ?? [],
      },
    });

    revalidatePath("/dashboard/compradores");
    return { comprador };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearComprador]", error);
    return { error: "Error al crear el comprador" };
  }
}

export async function actualizarComprador(
  compradorId: string,
  _prev: CompradorActionState,
  formData: FormData
): Promise<CompradorActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const parsed = compradorFormSchema.safeParse({
    nombre: str(formData, "nombre"),
    tipo: str(formData, "tipo") as TipoComprador | undefined,
    ciudad: str(formData, "ciudad"),
    departamento: str(formData, "departamento"),
    contacto: str(formData, "contacto"),
    email: str(formData, "email") ?? "",
    telefono: str(formData, "telefono"),
    capacidadTon: (() => { const v = str(formData, "capacidadTon"); return v ? Number(v) : undefined; })(),
    precioKg: (() => { const v = str(formData, "precioKg"); return v ? Number(v) : undefined; })(),
    notas: str(formData, "notas"),
    estado: str(formData, "estado") ?? "ACTIVO",
    especiesInteres: getEspeciesInteres(formData),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  try {
    const existente = await db.comprador.findUnique({ where: { id: compradorId }, select: { fincaId: true } });
    if (!existente || !existente.fincaId) return { error: "No encontrado" };
    await requireAccess(session, "comprador", "update", { fincaId: existente.fincaId });

    const comprador = await db.comprador.update({
      where: { id: compradorId },
      data: {
        nombre: parsed.data.nombre,
        tipo: parsed.data.tipo,
        ciudad: parsed.data.ciudad,
        departamento: parsed.data.departamento,
        contacto: parsed.data.contacto,
        email: parsed.data.email,
        telefono: parsed.data.telefono,
        capacidadTon: parsed.data.capacidadTon,
        precioKg: parsed.data.precioKg,
        notas: parsed.data.notas,
        estado: parsed.data.estado,
        especiesInteres: parsed.data.especiesInteres,
      },
    });

    revalidatePath("/dashboard/compradores");
    return { comprador };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[actualizarComprador]", error);
    return { error: "Error al actualizar el comprador" };
  }
}

/** Cambiar solo el estado (toggle ACTIVO/PROSPECTO desde la card) — no pasa
 * por el formulario completo, mismo criterio que cambiarEtapaCultivo. */
export async function cambiarEstadoComprador(compradorId: string, nuevoEstado: string): Promise<CompradorActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await db.comprador.findUnique({ where: { id: compradorId }, select: { fincaId: true } });
    if (!existente || !existente.fincaId) return { error: "No encontrado" };
    await requireAccess(session, "comprador", "update", { fincaId: existente.fincaId });

    const comprador = await db.comprador.update({ where: { id: compradorId }, data: { estado: nuevoEstado } });
    revalidatePath("/dashboard/compradores");
    return { comprador };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[cambiarEstadoComprador]", error);
    return { error: "Error al actualizar estado" };
  }
}

export interface EliminarCompradorState {
  error?: string;
  ok?: boolean;
}

export async function eliminarComprador(_prev: EliminarCompradorState, compradorId: string): Promise<EliminarCompradorState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await db.comprador.findUnique({ where: { id: compradorId }, select: { fincaId: true } });
    if (!existente || !existente.fincaId) return { error: "No encontrado" };
    await requireAccess(session, "comprador", "delete", { fincaId: existente.fincaId });

    await db.comprador.delete({ where: { id: compradorId } });
    revalidatePath("/dashboard/compradores");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarComprador]", error);
    return { error: "Error al eliminar el comprador" };
  }
}
