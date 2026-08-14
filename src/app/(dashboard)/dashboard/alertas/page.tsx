import { Header } from "@/components/layout/Header";
import { AlertasClient } from "@/components/alertas/AlertasClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { resolverFincaActiva, SIN_FINCA_SENTINEL } from "@/lib/finca-activa";
import { getAlertas } from "@/lib/data/alertas";

export const metadata = { title: "Alertas climáticas" };
export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "alertas")) redirect("/dashboard");

  // Antes esta consulta no tenía NINGÚN scoping — devolvía las alertas de
  // TODA la base de datos a cualquier usuario autenticado. Ahora se scopea a
  // UNA finca activa (funcionalidad de fincas, ver src/lib/finca-activa.ts).
  const { fincaActivaId } = await resolverFincaActiva(session);
  const alertas = await getAlertas(fincaActivaId, SIN_FINCA_SENTINEL);

  return (
    <>
      <Header
        title="Alertas climáticas"
        subtitle="Monitoreo de condiciones críticas para tu cultivo"
      />
      <main className="page-scroll">
        <AlertasClient alertas={alertas as any} />
      </main>
    </>
  );
}
