import { Header } from "@/components/layout/Header";
import { FinanzasClient } from "@/components/finanzas/FinanzasClient";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Finanzas" };
export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [gastos, ingresos, cultivos, compradores, finca] = await Promise.all([
    db.gasto.findMany({
      where: { cultivo: { lote: { finca: { userId: session.user.id } } } },
      include: { cultivo: { include: { lote: true } } },
      orderBy: { fecha: "desc" },
    }),
    db.ingreso.findMany({
      where: {
        OR: [
          { cultivo: { lote: { finca: { userId: session.user.id } } } },
          { comprador: { userId: session.user.id } },
        ],
      },
      include: {
        cultivo: { include: { lote: true } },
        comprador: true,
      },
      orderBy: { fecha: "desc" },
    }),
    db.cultivo.findMany({
      where: { lote: { finca: { userId: session.user.id } } },
      include: { lote: true },
    }),
    db.comprador.findMany({
      where: { userId: session.user.id, estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
    }),
    db.finca.findFirst({
      where: { userId: session.user.id },
      select: { nombre: true },
    }),
  ]);

  return (
    <>
      <Header
        title="Finanzas"
        subtitle="Gastos, ingresos y resumen financiero del cultivo"
      />
      <main className="page-scroll">
        <FinanzasClient
          gastos={gastos}
          ingresos={ingresos}
          cultivos={cultivos}
          compradores={compradores}
          nombreFinca={finca?.nombre}
        />
      </main>
    </>
  );
}
