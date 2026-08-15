import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getFincas } from "@/lib/data/fincas";
import { getCultivos, calcularEstadoSalud, type CultivoConDatos } from "@/lib/data/cultivos";
import { computeCultivoTimeline } from "@/lib/data/dashboard";
import { CultivosSimpleClient, type CultivoSimpleItem } from "@/components/modo-simple/CultivosSimpleClient";

export const metadata = { title: "Cultivos — modo simple" };
export const dynamic = "force-dynamic";

export default async function CultivosSimplePage({
  searchParams,
}: {
  searchParams: Promise<{ finca?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

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
