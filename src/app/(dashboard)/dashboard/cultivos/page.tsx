import { Header } from "@/components/layout/Header";
import { CultivosList } from "@/components/cultivos/CultivosList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { getCultivos } from "@/lib/data/cultivos";

export const metadata = { title: "Cultivos" };
export const dynamic = "force-dynamic";

export default async function CultivosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "cultivos")) redirect("/dashboard");

  // Antes filtraba por userId literal (ni siquiera fincaIdsAccesibles) — un
  // ADMIN_FINCA/COLABORADOR no veía nada. Ahora se scopea a la finca activa
  // (funcionalidad de fincas, ver src/lib/finca-activa.ts).
  const { fincaActivaId } = await resolverFincaActiva(session);
  const finca = await getCultivos(fincaActivaId);

  return (
    <>
      <Header
        title="Mis cultivos"
        subtitle="Seguimiento por lote y etapa del ciclo"
      />
      <main className="page-scroll">
        <CultivosList finca={finca} />
      </main>
    </>
  );
}
