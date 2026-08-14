"use server";

/**
 * Server Actions — Ingreso (Fase 1, ADR-006). Misma autorización y misma
 * lógica que /api/ingresos (POST) y /api/ingresos/[id] (DELETE) — incluye
 * el auto-cálculo de precioKg y el efecto colateral de crear un
 * RegistroCultivo de tipo COSECHA. No hay edición en la UI actual
 * (FinanzasClient no tiene "editar ingreso"), así que tampoco se agrega
 * aquí — mismo alcance que el componente que reemplaza.
 *
 * Qué revalida cada acción:
 * - crearIngreso / eliminarIngreso → revalidatePath "/dashboard/finanzas"
 *   y "/dashboard" siempre (mismo criterio que gasto-actions.ts: el
 *   Dashboard muestra el resumen de ingresos del mes).
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { ingresoFormSchema } from "@/lib/validations";
import type { IngresoWithRelations } from "@/types";

const ingresoInclude = { comprador: true, cultivo: { include: { lote: true } } };

export interface IngresoActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ingreso?: IngresoWithRelations;
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

function num(fd: FormData, key: string): number | undefined {
  const v = str(fd, key);
  return v ? Number(v) : undefined;
}

export async function crearIngreso(_prev: IngresoActionState, formData: FormData): Promise<IngresoActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const compradorId = str(formData, "compradorId");
  const cultivoId = str(formData, "cultivoId");

  const parsed = ingresoFormSchema.safeParse({
    concepto: str(formData, "concepto"),
    monto: num(formData, "monto"),
    cantidadKg: num(formData, "cantidadKg"),
    fecha: str(formData, "fecha"),
    compradorId,
    cultivoId,
    notas: str(formData, "notas"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  try {
    // Verificar acceso al comprador/cultivo si vienen ligados — idéntico a
    // /api/ingresos POST.
    if (compradorId) {
      const comprador = await db.comprador.findUnique({ where: { id: compradorId }, select: { fincaId: true } });
      if (!comprador || !comprador.fincaId) return { error: "Comprador no encontrado" };
      await requireAccess(session, "ingreso", "create", { fincaId: comprador.fincaId });
    }
    if (cultivoId) {
      const cultivo = await db.cultivo.findUnique({ where: { id: cultivoId }, select: { lote: { select: { fincaId: true } } } });
      if (!cultivo) return { error: "Cultivo no encontrado" };
      await requireAccess(session, "ingreso", "create", { fincaId: cultivo.lote.fincaId });
    }

    // Auto-calcular precioKg si hay cantidadKg y monto pero no precioKg —
    // mismo cálculo que la ruta API.
    const precioKg = parsed.data.cantidadKg && parsed.data.cantidadKg > 0
      ? parsed.data.monto / parsed.data.cantidadKg
      : undefined;

    const ingreso = await db.ingreso.create({
      data: {
        concepto: parsed.data.concepto,
        monto: parsed.data.monto,
        cantidadKg: parsed.data.cantidadKg ?? null,
        precioKg: precioKg ?? null,
        fecha: new Date(parsed.data.fecha),
        notas: parsed.data.notas ?? null,
        compradorId: compradorId || null,
        cultivoId: cultivoId || null,
      },
      include: ingresoInclude,
    });

    // ── Sync: Auto-create registro en la bitácora del cultivo ───────────────
    if (cultivoId && ingreso.id) {
      db.registroCultivo.create({
        data: {
          cultivoId,
          tipo: "COSECHA",
          descripcion: `📥 Ingreso: ${ingreso.concepto} ($${ingreso.monto.toLocaleString("es-CO")} COP${ingreso.cantidadKg ? `, ${ingreso.cantidadKg} kg` : ""})`,
          fecha: ingreso.fecha,
          ingresoId: ingreso.id,
        },
      }).catch(() => {});
    }

    revalidatePath("/dashboard/finanzas");
    revalidatePath("/dashboard");
    return { ingreso };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearIngreso]", error);
    return { error: "Error al registrar el ingreso" };
  }
}

export interface EliminarIngresoState {
  error?: string;
  ok?: boolean;
}

export async function eliminarIngreso(_prev: EliminarIngresoState, ingresoId: string): Promise<EliminarIngresoState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await db.ingreso.findUnique({
      where: { id: ingresoId },
      include: {
        comprador: { select: { fincaId: true } },
        cultivo: { include: { lote: { select: { fincaId: true } } } },
      },
    });
    if (!existente) return { error: "Ingreso no encontrado o no autorizado" };

    const fincaId = existente.cultivo?.lote.fincaId ?? existente.comprador?.fincaId;
    await requireAccess(session, "ingreso", "delete", fincaId ? { fincaId } : {});

    await db.ingreso.delete({ where: { id: ingresoId } });

    revalidatePath("/dashboard/finanzas");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarIngreso]", error);
    return { error: "Error al eliminar el ingreso" };
  }
}
