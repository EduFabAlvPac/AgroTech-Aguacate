import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { FichasTecnicasClient } from "@/components/admin/FichasTecnicasClient";

export const metadata = { title: "Fichas técnicas — Admin" };
export const dynamic = "force-dynamic";

export default async function FichasTecnicasAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Chequeo fresco contra BD (no solo el JWT) — ver src/lib/authz.ts.
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { esSuperAdmin: true } });
  if (!user?.esSuperAdmin) redirect("/dashboard");

  const especies = await db.especieCultivo.findMany({
    include: {
      variedades: {
        include: {
          fichas: {
            orderBy: { version: "desc" },
            select: { id: true, version: true, estado: true, publicadaEn: true },
          },
          _count: { select: { cultivos: true } },
        },
        orderBy: { nombre: "asc" },
      },
    },
    orderBy: { nombre: "asc" },
  });

  return (
    <>
      <Header
        title="Fichas técnicas"
        subtitle="Catálogo maestro de especies, variedades y fichas técnicas — motor multi-cultivo"
      />
      <main className="page-scroll">
        <FichasTecnicasClient especies={especies} />
      </main>
    </>
  );
}
