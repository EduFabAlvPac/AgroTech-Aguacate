import { Header } from "@/components/layout/Header";
import { MapaContainer } from "@/components/mapa/MapaContainer";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { resolverFincaActiva } from "@/lib/finca-activa";

export const metadata = { title: "Mapa" };
export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "mapa")) redirect("/dashboard");

  // Antes filtraba por userId literal — scopeado a la finca activa
  // (funcionalidad de fincas, ver src/lib/finca-activa.ts).
  const { fincaActivaId } = await resolverFincaActiva(session);
  const finca = fincaActivaId
    ? await db.finca.findUnique({
        where: { id: fincaActivaId },
        include: {
          lotes: {
            include: {
              cultivos: {
                select: { id: true, etapa: true, variedad: true, cantidadPlantas: true, fechaSiembra: true, estado: true },
                take: 1,
              },
              _count: {
                select: { cultivos: true },
              },
              analisisSuelo: { orderBy: { fechaMuestreo: "desc" } },
            },
          },
        },
      })
    : null;

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
