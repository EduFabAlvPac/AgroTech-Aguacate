"use server";

/**
 * Server Actions — Finca (Fase 2, ADR-006 "modo simple"). Misma lógica
 * exacta que ya tenían /api/fincas (POST) y /api/fincas/[id] (PUT/DELETE)
 * — las rutas API se mantienen, esto es una segunda entrada. No existía
 * ningún Server Action de Finca antes (Fase 1 solo tocó Lote).
 *
 * Qué revalida: revalidatePath("/dashboard") en las tres — el nombre/lista
 * de fincas aparece en el selector del sidebar en cada página del
 * dashboard, no solo en "Mis fincas".
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import type { Finca } from "@prisma/client";

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function numOrUndef(fd: FormData, key: string): number | undefined {
  const v = str(fd, key);
  return v ? Number(v) : undefined;
}

export interface FincaActionState {
  error?: string;
  finca?: Finca;
}

export async function crearFinca(_prev: FincaActionState, formData: FormData): Promise<FincaActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    // Solo el OWNER de una organización puede crear fincas nuevas — la
    // matriz de authz.ts no le da "create" sobre "finca" a
    // ADMIN_FINCA/COLABORADOR (roles scoped a fincas ya existentes, ver
    // CLAUDE.md §2.3).
    const propia = await db.membresia.findFirst({
      where: { userId: session.user.id, rol: "OWNER", aceptada: true, activa: true },
      select: { organizacionId: true },
    });
    if (!propia) return { error: "Solo el dueño de la organización puede crear fincas" };
    await requireAccess(session, "finca", "create", { organizacionId: propia.organizacionId });

    const nombre = str(formData, "nombre");
    const municipio = str(formData, "municipio");
    const departamento = str(formData, "departamento");
    if (!nombre || !municipio || !departamento) {
      return { error: "nombre, municipio y departamento son requeridos" };
    }

    const finca = await db.finca.create({
      data: {
        nombre,
        municipio,
        departamento,
        altitud: numOrUndef(formData, "altitud"),
        lat: numOrUndef(formData, "lat"),
        lng: numOrUndef(formData, "lng"),
        areaTotal: numOrUndef(formData, "areaTotal"),
        userId: session.user.id,
        organizacionId: propia.organizacionId,
      },
    });

    revalidatePath("/dashboard");
    return { finca };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearFinca]", error);
    return { error: "Error al crear la finca" };
  }
}

export async function actualizarFinca(fincaId: string, _prev: FincaActionState, formData: FormData): Promise<FincaActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await db.finca.findUnique({ where: { id: fincaId }, select: { id: true } });
    if (!existente) return { error: "Finca no encontrada" };
    await requireAccess(session, "finca", "update", { fincaId });

    const nombre = str(formData, "nombre");
    const municipio = str(formData, "municipio");
    const departamento = str(formData, "departamento");
    if (!nombre || !municipio || !departamento) {
      return { error: "nombre, municipio y departamento son requeridos" };
    }

    const finca = await db.finca.update({
      where: { id: fincaId },
      data: {
        nombre,
        municipio,
        departamento,
        altitud: numOrUndef(formData, "altitud") ?? null,
        lat: numOrUndef(formData, "lat") ?? null,
        lng: numOrUndef(formData, "lng") ?? null,
        areaTotal: numOrUndef(formData, "areaTotal") ?? null,
      },
    });

    revalidatePath("/dashboard");
    return { finca };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[actualizarFinca]", error);
    return { error: "Error al actualizar la finca" };
  }
}

export interface EliminarFincaState {
  error?: string;
  ok?: boolean;
}

export async function eliminarFinca(_prev: EliminarFincaState, fincaId: string): Promise<EliminarFincaState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const finca = await db.finca.findUnique({
      where: { id: fincaId },
      select: { id: true, organizacionId: true, _count: { select: { lotes: true } } },
    });
    if (!finca) return { error: "Finca no encontrada" };
    await requireAccess(session, "finca", "delete", { fincaId });

    // No dejar la organización sin ninguna finca.
    if (finca.organizacionId) {
      const totalFincas = await db.finca.count({ where: { organizacionId: finca.organizacionId } });
      if (totalFincas <= 1) return { error: "No puedes eliminar tu única finca" };
    }

    // Protección: no eliminar una finca con lotes (mismo criterio que ya
    // existe para Lote — "no se puede eliminar si tiene cultivos activos").
    if (finca._count.lotes > 0) {
      return { error: `Esta finca tiene ${finca._count.lotes} lote(s) registrados. Elimínalos primero desde Cultivos/Mapa.` };
    }

    await db.finca.delete({ where: { id: fincaId } });
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarFinca]", error);
    return { error: "Error al eliminar la finca" };
  }
}
