import { Header } from "@/components/layout/Header";
import { FinanzasClient } from "@/components/finanzas/FinanzasClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { resolverFincaActiva, SIN_FINCA_SENTINEL } from "@/lib/finca-activa";
import { resolverModoApp } from "@/lib/modo-app";
import { getFinanzasResumen } from "@/lib/data/finanzas";
import { FinanzasSimpleClient } from "@/components/modo-simple/FinanzasSimpleClient";

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

  // Fase 3 de ADR-006 — bifurcación real (ver checkpoint). Mismo `resumen`
  // para ambas ramas, cada componente toma el subconjunto de props que ya
  // usaba.
  const modo = await resolverModoApp(session.user.id);

  if (modo === "simple") {
    return (
      <FinanzasSimpleClient
        gastos={resumen.gastos}
        ingresos={resumen.ingresos}
        cultivos={resumen.cultivos}
        compradores={resumen.compradores}
      />
    );
  }

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
