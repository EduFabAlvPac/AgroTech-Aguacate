import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { resolverFincaActiva, SIN_FINCA_SENTINEL } from "@/lib/finca-activa";
import { getFincas } from "@/lib/data/fincas";
import { getDashboardFinca, getDashboardKpis } from "@/lib/data/dashboard";
import { getAlertas } from "@/lib/data/alertas";
import { InicioSimpleClient } from "@/components/modo-simple/InicioSimpleClient";

export const metadata = { title: "Inicio — modo simple" };
export const dynamic = "force-dynamic";

export default async function InicioSimplePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { fincaActivaId } = await resolverFincaActiva(session);
  const [fincas, finca, kpis, alertas] = await Promise.all([
    getFincas(session),
    getDashboardFinca(fincaActivaId),
    getDashboardKpis(fincaActivaId),
    getAlertas(fincaActivaId, SIN_FINCA_SENTINEL),
  ]);

  // "3 Cultivos" del mockup — no existe como campo en DashboardKpis, se
  // deriva de finca.lotes[].cultivos[] ya cargada por getDashboardFinca
  // (cero query nueva, decisión confirmada con el usuario).
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
