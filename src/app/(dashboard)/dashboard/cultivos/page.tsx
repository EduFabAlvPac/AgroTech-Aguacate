import { Header } from "@/components/layout/Header";
import { CultivosList } from "@/components/cultivos/CultivosList";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Cultivos" };
export const dynamic = "force-dynamic";

export default async function CultivosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const finca = await db.finca.findFirst({
    where: { userId: session.user.id },
    include: {
      lotes: {
        include: {
          cultivos: {
            include: {
              registros: { orderBy: { fecha: "desc" }, take: 3 },
              _count: { select: { registros: true, gastos: true } },
            },
          },
        },
      },
    },
  });

  return (
    <>
      <Header
        title="Mis cultivos"
        subtitle="Seguimiento por lote y etapa del ciclo"
      />
      <main className="page-scroll">
        <CultivosList finca={finca} />
      </main>
    </>
  );
}
