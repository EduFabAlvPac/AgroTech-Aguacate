import { Header } from "@/components/layout/Header";
import { CultivoDetail } from "@/components/cultivos/CultivoDetail";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cultivo = await db.cultivo.findUnique({
    where: { id },
    include: { lote: true },
  });
  return { title: cultivo ? `${cultivo.variedad} · ${cultivo.lote.nombre}` : "Cultivo" };
}

export default async function CultivoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const cultivo = await db.cultivo.findFirst({
    where: {
      id,
      lote: { finca: { userId: session.user.id } },
    },
    include: {
      lote: { include: { finca: true } },
      registros: { orderBy: { fecha: "desc" } },
      gastos: { orderBy: { fecha: "desc" }, take: 10 },
      ingresos: { include: { comprador: true }, orderBy: { fecha: "desc" } },
    },
  });

  if (!cultivo) notFound();

  return (
    <>
      <Header
        title={`${cultivo.variedad} · ${cultivo.lote.nombre}`}
        subtitle={`${cultivo.lote.finca.nombre} · ${cultivo.lote.areaHa} ha`}
      />
      <main className="page-scroll">
        <CultivoDetail cultivo={cultivo as any} />
      </main>
    </>
  );
}
