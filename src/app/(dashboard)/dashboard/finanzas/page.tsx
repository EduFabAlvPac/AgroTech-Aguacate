import { Header } from "@/components/layout/Header";
import { FinanzasClient } from "@/components/finanzas/FinanzasClient";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { resolverFincaActiva, SIN_FINCA_SENTINEL } from "@/lib/finca-activa";

export const metadata = { title: "Finanzas" };
export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "finanzas")) redirect("/dashboard");

  // Scopeado a UNA finca activa (funcionalidad de fincas), no a "todas las
  // accesibles" — ver src/lib/finca-activa.ts.
  const { fincaActivaId } = await resolverFincaActiva(session);
  const fincaId = fincaActivaId ?? SIN_FINCA_SENTINEL;

  const [gastos, ingresos, cultivos, compradores, finca, lotes, presupuestos] = await Promise.all([
    db.gasto.findMany({
      where: { fincaId },
      include: { cultivo: { include: { lote: true } }, lote: true },
      orderBy: { fecha: "desc" },
    }),
    db.ingreso.findMany({
      where: {
        OR: [
          { cultivo: { lote: { fincaId } } },
          { comprador: { fincaId } },
        ],
      },
      include: {
        cultivo: { include: { lote: true } },
        comprador: true,
      },
      orderBy: { fecha: "desc" },
    }),
    db.cultivo.findMany({
      where: { lote: { fincaId } },
      include: { lote: true, especieCultivo: { select: { produccionKgArbolAnual: true } } },
    }),
    db.comprador.findMany({
      where: { fincaId, estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
    }),
    fincaActivaId
      ? db.finca.findUnique({
          where: { id: fincaActivaId },
          select: { nombre: true, lotes: { select: { id: true, nombre: true, areaHa: true } } },
        })
      : null,
    db.lote.findMany({
      where: { fincaId },
      select: { id: true, nombre: true, areaHa: true },
      orderBy: { nombre: "asc" },
    }),
    db.presupuesto.findMany({
      where: {
        fincaId,
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
