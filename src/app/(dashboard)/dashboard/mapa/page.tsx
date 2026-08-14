import { Header } from "@/components/layout/Header";
import { MapaContainer } from "@/components/mapa/MapaContainer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { getMapaFinca } from "@/lib/data/mapa";

export const metadata = { title: "Mapa" };
export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "mapa")) redirect("/dashboard");

  // Antes filtraba por userId literal — scopeado a la finca activa
  // (funcionalidad de fincas, ver src/lib/finca-activa.ts).
  const { fincaActivaId } = await resolverFincaActiva(session);
  const finca = await getMapaFinca(fincaActivaId);

  return (
    <>
      <Header
        title="Mapa de lotes"
        subtitle="Georreferenciación y distribución de áreas cultivadas"
      />
      <main className="flex-1 overflow-hidden">
        <MapaContainer finca={finca as any} />
      </main>
    </>
  );
}
