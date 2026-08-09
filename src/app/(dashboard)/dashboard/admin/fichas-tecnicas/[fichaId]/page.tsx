import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { FichaTecnicaEditor } from "@/components/admin/FichaTecnicaEditor";

export const metadata = { title: "Editar ficha técnica — Admin" };
export const dynamic = "force-dynamic";

export default async function FichaTecnicaEditorPage({
  params,
}: {
  params: Promise<{ fichaId: string }>;
}) {
  const { fichaId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { esSuperAdmin: true } });
  if (!user?.esSuperAdmin) redirect("/dashboard");

  const ficha = await db.fichaTecnica.findUnique({
    where: { id: fichaId },
    include: {
      variedad: { include: { especie: true } },
      etapas: { orderBy: { orden: "asc" } },
      plagas: { orderBy: { nombre: "asc" } },
      costosRef: { orderBy: { categoria: "asc" } },
      curvaProduccion: { orderBy: { anioProduccion: "asc" } },
      _count: { select: { cultivos: true } },
    },
  });

  if (!ficha) notFound();

  return (
    <>
      <Header
        title={`${ficha.variedad.especie.nombre} · v${ficha.version}`}
        subtitle="Ficha técnica — motor multi-cultivo"
      />
      <main className="page-scroll">
        <FichaTecnicaEditor ficha={ficha} />
      </main>
    </>
  );
}
