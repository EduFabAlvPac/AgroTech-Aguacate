import { db } from "@/lib/db";
import { HeaderSeccion } from "@/components/modo-campesino/HeaderSeccion";
import { GRADIENTE_SECCION } from "@/lib/campesino-gradientes";
import { TiendaCampesinoClient } from "@/components/modo-campesino/TiendaCampesinoClient";

export const metadata = { title: "Tienda — GermIA" };
export const dynamic = "force-dynamic";

export default async function TiendaCampesinoPage() {
  const productos = await db.productoTienda.findMany({
    where: { activo: true },
    orderBy: [{ destacado: "desc" }, { orden: "asc" }],
  });

  return (
    <div className="flex flex-col min-h-full" style={{ background: "white" }}>
      <HeaderSeccion titulo="Tienda" gradiente={GRADIENTE_SECCION.tienda} />
      <TiendaCampesinoClient productos={productos} />
    </div>
  );
}
