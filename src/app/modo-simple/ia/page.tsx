import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getFincas } from "@/lib/data/fincas";
import { getCultivos } from "@/lib/data/cultivos";
import { AsistenteIASimpleClient } from "@/components/modo-simple/AsistenteIASimpleClient";

export const metadata = { title: "Asistente IA — modo simple" };
export const dynamic = "force-dynamic";

// Sin capa de datos propia para el chat: ChatInterface.tsx (modo completo)
// recibe un prop `historial` (ChatMessage[] leído inline en
// dashboard/asistente/page.tsx) que en realidad nunca se usa dentro del
// componente (no inicializa el estado de mensajes) — confirmado leyendo el
// componente completo antes de replicar nada. No se arrastra esa lectura
// muerta aquí.
//
// lotesDisponibles: para la tarjeta "Recomendar cultivo según mi finca"
// (RF3, /api/lotes/[id]/recomendacion — ya implementada, motor real en
// lib/agronomia/recomendacion-cultivo.ts). Misma composición que ya usa
// /modo-simple/cultivos (getFincas + getCultivos por finca), cero query
// nueva a lib/data.
export default async function AsistenteIASimplePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const fincas = await getFincas(session);
  const resultados = await Promise.all(fincas.map((f) => getCultivos(f.id)));
  const lotesDisponibles = fincas.flatMap((f, i) =>
    (resultados[i]?.lotes ?? []).map((l) => ({ id: l.id, nombre: `${f.nombre} · ${l.nombre}` }))
  );

  return <AsistenteIASimpleClient lotesDisponibles={lotesDisponibles} />;
}
