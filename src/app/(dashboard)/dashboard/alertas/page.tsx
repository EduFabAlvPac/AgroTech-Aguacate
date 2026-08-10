import { Header } from "@/components/layout/Header";
import { AlertasClient } from "@/components/alertas/AlertasClient";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fincaIdsAccesibles } from "@/lib/db/scoped";
import { tieneModulo } from "@/lib/modulos";

export const metadata = { title: "Alertas climáticas" };
export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "alertas")) redirect("/dashboard");

  // Antes esta consulta no tenía NINGÚN scoping — devolvía las alertas de
  // TODA la base de datos a cualquier usuario autenticado. Se corrige junto
  // con el resto del aislamiento de AlertaClimatica (Fase 2).
  const fincaIds = await fincaIdsAccesibles(session);
  const alertas = await db.alertaClimatica.findMany({
    where: fincaIds === "ALL" ? undefined : { fincaId: { in: fincaIds } },
    orderBy: [{ activa: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

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
