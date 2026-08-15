import { Header } from "@/components/layout/Header";
import { CultivosList } from "@/components/cultivos/CultivosList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { resolverModoApp } from "@/lib/modo-app";
import { getFincas } from "@/lib/data/fincas";
import { getCultivos, calcularEstadoSalud, type CultivoConDatos } from "@/lib/data/cultivos";
import { computeCultivoTimeline } from "@/lib/data/dashboard";
import { CultivosSimpleClient, type CultivoSimpleItem } from "@/components/modo-simple/CultivosSimpleClient";

export const metadata = { title: "Cultivos" };
export const dynamic = "force-dynamic";

export default async function CultivosPage({
  searchParams,
}: {
  searchParams: Promise<{ finca?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "cultivos")) redirect("/dashboard");

  // Antes filtraba por userId literal (ni siquiera fincaIdsAccesibles) — un
  // ADMIN_FINCA/COLABORADOR no veía nada. Ahora se scopea a la finca activa
  // (funcionalidad de fincas, ver src/lib/finca-activa.ts).
  const { fincaActivaId } = await resolverFincaActiva(session);

  // Fase 3 de ADR-006 — bifurcación real (ver checkpoint). El guard de
  // tieneModulo() de arriba aplica a AMBAS ramas por igual — la preferencia
  // de vista no es un mecanismo de autorización.
  const modo = await resolverModoApp(session.user.id);

  if (modo === "simple") {
    const { finca: fincaParam } = await searchParams;
    const fincas = await getFincas(session);

    // "Todas las fincas" es la vista por defecto de esta pantalla (mockup) —
    // distinto del resto de la app, que siempre trabaja sobre UNA finca
    // activa. Se compone llamando getCultivos (Fase 1) una vez por finca
    // visible, sin agregar ninguna query nueva a lib/data.
    const fincaSeleccionada = fincaParam && fincas.some((f) => f.id === fincaParam) ? fincaParam : "todas";
    const fincasAConsultar = fincaSeleccionada === "todas" ? fincas : fincas.filter((f) => f.id === fincaSeleccionada);

    const resultados = await Promise.all(fincasAConsultar.map((f) => getCultivos(f.id)));

    const items: CultivoSimpleItem[] = [];
    resultados.forEach((fincaConLotes, i) => {
      const fincaNombre = fincasAConsultar[i].nombre;
      fincaConLotes?.lotes.forEach((lote) => {
        lote.cultivos.forEach((cultivo: CultivoConDatos) => {
          const timeline = computeCultivoTimeline(cultivo, fincaNombre, cultivo.cantidadPlantas ?? 0);
          items.push({
            id: cultivo.id,
            especie: cultivo.especie,
            variedad: cultivo.variedad,
            etapa: cultivo.etapa,
            estado: cultivo.estado,
            loteId: cultivo.loteId,
            loteNombre: lote.nombre,
            fincaNombre,
            estadoSalud: calcularEstadoSalud(cultivo),
            fechaCosechaEst: timeline.fechaCosechaEst,
            progreso: timeline.progreso,
            fechaSiembra: cultivo.fechaSiembra,
            cantidadPlantas: cultivo.cantidadPlantas,
          });
        });
      });
    });

    const lotesDisponibles = fincasAConsultar.flatMap((f, i) =>
      (resultados[i]?.lotes ?? []).map((l) => ({ id: l.id, nombre: `${f.nombre} · ${l.nombre}` }))
    );

    return (
      <CultivosSimpleClient
        fincas={fincas}
        fincaSeleccionada={fincaSeleccionada}
        items={items}
        lotesDisponibles={lotesDisponibles}
      />
    );
  }

  const finca = await getCultivos(fincaActivaId);

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
