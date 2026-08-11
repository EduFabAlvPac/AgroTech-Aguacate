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
import { resolverFincaActiva } from "@/lib/finca-activa";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { fincaIds, fincaActivaId } = await resolverFincaActiva(session);
  const fincas = await db.finca.findMany({
    where: fincaIds === "ALL" ? undefined : { id: { in: fincaIds } },
    select: { id: true, nombre: true, municipio: true, departamento: true, areaTotal: true },
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
