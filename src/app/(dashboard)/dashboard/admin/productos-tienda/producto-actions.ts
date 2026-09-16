"use server";

/**
 * Server Actions — Tienda (catálogo informativo del modo Campesino,
 * /campesino/tienda). CRUD simple, sin versión/publicación — mismo patrón
 * base que precio-actions.ts.
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import type { ProductoTienda, CategoriaProducto } from "@prisma/client";

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

const CATEGORIAS: CategoriaProducto[] = ["FERTILIZANTES", "SEMILLAS", "BIOINSUMOS", "AGROQUIMICOS", "NUTRICION_VEGETAL", "RIEGO_MAQUINARIA"];

export interface ProductoActionState {
  error?: string;
  producto?: ProductoTienda;
}

export async function crearProductoTienda(_prev: ProductoActionState, formData: FormData): Promise<ProductoActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);

    const categoria = str(formData, "categoria") as CategoriaProducto | undefined;
    const nombre = str(formData, "nombre");
    const urlExterna = str(formData, "urlExterna");
    const precioStr = str(formData, "precio");
    const unidadPrecio = str(formData, "unidadPrecio");
    const imagenUrl = str(formData, "imagenUrl");
    const destacado = formData.get("destacado") === "true";

    if (!categoria || !CATEGORIAS.includes(categoria)) return { error: "Selecciona una categoría válida" };
    if (!nombre) return { error: "El nombre es requerido" };
    if (!urlExterna) return { error: "El enlace externo (a CrecIAgro) es requerido" };

    const producto = await db.productoTienda.create({
      data: {
        categoria,
        nombre,
        urlExterna,
        precio: precioStr ? Number(precioStr) : null,
        unidadPrecio: unidadPrecio ?? null,
        imagenUrl: imagenUrl ?? null,
        destacado,
        creadoPorId: session!.user.id,
      },
    });

    revalidatePath("/dashboard/admin/productos-tienda");
    revalidatePath("/campesino/tienda");
    return { producto };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearProductoTienda]", error);
    return { error: "Error interno" };
  }
}

export interface ToggleProductoState {
  error?: string;
  ok?: boolean;
}

export async function toggleActivoProductoTienda(id: string, nuevoActivo: boolean): Promise<ToggleProductoState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);

    await db.productoTienda.update({ where: { id }, data: { activo: nuevoActivo } });

    revalidatePath("/dashboard/admin/productos-tienda");
    revalidatePath("/campesino/tienda");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[toggleActivoProductoTienda]", error);
    return { error: "Error interno" };
  }
}

export async function eliminarProductoTienda(_prev: ToggleProductoState, id: string): Promise<ToggleProductoState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);

    await db.productoTienda.delete({ where: { id } });

    revalidatePath("/dashboard/admin/productos-tienda");
    revalidatePath("/campesino/tienda");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarProductoTienda]", error);
    return { error: "Error interno" };
  }
}
