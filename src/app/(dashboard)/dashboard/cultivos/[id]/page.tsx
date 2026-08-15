import { Header } from "@/components/layout/Header";
import { CultivoDetail } from "@/components/cultivos/CultivoDetail";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { resolverModoApp } from "@/lib/modo-app";
import { getCultivoDetalle } from "@/lib/data/cultivos";
import { computeCultivoTimeline } from "@/lib/data/dashboard";
import { CultivoDetalleSimpleClient } from "@/components/modo-simple/CultivoDetalleSimpleClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cultivo = await db.cultivo.findUnique({
    where: { id },
    include: { lote: true },
  });
  return { title: cultivo ? `${cultivo.variedad} · ${cultivo.lote.nombre}` : "Cultivo" };
}

export default async function CultivoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // getCultivoDetalle (lib/data/cultivos.ts) — misma consulta que antes
  // vivía inline aquí, extraída tal cual (Fase 5, ADR-006) para que la
  // rama simple de abajo la reutilice exacta, no una duplicada.
  const cultivo = await getCultivoDetalle(id, session.user.id);
  if (!cultivo) notFound();

  // Fase 5 de ADR-006 — gap #2 del checkpoint ("ver detalle/historial de
  // un cultivo"): confirmado agregar a modo simple, no excluir. Vista de
  // bitácora simplificada (sin las tablas de gastos/ingresos que ya cubre
  // Finanzas) + "Registrar actividad" (gap #1, reutiliza crearRegistro tal
  // cual).
  const modo = await resolverModoApp(session.user.id);
  if (modo === "simple") {
    const timeline = computeCultivoTimeline(cultivo, cultivo.lote.finca.nombre, cultivo.cantidadPlantas ?? 0);
    return <CultivoDetalleSimpleClient cultivo={cultivo as any} timeline={timeline} />;
  }

  return (
    <>
      <Header
        title={`${cultivo.variedad} · ${cultivo.lote.nombre}`}
        subtitle={`${cultivo.lote.finca.nombre} · ${cultivo.lote.areaHa} ha`}
      />
      <main className="page-scroll">
        <CultivoDetail cultivo={cultivo as any} />
      </main>
    </>
  );
}
