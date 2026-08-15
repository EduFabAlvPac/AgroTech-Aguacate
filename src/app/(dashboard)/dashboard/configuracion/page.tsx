import { Header } from "@/components/layout/Header";
import { ConfigClient } from "@/components/configuracion/ConfigClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { resolverModoApp } from "@/lib/modo-app";
import { getConfiguracionResumen } from "@/lib/data/configuracion";
import { PerfilSimpleClient } from "@/components/modo-simple/PerfilSimpleClient";

export const metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { fincaActivaId } = await resolverFincaActiva(session);
  const { user, prefs, finca } = await getConfiguracionResumen(session.user.id, fincaActivaId);

  // Fase 3 de ADR-006 — bifurcación real (ver checkpoint). Configuración es
  // la única de las 6 rutas donde la rama simple es una versión REDUCIDA
  // (Perfil), no un espejo 1:1 — decisión ya confirmada con el usuario en
  // Fase 2 (checkpoint: "solo la versión reducida, sin ubicación/vereda ni
  // notas"). El switch de vista vive dentro de ambos componentes
  // (VistaPreferidaSwitch, ver ConfigClient.tsx/PerfilSimpleClient.tsx).
  const modo = await resolverModoApp(session.user.id);

  if (modo === "simple") {
    return <PerfilSimpleClient user={user} />;
  }

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
