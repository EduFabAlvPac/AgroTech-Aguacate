import { Header } from "@/components/layout/Header";
import { FinanzasClient } from "@/components/finanzas/FinanzasClient";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { fincaIdsAccesibles } from "@/lib/db/scoped";

export const metadata = { title: "Finanzas" };
export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "finanzas")) redirect("/dashboard");

  const fincaIds = await fincaIdsAccesibles(session);
  const enFincas = fincaIds === "ALL" ? undefined : { in: fincaIds };

  const [gastos, ingresos, cultivos, compradores, finca, lotes, presupuestos] = await Promise.all([
    db.gasto.findMany({
      where: fincaIds === "ALL" ? undefined : { fincaId: enFincas },
      include: { cultivo: { include: { lote: true } }, lote: true },
      orderBy: { fecha: "desc" },
    }),
    db.ingreso.findMany({
      where: {
        OR: [
          { cultivo: { lote: { fincaId: enFincas } } },
          { comprador: { fincaId: enFincas } },
        ],
      },
      include: {
        cultivo: { include: { lote: true } },
        comprador: true,
      },
      orderBy: { fecha: "desc" },
    }),
    db.cultivo.findMany({
      where: { lote: { fincaId: enFincas } },
      include: { lote: true },
    }),
    db.comprador.findMany({
      where: { fincaId: enFincas, estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
    }),
    db.finca.findFirst({
      where: fincaIds === "ALL" ? undefined : { id: enFincas },
      select: { nombre: true, lotes: { select: { id: true, nombre: true, areaHa: true } } },
    }),
    db.lote.findMany({
      where: { fincaId: enFincas },
      select: { id: true, nombre: true, areaHa: true },
      orderBy: { nombre: "asc" },
    }),
    db.presupuesto.findMany({
      where: {
        fincaId: enFincas,
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
