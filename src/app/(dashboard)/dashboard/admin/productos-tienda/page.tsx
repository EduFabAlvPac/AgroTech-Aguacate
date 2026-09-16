import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { ProductosTiendaClient } from "@/components/admin/ProductosTiendaClient";
import { getProductosTienda } from "@/lib/data/productos-tienda-admin";

export const metadata = { title: "Tienda (insumos) — Admin" };
export const dynamic = "force-dynamic";

export default async function ProductosTiendaAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { esSuperAdmin: true } });
  if (!user?.esSuperAdmin) redirect("/dashboard");

  const productos = await getProductosTienda();

  return (
    <>
      <Header
        title="Tienda (insumos)"
        subtitle="Catálogo informativo de insumos — visible en el modo Campesino, enlaza a CrecIAgro"
      />
      <main className="page-scroll">
        <ProductosTiendaClient productos={productos} />
      </main>
    </>
  );
}
