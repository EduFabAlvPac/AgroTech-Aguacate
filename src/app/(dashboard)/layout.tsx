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
import { resolverModoApp } from "@/lib/modo-app";
import { getAlertas } from "@/lib/data/alertas";
import { ModoSimpleShell } from "@/components/modo-simple/ModoSimpleShell";

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

    return (
      <SessionProvider session={session}>
        <ModoSimpleShell nombre={nombre} inicial={inicial} alertas={alertas}>
          {children}
        </ModoSimpleShell>
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
