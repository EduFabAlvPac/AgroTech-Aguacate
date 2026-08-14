import { Header } from "@/components/layout/Header";
import { FinanzasClient } from "@/components/finanzas/FinanzasClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { resolverFincaActiva, SIN_FINCA_SENTINEL } from "@/lib/finca-activa";
import { getFinanzasResumen } from "@/lib/data/finanzas";

export const metadata = { title: "Finanzas" };
export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "finanzas")) redirect("/dashboard");

  // Scopeado a UNA finca activa (funcionalidad de fincas), no a "todas las
  // accesibles" — ver src/lib/finca-activa.ts.
  const { fincaActivaId } = await resolverFincaActiva(session);
  const resumen = await getFinanzasResumen(fincaActivaId, SIN_FINCA_SENTINEL);

  return (
    <>
      <Header
        title="Finanzas"
        subtitle="Gestión financiera agrícola completa"
      />
      <main className="page-scroll">
        <FinanzasClient
          gastos={resumen.gastos}
          ingresos={resumen.ingresos}
          cultivos={resumen.cultivos}
          compradores={resumen.compradores}
          lotes={resumen.lotes}
          presupuestos={resumen.presupuestos}
          nombreFinca={resumen.nombreFinca}
        />
      </main>
    </>
  );
}
