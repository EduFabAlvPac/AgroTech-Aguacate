import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { KpiCards, KpiCardsSkeleton } from "@/components/dashboard/KpiCards";
import { MapPreview } from "@/components/dashboard/MapPreview";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { CropTimeline } from "@/components/dashboard/CropTimeline";
import { AiChatPreview } from "@/components/dashboard/AiChatPreview";
import { FinancialChart, FinancialChartSkeleton } from "@/components/dashboard/FinancialChart";
import { BuyersPreview } from "@/components/dashboard/BuyersPreview";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolverFincaActiva, SIN_FINCA_SENTINEL as SIN_FINCA } from "@/lib/finca-activa";

export const dynamic = "force-dynamic";

// ── Async Server Component: fetches KPI data and renders KpiCards ─────────────
// Wrapped in Suspense so the rest of the dashboard renders immediately.
async function KpiCardsLoader({ fincaActivaId }: { fincaActivaId: string | null }) {
  // Antes db.gasto.aggregate() de "gastos del mes" no tenía NINGÚN scoping —
  // sumaba los gastos de TODA la base de datos (todos los tenants), no solo
  // los de la finca activa. Se corrige junto con el resto (funcionalidad de
  // fincas: ahora todo se scopea a UNA finca activa, no a "todas las
  // accesibles" — ver src/lib/finca-activa.ts).
  const [finca, gastosMes, alertas, ingresosAggregate] = await Promise.all([
    fincaActivaId
      ? db.finca.findUnique({
          where: { id: fincaActivaId },
          include: {
            lotes: {
              include: {
                cultivos: {
                  where: { estado: "ACTIVO" },
                  include: { especieCultivo: { select: { cicloMesesPrimeraCosecha: true } } },
                },
              },
            },
          },
        })
      : null,
    db.gasto.aggregate({
      where: {
        fincaId: fincaActivaId ?? SIN_FINCA,
        fecha: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { monto: true },
    }),
    db.alertaClimatica.count({ where: { activa: true, leida: false, fincaId: fincaActivaId ?? SIN_FINCA } }),
    db.ingreso.aggregate({
      where: {
        OR: [
          { cultivo: { lote: { fincaId: fincaActivaId ?? SIN_FINCA } } },
          { comprador: { fincaId: fincaActivaId ?? SIN_FINCA } },
        ],
      },
      _sum: { monto: true },
    }),
  ]);

  const totalHa = finca?.lotes.reduce((s, l) => s + l.areaHa, 0) ?? 0;
  const totalPlantas = finca?.lotes.reduce(
    (s, l) => s + l.cultivos.reduce((cs, c) => cs + (c.cantidadPlantas ?? 0), 0),
    0
  ) ?? 0;
  const gastosMesTotal = gastosMes._sum.monto ?? 0;
  const ingresosTotal = ingresosAggregate._sum.monto ?? 0;

  // Get first active cultivo for "próxima actividad" KPI — sin cultivo activo
  // no hay etapa/siembra real que proyectar, así que se deja undefined (la UI
  // muestra un estado neutro en vez de asumir "riego cada 3 días" por defecto).
  const primerCultivo = finca?.lotes.flatMap((l) => l.cultivos).find((c) => c.estado === "ACTIVO");
  const etapaCultivo = primerCultivo?.etapa;
  const diasDesdeSiembra = primerCultivo?.fechaSiembra
    ? Math.floor((Date.now() - new Date(primerCultivo.fechaSiembra).getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  // Estimación de "días a la cosecha": solo si hay un cultivo activo real con
  // fecha de siembra y la especie tiene un ciclo conocido — nunca un valor
  // fijo ni asumiendo aguacate por defecto (motor de fichas técnicas, §4).
  let cosechaEstimada: { dias: number; fechaLabel: string } | null = null;
  const cicloMeses = primerCultivo?.especieCultivo?.cicloMesesPrimeraCosecha;
  if (primerCultivo?.fechaSiembra && cicloMeses) {
    const fechaEst = new Date(primerCultivo.fechaSiembra);
    fechaEst.setMonth(fechaEst.getMonth() + cicloMeses);
    cosechaEstimada = {
      dias: Math.ceil((fechaEst.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      fechaLabel: fechaEst.toLocaleDateString("es-CO", { month: "short", year: "numeric" }),
    };
  }

  return (
    <KpiCards
      totalHa={totalHa}
      totalPlantas={totalPlantas}
      gastosMes={gastosMesTotal}
      alertasActivas={alertas}
      ingresosTotal={ingresosTotal}
      etapaCultivo={etapaCultivo}
      diasDesdeSiembra={diasDesdeSiembra}
      variedad={totalPlantas > 0 ? primerCultivo?.variedad : null}
      cosechaEstimada={cosechaEstimada}
    />
  );
}

// ── Async Server Component: fetches financial data for FinancialChart ─────────
async function FinancialChartLoader({ fincaActivaId }: { fincaActivaId: string | null }) {
  const year = new Date().getFullYear();
  const fechaInicio = new Date(year, 0, 1);
  const fechaFin = new Date(year, 11, 31, 23, 59, 59);

  const [gastos, ingresos] = await Promise.all([
    db.gasto.findMany({
      where: {
        fincaId: fincaActivaId ?? SIN_FINCA,
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
      select: { monto: true, fecha: true },
    }),
    db.ingreso.findMany({
      where: {
        OR: [
          { cultivo: { lote: { fincaId: fincaActivaId ?? SIN_FINCA } } },
          { comprador: { fincaId: fincaActivaId ?? SIN_FINCA } },
        ],
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
      select: { monto: true, fecha: true },
    }),
  ]);

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const mes = new Date(year, i, 1).toLocaleDateString("es-CO", { month: "short" });
    const gastosMonth = gastos
      .filter((g) => new Date(g.fecha).getMonth() === i)
      .reduce((s, g) => s + g.monto, 0);
    const ingresosMonth = ingresos
      .filter((ing) => new Date(ing.fecha).getMonth() === i)
      .reduce((s, ing) => s + ing.monto, 0);
    return { mes, gastos: gastosMonth, ingresos: ingresosMonth };
  });

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const totalIngresos = ingresos.reduce((s, i) => s + i.monto, 0);

  return (
    <FinancialChart
      initialData={monthlyData}
      totalGastos={totalGastos}
      totalIngresos={totalIngresos}
    />
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Todas las páginas se scopean a UNA finca activa (funcionalidad de fincas)
  // en vez de "la primera finca accesible" arbitraria.
  const { fincaActivaId } = await resolverFincaActiva(session);
  const finca = fincaActivaId
    ? await db.finca.findUnique({
        where: { id: fincaActivaId },
        include: {
          lotes: {
            include: {
              cultivos: {
                where: { estado: "ACTIVO" },
                include: { especieCultivo: { select: { cicloMesesPrimeraCosecha: true, produccionKgArbolAnual: true } } },
              },
            },
          },
        },
      })
    : null;

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={finca ? `${finca.nombre} · ${finca.municipio}` : "Sin finca seleccionada"}
      />

      <main className="page-scroll space-y-6 animate-fade-in">

        {/* KPI Cards — streamed with skeleton fallback */}
        <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCardsLoader fincaActivaId={fincaActivaId} />
        </Suspense>

        {/* Row 1: Map + Weather/Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <MapPreview finca={finca} />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4">
            <WeatherWidget municipio={finca?.municipio ?? "Norte de Santander"} />
          </div>
        </div>

        {/* Row 2: Crop Timeline + AI Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CropTimeline finca={finca} />
          <AiChatPreview />
        </div>

        {/* Row 3: Financial Chart */}
        <Suspense fallback={<FinancialChartSkeleton />}>
          <FinancialChartLoader fincaActivaId={fincaActivaId} />
        </Suspense>

        {/* Row 4: Buyers */}
        <BuyersPreview fincaActivaId={fincaActivaId} />

      </main>
    </>
  );
}
