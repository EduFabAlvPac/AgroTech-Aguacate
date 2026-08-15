import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getFincas } from "@/lib/data/fincas";
import { MisFincasSimpleClient } from "@/components/modo-simple/MisFincasSimpleClient";

export const metadata = { title: "Mis fincas" };
export const dynamic = "force-dynamic";

/**
 * Ruta real nueva (Fase 3, ADR-006) — no existía nada equivalente en modo
 * completo para bifurcar (Configuración solo edita la finca activa
 * inline, no lista/administra todas). Decisión confirmada explícitamente
 * con el usuario en el checkpoint de Fase 3: esta ruta SIEMPRE renderiza
 * MisFincasSimpleClient, sin importar vistaPreferida — no hay nada de
 * modo completo con qué bifurcar. El layout de (dashboard) igual decide
 * el envoltorio (sidebar vs. header+nav inferior) según la preferencia
 * global del usuario, como en cualquier otra ruta.
 */
export default async function FincasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const fincas = await getFincas(session);

  return <MisFincasSimpleClient fincas={fincas} />;
}
