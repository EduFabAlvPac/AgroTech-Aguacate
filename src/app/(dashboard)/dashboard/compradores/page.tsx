import { Header } from "@/components/layout/Header";
import { CompradoresClient } from "@/components/compradores/CompradoresClient";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Compradores" };
export const dynamic = "force-dynamic";

export default async function CompradoresPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const compradores = await db.comprador.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { ingresos: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Header
        title="Red de compradores"
        subtitle="Clientes, cooperativas y distribuidores registrados"
      />
      <main className="page-scroll">
        <CompradoresClient compradores={compradores as any} />
      </main>
    </>
  );
}
