import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarOverlay } from "@/components/layout/SidebarOverlay";
import { DashboardContent } from "@/components/layout/DashboardContent";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { SidebarProvider } from "@/components/providers/SidebarProvider";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { MobileFAB } from "@/components/ui/MobileFAB";
import { resolverFincaActiva, SIN_FINCA_SENTINEL } from "@/lib/finca-activa";
import { resolverModoApp, estaEnVisitaCompletaPuntual, anchoEsMovil } from "@/lib/modo-app";
import { getAlertas } from "@/lib/data/alertas";
import { ModoSimpleShell } from "@/components/modo-simple/ModoSimpleShell";
import { VolverModoSimple } from "@/components/shared/VolverModoSimple";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { fincaIds, fincaActivaId } = await resolverFincaActiva(session);

  // Fase 3 de ADR-006 — decisión aprobada explícitamente con el usuario:
  // el envoltorio (sidebar de escritorio vs. header+nav inferior móvil) se
  // decide una sola vez para TODO /dashboard/*, sin importar la ruta.
  // Alternativa evaluada y descartada (agregar middleware.ts para que el
  // layout supiera la ruta actual y bifurcar el envoltorio solo en las 6
  // rutas con versión modo simple real) — más robusta pero más pieza de
  // infraestructura nueva de la que el usuario prefirió prescindir. Costo
  // aceptado: las rutas sin versión modo simple (Mapa, Alertas,
  // Compradores, Equipo, Fichas técnicas, Inversionistas, Admin) se ven
  // sin cambios por dentro pero dentro del marco angosto tipo teléfono
  // cuando la preferencia resuelve a "simple".
  const modo = await resolverModoApp(session.user.id);

  if (modo === "simple") {
    const nombre = session.user.name ?? session.user.email ?? "Usuario";
    const inicial = nombre.trim().charAt(0).toUpperCase();
    const alertas = await getAlertas(fincaActivaId, SIN_FINCA_SENTINEL);

    // Bug real encontrado en producción (hallazgo del usuario, 2026-08-15):
    // las rutas sin versión modo simple (Mapa, Alertas, Compradores...)
    // asumían "se ven sin cambios por dentro" (comentario original más
    // abajo), pero su <Header> llama a useSidebar() incondicionalmente —
    // sin este SidebarProvider, cualquier navegación DIRECTA (no vía
    // SalidaModoCompleto: back/forward del navegador, refrescar una
    // pestaña vieja, un bookmark) a una de esas rutas mientras el modo
    // resuelve a "simple" tiraba "useSidebar must be used within a
    // SidebarProvider" y rompía la página por completo. SidebarProvider es
    // solo contexto de React (colapsado/abierto) — inofensivo montarlo acá
    // aunque ModoSimpleShell no lo consuma.
    return (
      <SessionProvider session={session}>
        <SidebarProvider>
          <ModoSimpleShell nombre={nombre} inicial={inicial} alertas={alertas}>
            {children}
          </ModoSimpleShell>
        </SidebarProvider>
      </SessionProvider>
    );
  }

  // Fase 5 de ADR-006 — banner "volver a modo simple" solo cuando llegó
  // acá vía SalidaModoCompleto (visita puntual), no cuando su preferencia
  // real ya es Completa. Se muestra sin importar a qué pantalla de modo
  // completo haya navegado, porque vive en el layout compartido, no en
  // una pantalla puntual.
  const visitaPuntual = await estaEnVisitaCompletaPuntual();

  // Bug real reportado por el usuario en producción (2026-08-15): el
  // <Sidebar> completo, montado como drawer superpuesto sobre un viewport
  // de teléfono (su único ancho posible durante una visita puntual — se
  // llega desde una pantalla de modo simple), quedaba "atascado": solo se
  // cerraba tocando fuera del drawer, un gesto que nada en la UI enseña, y
  // encima el propio <Header> de la página de destino queda semi-tapado
  // por el banner "volver a modo simple". No es un caso hipotético — es
  // justo la ruta que un productor real usa para dibujar un lote.
  //
  // Fix: durante una visita puntual EN CELULAR (no en escritorio — ahí el
  // Sidebar completo sigue siendo la experiencia correcta) se monta un
  // envoltorio mínimo sin <Sidebar>/<SidebarOverlay>: banner + contenido a
  // ancho completo. Fuera de la visita puntual (preferencia COMPLETA
  // explícita, o AUTO resolviendo a completa) nada cambia — es la elección
  // informada de alguien que sí quiere el modo denso, incluso en celular.
  if (visitaPuntual && (await anchoEsMovil())) {
    return (
      <SessionProvider session={session}>
        <SidebarProvider sidebarDisponible={false}>
          <div className="flex flex-col h-screen">
            <VolverModoSimple />
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
            <MobileFAB />
          </div>
        </SidebarProvider>
      </SessionProvider>
    );
  }

  const fincas = await db.finca.findMany({
    where: fincaIds === "ALL" ? undefined : { id: { in: fincaIds } },
    select: { id: true, nombre: true, municipio: true, departamento: true, areaTotal: true, lat: true, lng: true, altitud: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <div className="flex flex-col h-screen">
          <OfflineBanner />
          {visitaPuntual && <VolverModoSimple />}
          <div className="app-shell flex-1 min-h-0">
            <Sidebar fincas={fincas} fincaActivaId={fincaActivaId} />
            {/* Overlay closes sidebar when tapping outside on mobile */}
            <SidebarOverlay />
            <DashboardContent>{children}</DashboardContent>
          </div>
          {/* FAB — visible only on mobile, renders its own modals */}
          <MobileFAB />
        </div>
      </SidebarProvider>
    </SessionProvider>
  );
}
