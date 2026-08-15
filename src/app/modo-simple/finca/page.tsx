import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getFincas } from "@/lib/data/fincas";
import { MisFincasSimpleClient } from "@/components/modo-simple/MisFincasSimpleClient";

export const metadata = { title: "Mis fincas — modo simple" };
export const dynamic = "force-dynamic";

export default async function MisFincasSimplePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // getFincas ya existía (creada al arrancar Fase 2) — sin uso todavía hasta
  // ahora. No se toca nada de lib/data aquí.
  const fincas = await getFincas(session);

  return <MisFincasSimpleClient fincas={fincas} />;
}
