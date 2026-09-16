import { db } from "@/lib/db";

/** Capa de datos pura — mismo patrón que fichas-tecnicas-admin.ts. */
export async function getProductosTienda() {
  return db.productoTienda.findMany({
    orderBy: [{ destacado: "desc" }, { orden: "asc" }, { createdAt: "desc" }],
  });
}
