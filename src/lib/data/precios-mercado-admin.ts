import { db } from "@/lib/db";

/** Capa de datos pura — mismo patrón que fichas-tecnicas-admin.ts. */
export async function getPreciosMercado() {
  return db.precioMercado.findMany({
    orderBy: { fecha: "desc" },
    take: 100,
    include: { creadoPor: { select: { name: true, email: true } } },
  });
}
