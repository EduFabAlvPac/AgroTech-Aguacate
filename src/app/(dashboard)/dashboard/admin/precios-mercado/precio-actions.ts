"use server";

/**
 * Server Actions — Precios de Mercado Admin (contenido del modo Campesino,
 * /campesino/precios). Mismo patrón que ficha-actions.ts (requireSuperAdmin
 * + str() + ActionState{error?, entidad?}), pero sin versión/publicación —
 * no hace falta ese nivel de complejidad para un precio de referencia.
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import type { PrecioMercado, CommodityMercado } from "@prisma/client";

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

const COMMODITIES: CommodityMercado[] = ["CAFE", "CACAO", "AGUACATE", "CITRICOS"];

export interface PrecioActionState {
  error?: string;
  precio?: PrecioMercado;
}

export async function crearPrecioMercado(_prev: PrecioActionState, formData: FormData): Promise<PrecioActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);

    const commodity = str(formData, "commodity") as CommodityMercado | undefined;
    const precioKgStr = str(formData, "precioKg");
    const unidad = str(formData, "unidad") ?? "kg";

    if (!commodity || !COMMODITIES.includes(commodity)) return { error: "Selecciona un cultivo válido" };
    const precioKg = precioKgStr ? Number(precioKgStr) : NaN;
    if (!precioKgStr || Number.isNaN(precioKg) || precioKg <= 0) return { error: "Ingresa un precio válido" };

    // Tendencia calculada y CONGELADA comparando contra el registro anterior
    // más reciente del mismo commodity — no se recalcula en cada lectura.
    const anterior = await db.precioMercado.findFirst({
      where: { commodity, activo: true },
      orderBy: { fecha: "desc" },
    });
    const tendencia = !anterior
      ? "IGUAL"
      : precioKg > anterior.precioKg
        ? "SUBIO"
        : precioKg < anterior.precioKg
          ? "BAJO"
          : "IGUAL";

    const precio = await db.precioMercado.create({
      data: { commodity, precioKg, unidad, tendencia, creadoPorId: session!.user.id },
    });

    revalidatePath("/dashboard/admin/precios-mercado");
    revalidatePath("/campesino/precios");
    return { precio };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearPrecioMercado]", error);
    return { error: "Error interno" };
  }
}

export interface EliminarPrecioState {
  error?: string;
  ok?: boolean;
}

export async function eliminarPrecioMercado(_prev: EliminarPrecioState, id: string): Promise<EliminarPrecioState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);

    await db.precioMercado.delete({ where: { id } });

    revalidatePath("/dashboard/admin/precios-mercado");
    revalidatePath("/campesino/precios");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarPrecioMercado]", error);
    return { error: "Error interno" };
  }
}
