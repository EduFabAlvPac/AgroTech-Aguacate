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

export const dynamic = "force-dynamic";

// ── Async Server Component: fetches KPI data and renders KpiCards ─────────────
// Wrapped in Suspense so the rest of the dashboard renders immediately.
async function KpiCardsLoader({ userId }: { userId: string }) {
  const [finca, gastosMes, alertas, ingresosAggregate] = await Promise.all([
    db.finca.findFirst({
      where: { userId },
      include: {
        lotes: {
          include: {
            cultivos: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
    db.gasto.aggregate({
      where: {
        fecha: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { monto: true },
    }),
    db.alertaClimatica.count({ where: { activa: true, leida: false } }),
    db.ingreso.aggregate({
      where: {
        OR: [
          { cultivo: { lote: { finca: { userId } } } },
          { comprador: { userId } },
        ],
      },
      _sum: { monto: true },
    }),
  ]);

  const totalHa = finca?.lotes.reduce((s, l) => s + l.areaHa, 0) ?? 0;
  const totalPlantas = finca?.lotes.reduce(
    (s, l) => s + (l.cultivos[0]?.cantidadPlantas ?? 0),
    0
  ) ?? 0;
  const gastosMesTotal = gastosMes._sum.monto ?? 0;
  const ingresosTotal = ingresosAggregate._sum.monto ?? 0;

  return (
    <KpiCards
      totalHa={totalHa}
      totalPlantas={totalPlantas}
      gastosMes={gastosMesTotal}
      alertasActivas={alertas}
      ingresosTotal={ingresosTotal}
    />
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const finca = await db.finca.findFirst({
    where: { userId: session.user.id },
    include: {
      lotes: {
        include: {
          cultivos: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`${finca?.nombre ?? "Mi Finca"} · ${finca?.municipio}`}
      />

      <main className="page-scroll space-y-6 animate-fade-in">

        {/* KPI Cards — streamed with skeleton fallback */}
        <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCardsLoader userId={session.user.id} />
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
          <FinancialChart userId={session.user.id} />
        </Suspense>

        {/* Row 4: Buyers */}
        <BuyersPreview userId={session.user.id} />

      </main>
    </>
  );
}
