import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { OrganizacionesAdminClient } from "@/components/admin/OrganizacionesAdminClient";
import { getOrganizacionesAdmin } from "@/lib/data/organizaciones-admin";

export const metadata = { title: "Organizaciones — Admin" };
export const dynamic = "force-dynamic";

export default async function OrganizacionesAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Chequeo fresco contra BD (no solo el JWT), mismo patrón que los demás
  // paneles de Super Admin.
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { esSuperAdmin: true } });
  if (!user?.esSuperAdmin) redirect("/dashboard");

  const organizaciones = await getOrganizacionesAdmin();

  return (
    <>
      <Header
        title="Organizaciones"
        subtitle="Planes y pruebas de cooperativas — activa el plan Colectivo o extiende una prueba"
      />
      <main className="page-scroll">
        <OrganizacionesAdminClient organizaciones={organizaciones} />
      </main>
    </>
  );
}
