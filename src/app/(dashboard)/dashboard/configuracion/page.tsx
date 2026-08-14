import { Header } from "@/components/layout/Header";
import { ConfigClient } from "@/components/configuracion/ConfigClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { getConfiguracionResumen } from "@/lib/data/configuracion";

export const metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { fincaActivaId } = await resolverFincaActiva(session);
  const { user, prefs, finca } = await getConfiguracionResumen(session.user.id, fincaActivaId);

  return (
    <>
      <Header
        title="Configuración"
        subtitle="Perfil, finca y preferencias de alertas"
      />
      <main className="page-scroll">
        <ConfigClient user={user as any} prefs={prefs} finca={finca} />
      </main>
    </>
  );
}
