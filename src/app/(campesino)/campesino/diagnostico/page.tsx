import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { esEspecieCampesinoValida } from "@/lib/campesino-especies";
import { DiagnosticoCampesinoClient } from "@/components/modo-campesino/DiagnosticoCampesinoClient";

export const metadata = { title: "Salud del cultivo — GermIA" };
export const dynamic = "force-dynamic";

// ?especie=<slug> — atajo desde /campesino/cultivos ("Revisar salud" de un
// cultivo puntual). Se lee acá (server component) y se pasa como prop en
// vez de usar useSearchParams en el cliente, para no forzar un boundary de
// Suspense nuevo en esta ruta.
export default async function DiagnosticoCampesinoPage({
  searchParams,
}: {
  searchParams: Promise<{ especie?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { especie } = await searchParams;

  // Si el usuario ya eligió cultivos en /campesino/cultivos, Diagnóstico
  // arranca mostrando solo esos (menos que escoger) — pero nunca lo deja
  // sin opciones: sin selección todavía, se ven las 4 (comportamiento
  // anterior). El propio cliente ofrece "Ver los demás cultivos" para no
  // encerrar a alguien que necesita revisar algo fuera de lo suyo.
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { cultivosSeleccionados: true } });
  const especiesSeleccionadas = (user?.cultivosSeleccionados ?? []).filter(esEspecieCampesinoValida);

  return <DiagnosticoCampesinoClient especieInicial={especie} especiesSeleccionadas={especiesSeleccionadas} />;
}
