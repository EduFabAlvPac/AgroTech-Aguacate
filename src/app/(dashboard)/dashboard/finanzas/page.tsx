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

  const [gastos, ingresos, cultivos, compradores, finca, lotes, presupuestos] = await Promise.all([
    db.gasto.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { cultivo: { lote: { finca: { userId: session.user.id } } } },
        ],
      },
      include: { cultivo: { include: { lote: true } }, lote: true },
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
      select: { nombre: true, lotes: { select: { id: true, nombre: true, areaHa: true } } },
    }),
    db.lote.findMany({
      where: { finca: { userId: session.user.id } },
      select: { id: true, nombre: true, areaHa: true },
      orderBy: { nombre: "asc" },
    }),
    db.presupuesto.findMany({
      where: {
        finca: { userId: session.user.id },
        anio: new Date().getFullYear(),
      },
    }),
  ]);

  return (
    <>
      <Header
        title="Finanzas"
        subtitle="Gestión financiera agrícola completa"
      />
      <main className="page-scroll">
        <FinanzasClient
          gastos={gastos}
          ingresos={ingresos}
          cultivos={cultivos}
          compradores={compradores}
          lotes={lotes}
          presupuestos={presupuestos}
          nombreFinca={finca?.nombre}
        />
      </main>
    </>
  );
}
