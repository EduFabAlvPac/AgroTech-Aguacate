import { Header } from "@/components/layout/Header";
import { AlertasClient } from "@/components/alertas/AlertasClient";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Alertas climáticas" };
export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const alertas = await db.alertaClimatica.findMany({
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
