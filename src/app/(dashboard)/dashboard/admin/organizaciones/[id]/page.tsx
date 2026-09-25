import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { OrganizacionDetalleClient } from "@/components/admin/OrganizacionDetalleClient";
import { getOrganizacionDetalle } from "@/lib/data/organizaciones-admin";

export const metadata = { title: "Organización — Admin" };
export const dynamic = "force-dynamic";

export default async function OrganizacionAdminDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { esSuperAdmin: true } });
  if (!user?.esSuperAdmin) redirect("/dashboard");

  const { id } = await params;
  const org = await getOrganizacionDetalle(id);
  if (!org) notFound();

  return (
    <>
      <Header title={org.nombre} subtitle="Administración de una organización — lo que cambies aquí afecta a sus miembros" />
      <main className="page-scroll">
        <OrganizacionDetalleClient org={org} />
      </main>
    </>
  );
}
