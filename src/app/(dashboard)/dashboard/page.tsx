import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { KpiCards, KpiCardsSkeleton } from "@/components/dashboard/KpiCards";
import { MapPreview } from "@/components/dashboard/MapPreview";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { CropTimeline } from "@/components/dashboard/CropTimeline";
import { AiChatPreview } from "@/components/dashboard/AiChatPreview";
import { FinancialChart, FinancialChartSkeleton } from "@/components/dashboard/FinancialChart";
import { BuyersPreview } from "@/components/dashboard/BuyersPreview";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolverFincaActiva, SIN_FINCA_SENTINEL } from "@/lib/finca-activa";
import { resolverModoApp } from "@/lib/modo-app";
import { getFincas } from "@/lib/data/fincas";
import { getAlertas } from "@/lib/data/alertas";
import {
  getDashboardFinca,
  getDashboardKpis,
  getDashboardFinancialChart,
  computeCropTimeline,
} from "@/lib/data/dashboard";
import { InicioSimpleClient } from "@/components/modo-simple/InicioSimpleClient";

export const dynamic = "force-dynamic";

// ── Streaming boundaries: cada Loader hace su propio fetch independiente de
// la capa de datos, para no bloquear el resto de la página (Suspense). ─────
async function KpiCardsLoader({ fincaActivaId }: { fincaActivaId: string | null }) {
  const kpis = await getDashboardKpis(fincaActivaId);
  return <KpiCards {...kpis} />;
}

async function FinancialChartLoader({ fincaActivaId }: { fincaActivaId: string | null }) {
  const { monthlyData, totalGastos, totalIngresos } = await getDashboardFinancialChart(fincaActivaId);
  return <FinancialChart initialData={monthlyData} totalGastos={totalGastos} totalIngresos={totalIngresos} />;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Todas las páginas se scopean a UNA finca activa (funcionalidad de fincas)
  // en vez de "la primera finca accesible" arbitraria.
  const { fincaActivaId } = await resolverFincaActiva(session);

  // Fase 3 de ADR-006 — bifurcación real: mismo mecanismo en las 6 rutas
  // (ver checkpoint). Ninguno de los dos conjuntos de componentes de abajo
  // se modifica, solo se decide cuál se monta.
  const modo = await resolverModoApp(session.user.id);

  if (modo === "simple") {
    const [fincas, finca, kpis, alertas] = await Promise.all([
      getFincas(session),
      getDashboardFinca(fincaActivaId),
      getDashboardKpis(fincaActivaId),
      getAlertas(fincaActivaId, SIN_FINCA_SENTINEL),
    ]);
    const totalCultivos = finca?.lotes.flatMap((l) => l.cultivos).length ?? 0;

    return (
      <InicioSimpleClient
        fincas={fincas}
        fincaActivaId={fincaActivaId}
        fincaSinUbicacion={!!fincaActivaId && !finca?.lat}
        totalCultivos={totalCultivos}
        kpis={kpis}
        alertas={alertas}
      />
    );
  }

  const finca = await getDashboardFinca(fincaActivaId);
  const cropTimelineData = computeCropTimeline(finca);

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
          <CropTimeline data={cropTimelineData} />
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
