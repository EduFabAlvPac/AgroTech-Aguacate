import { Header } from "@/components/layout/Header";
import { ChatInterface } from "@/components/asistente/ChatInterface";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { resolverModoApp } from "@/lib/modo-app";
import { getFincas } from "@/lib/data/fincas";
import { getCultivos } from "@/lib/data/cultivos";
import { AsistenteIASimpleClient } from "@/components/modo-simple/AsistenteIASimpleClient";

export const metadata = { title: "Asistente IA" };

export default async function AsistentePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "asistente")) redirect("/dashboard");

  // Fase 3 de ADR-006 — bifurcación real (ver checkpoint).
  const modo = await resolverModoApp(session.user.id);

  if (modo === "simple") {
    // Sin capa de datos propia para el chat: ChatInterface.tsx (modo
    // completo) recibe un prop `historial` que en realidad nunca se usa
    // dentro del componente (no inicializa el estado de mensajes) —
    // confirmado leyendo el componente completo antes de replicar nada, no
    // se arrastra esa lectura muerta aquí.
    //
    // lotesDisponibles: para la tarjeta "Recomendar cultivo según mi
    // finca" (RF3, /api/lotes/[id]/recomendacion). Misma composición que
    // ya usa Cultivos (getFincas + getCultivos por finca), cero query
    // nueva a lib/data.
    const fincas = await getFincas(session);
    const resultados = await Promise.all(fincas.map((f) => getCultivos(f.id)));
    const lotesDisponibles = fincas.flatMap((f, i) =>
      (resultados[i]?.lotes ?? []).map((l) => ({ id: l.id, nombre: `${f.nombre} · ${l.nombre}` }))
    );

    return <AsistenteIASimpleClient lotesDisponibles={lotesDisponibles} />;
  }

  const params = await searchParams;

  const historial = await db.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <>
      <Header
        title="Asistente AgroIA"
        subtitle="Aguacate, café y cacao · Norte de Santander"
      />
      <div className="flex-1 overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
        <ChatInterface
          historial={historial.reverse() as any}
          initialQuery={params.q}
        />
      </div>
    </>
  );
}
