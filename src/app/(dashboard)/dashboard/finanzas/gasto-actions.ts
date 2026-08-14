"use server";

/**
 * Server Actions — Gasto (Fase 1, ADR-006). Misma autorización y misma
 * lógica que ya tenían /api/gastos y /api/gastos/[id] (incluyendo el efecto
 * colateral de auto-crear un RegistroCultivo en la bitácora cuando el gasto
 * está ligado a un cultivo) — las rutas API se mantienen, esto es una
 * segunda entrada para el formulario de Finanzas.
 *
 * Qué revalida cada acción:
 * - crearGasto / actualizarGasto / eliminarGasto → revalidatePath
 *   "/dashboard/finanzas" SIEMPRE (la propia pantalla) y "/dashboard"
 *   SIEMPRE también — el Dashboard muestra el resumen de gastos/ingresos del
 *   mes, así que cualquier movimiento en Finanzas lo afecta (mismo patrón
 *   condicional usado en crearRegistro de Cultivos, solo que aquí el gasto
 *   ES la mutación principal, no un efecto secundario, así que revalida
 *   siempre en vez de condicionalmente).
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { gastoFormSchema } from "@/lib/validations";
import type { CategoriaGasto, Cultivo, Gasto, Lote, TipoGasto, Prisma } from "@prisma/client";

const gastoInclude = { cultivo: { include: { lote: true } }, lote: true };

export type GastoConRelaciones = Gasto & { cultivo: (Cultivo & { lote: Lote }) | null; lote: Lote | null };

export interface GastoActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  gasto?: GastoConRelaciones;
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

const CATEGORIA_TO_TIPO_REGISTRO: Record<string, string> = {
  INSUMOS: "FERTILIZACION",
  MANO_OBRA: "OBSERVACION",
  SEMILLAS_PLANTULAS: "SIEMBRA",
  AGUA_RIEGO: "RIEGO",
  TRATAMIENTO_PLAGAS: "TRATAMIENTO_PLAGAS",
};

export async function crearGasto(_prev: GastoActionState, formData: FormData): Promise<GastoActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const concepto = str(formData, "concepto");
  const categoria = str(formData, "categoria") as CategoriaGasto | undefined;
  const monto = num(formData, "monto");
  const fecha = str(formData, "fecha");
  const cultivoId = str(formData, "cultivoId");
  const loteId = str(formData, "loteId");

  const parsed = gastoFormSchema.safeParse({
    concepto, categoria, monto, fecha,
    proveedor: str(formData, "proveedor"),
    notas: str(formData, "notas"),
    cultivoId,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  try {
    // Resolver la finca del gasto: si viene ligado a un cultivo o lote, se
    // usa la finca real de ese cultivo/lote (nunca un fincaId suelto del
    // cliente); si no, la finca activa del selector del sidebar — idéntico
    // a la resolución en /api/gastos POST.
    let fincaId: string | undefined;
    if (cultivoId) {
      const cultivo = await db.cultivo.findUnique({ where: { id: cultivoId }, select: { lote: { select: { fincaId: true } } } });
      if (!cultivo) return { error: "Cultivo no encontrado" };
      fincaId = cultivo.lote.fincaId;
    } else if (loteId) {
      const lote = await db.lote.findUnique({ where: { id: loteId }, select: { fincaId: true } });
      if (!lote) return { error: "Lote no encontrado" };
      fincaId = lote.fincaId;
    } else {
      const { fincaActivaId } = await resolverFincaActiva(session);
      if (!fincaActivaId) return { error: "No se encontró finca" };
      fincaId = fincaActivaId;
    }

    await requireAccess(session, "gasto", "create", { fincaId });

    const gasto = await db.gasto.create({
      data: {
        userId: session.user.id,
        fincaId,
        concepto: parsed.data.concepto,
        categoria: parsed.data.categoria as CategoriaGasto,
        monto: parsed.data.monto,
        fecha: parsed.data.fecha ? new Date(parsed.data.fecha) : new Date(),
        proveedor: parsed.data.proveedor,
        notas: parsed.data.notas,
        cultivoId: cultivoId || undefined,
        loteId: loteId || undefined,
        subcategoria: str(formData, "subcategoria"),
        cantidad: num(formData, "cantidad"),
        unidad: str(formData, "unidad"),
        precioUnitario: num(formData, "precioUnitario"),
        tipoGasto: (str(formData, "tipoGasto") as TipoGasto) || "VARIABLE",
      },
      include: gastoInclude,
    });

    // ── Sync: Auto-create registro en la bitácora del cultivo ───────────────
    if (cultivoId && gasto.id) {
      const tipoRegistro = CATEGORIA_TO_TIPO_REGISTRO[gasto.categoria] || "OBSERVACION";
      db.registroCultivo.create({
        data: {
          cultivoId,
          tipo: tipoRegistro as Prisma.RegistroCultivoCreateInput["tipo"],
          descripcion: `💰 Gasto: ${gasto.concepto} ($${gasto.monto.toLocaleString("es-CO")} COP)`,
          fecha: gasto.fecha,
          gastoId: gasto.id,
        },
      }).catch(() => {}); // Non-blocking, igual que en /api/gastos
    }

    revalidatePath("/dashboard/finanzas");
    revalidatePath("/dashboard");
    return { gasto };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearGasto]", error);
    return { error: "Error al registrar el gasto" };
  }
}

export async function actualizarGasto(
  gastoId: string,
  _prev: GastoActionState,
  formData: FormData
): Promise<GastoActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await db.gasto.findUnique({ where: { id: gastoId }, select: { fincaId: true } });
    if (!existente) return { error: "Gasto no encontrado" };
    await requireAccess(session, "gasto", "update", { fincaId: existente.fincaId });

    const gasto = await db.gasto.update({
      where: { id: gastoId },
      data: {
        concepto: str(formData, "concepto"),
        categoria: str(formData, "categoria") as CategoriaGasto | undefined,
        monto: num(formData, "monto"),
        fecha: (() => { const f = str(formData, "fecha"); return f ? new Date(f) : undefined; })(),
        proveedor: str(formData, "proveedor") ?? null,
        notas: str(formData, "notas") ?? null,
        cultivoId: str(formData, "cultivoId") ?? null,
        loteId: str(formData, "loteId") ?? null,
        subcategoria: str(formData, "subcategoria") ?? null,
        cantidad: num(formData, "cantidad") ?? null,
        unidad: str(formData, "unidad") ?? null,
        precioUnitario: num(formData, "precioUnitario") ?? null,
        tipoGasto: (str(formData, "tipoGasto") as TipoGasto) || undefined,
      },
      include: gastoInclude,
    });

    revalidatePath("/dashboard/finanzas");
    revalidatePath("/dashboard");
    return { gasto };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[actualizarGasto]", error);
    return { error: "Error al actualizar el gasto" };
  }
}

export interface EliminarGastoState {
  error?: string;
  ok?: boolean;
}

export async function eliminarGasto(_prev: EliminarGastoState, gastoId: string): Promise<EliminarGastoState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await db.gasto.findUnique({ where: { id: gastoId }, select: { fincaId: true } });
    if (!existente) return { error: "Gasto no encontrado" };
    await requireAccess(session, "gasto", "delete", { fincaId: existente.fincaId });

    await db.gasto.delete({ where: { id: gastoId } });

    revalidatePath("/dashboard/finanzas");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarGasto]", error);
    return { error: "Error al eliminar el gasto" };
  }
}
