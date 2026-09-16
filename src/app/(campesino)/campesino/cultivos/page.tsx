import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCultivosSeleccionados } from "@/lib/data/campesino-cultivos";
import { CultivosCampesinoClient } from "@/components/modo-campesino/CultivosCampesinoClient";

export const metadata = { title: "Mis cultivos — GermIA" };
export const dynamic = "force-dynamic";

export default async function CultivosCampesinoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { seleccionados, cultivos } = await getCultivosSeleccionados(session.user.id);

  return <CultivosCampesinoClient seleccionadosIniciales={seleccionados} cultivosIniciales={cultivos} />;
}
