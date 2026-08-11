import { Header } from "@/components/layout/Header";
import { CompradoresClient } from "@/components/compradores/CompradoresClient";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { resolverFincaActiva, SIN_FINCA_SENTINEL } from "@/lib/finca-activa";

export const metadata = { title: "Compradores" };
export const dynamic = "force-dynamic";

export default async function CompradoresPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "compradores")) redirect("/dashboard");

  const { fincaActivaId } = await resolverFincaActiva(session);
  const compradores = await db.comprador.findMany({
    where: { fincaId: fincaActivaId ?? SIN_FINCA_SENTINEL },
    include: { _count: { select: { ingresos: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Header
        title="Red de compradores"
        subtitle="Clientes, cooperativas y distribuidores registrados"
      />
      <main className="page-scroll">
        <CompradoresClient compradores={compradores as any} />
      </main>
    </>
  );
}
