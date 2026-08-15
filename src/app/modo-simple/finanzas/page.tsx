import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { resolverFincaActiva, SIN_FINCA_SENTINEL } from "@/lib/finca-activa";
import { getFinanzasResumen } from "@/lib/data/finanzas";
import { FinanzasSimpleClient } from "@/components/modo-simple/FinanzasSimpleClient";

export const metadata = { title: "Finanzas — modo simple" };
export const dynamic = "force-dynamic";

export default async function FinanzasSimplePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { fincaActivaId } = await resolverFincaActiva(session);
  const resumen = await getFinanzasResumen(fincaActivaId, SIN_FINCA_SENTINEL);

  return (
    <FinanzasSimpleClient
      gastos={resumen.gastos}
      ingresos={resumen.ingresos}
      cultivos={resumen.cultivos}
      compradores={resumen.compradores}
    />
  );
}
