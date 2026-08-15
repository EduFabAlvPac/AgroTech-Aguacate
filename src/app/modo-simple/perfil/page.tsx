import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getConfiguracionResumen } from "@/lib/data/configuracion";
import { PerfilSimpleClient } from "@/components/modo-simple/PerfilSimpleClient";

export const metadata = { title: "Perfil — modo simple" };
export const dynamic = "force-dynamic";

export default async function PerfilSimplePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // getConfiguracionResumen ya existía (Fase 1). Se pide sin fincaActivaId
  // (null) porque la versión reducida de Perfil (decisión confirmada con el
  // usuario: omitir ubicación/vereda y notas por no existir en el modelo)
  // no muestra ningún dato de finca — solo nombre/teléfono/email.
  const { user } = await getConfiguracionResumen(session.user.id, null);

  return <PerfilSimpleClient user={user} />;
}
