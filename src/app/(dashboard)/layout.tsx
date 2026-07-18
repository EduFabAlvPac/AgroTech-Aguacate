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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const finca = await db.finca.findFirst({
    where: { userId: session.user.id },
    select: { nombre: true, municipio: true, areaTotal: true },
  });

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <div className="flex flex-col h-screen">
          <OfflineBanner />
          <div className="app-shell flex-1 min-h-0">
            <Sidebar fincaNombre={finca?.nombre} fincaUbicacion={finca?.municipio} fincaArea={finca?.areaTotal} />
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
