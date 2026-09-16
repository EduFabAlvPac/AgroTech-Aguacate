import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { PreciosMercadoClient } from "@/components/admin/PreciosMercadoClient";
import { getPreciosMercado } from "@/lib/data/precios-mercado-admin";

export const metadata = { title: "Precios de mercado — Admin" };
export const dynamic = "force-dynamic";

export default async function PreciosMercadoAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { esSuperAdmin: true } });
  if (!user?.esSuperAdmin) redirect("/dashboard");

  const precios = await getPreciosMercado();

  return (
    <>
      <Header
        title="Precios de mercado"
        subtitle="Precios de referencia de café, cacao, aguacate y cítricos — visibles en el modo Campesino"
      />
      <main className="page-scroll">
        <PreciosMercadoClient precios={precios} />
      </main>
    </>
  );
}
