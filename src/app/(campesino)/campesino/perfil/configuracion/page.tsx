import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConfiguracionCampesinoClient } from "@/components/modo-campesino/ConfiguracionCampesinoClient";

export const metadata = { title: "Configuración — GermIA" };
export const dynamic = "force-dynamic";

export default async function ConfiguracionCampesinoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { name: true, telefono: true } });

  return <ConfiguracionCampesinoClient nombreInicial={user?.name ?? ""} telefono={user?.telefono ?? null} />;
}
