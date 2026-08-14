"use server";

/**
 * Server Action — Presupuesto (Fase 1, ADR-006). El formulario original
 * guarda TODAS las categorías con valor a la vez con un solo botón "Guardar
 * presupuesto" (antes: N fetch paralelos, uno por categoría, a
 * /api/presupuesto POST) — aquí se colapsa en una sola Server Action que
 * recibe la lista completa como JSON en un input oculto y hace upsert de
 * cada categoría en el servidor (mismo upsert que la ruta API, por
 * categoría, para no perder la semántica "crear o actualizar" por fila).
 *
 * Qué revalida: revalidatePath("/dashboard/finanzas"), "/dashboard" — el
 * presupuesto alimenta la comparación presupuesto-vs-real que también se
 * usa en indicadores del resumen financiero del Dashboard.
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverFincaActiva } from "@/lib/finca-activa";
import type { CategoriaGasto, Presupuesto } from "@prisma/client";

export interface PresupuestoActionState {
  error?: string;
  presupuestos?: Presupuesto[];
}

interface EntradaPresupuesto {
  categoria: CategoriaGasto;
  montoPlaneado: number;
}

function getEntradas(formData: FormData): EntradaPresupuesto[] {
  const raw = formData.get("entradas");
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.categoria === "string" && Number(e.montoPlaneado) > 0);
  } catch {
    return [];
  }
}

export async function guardarPresupuesto(_prev: PresupuestoActionState, formData: FormData): Promise<PresupuestoActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const anio = Number(formData.get("anio")) || new Date().getFullYear();
  const entradas = getEntradas(formData);
  if (entradas.length === 0) return { error: "No hay valores de presupuesto para guardar" };

  try {
    const { fincaActivaId } = await resolverFincaActiva(session);
    if (!fincaActivaId) return { error: "No se encontró finca" };
    await requireAccess(session, "presupuesto", "create", { fincaId: fincaActivaId });

    const presupuestos = await Promise.all(
      entradas.map((e) =>
        db.presupuesto.upsert({
          where: { fincaId_anio_categoria: { fincaId: fincaActivaId, anio, categoria: e.categoria } },
          update: { montoPlaneado: e.montoPlaneado },
          create: { userId: session.user.id, fincaId: fincaActivaId, anio, categoria: e.categoria, montoPlaneado: e.montoPlaneado },
        })
      )
    );

    revalidatePath("/dashboard/finanzas");
    revalidatePath("/dashboard");
    return { presupuestos };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[guardarPresupuesto]", error);
    return { error: "Error al guardar presupuesto" };
  }
}
