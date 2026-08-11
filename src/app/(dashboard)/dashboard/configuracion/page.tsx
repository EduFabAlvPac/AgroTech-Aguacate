import { Header } from "@/components/layout/Header";
import { ConfigClient } from "@/components/configuracion/ConfigClient";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolverFincaActiva } from "@/lib/finca-activa";

export const metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { fincaActivaId } = await resolverFincaActiva(session);
  const [user, prefs, finca] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, telefono: true },
    }),
    db.userPreferences.findUnique({ where: { userId: session.user.id } }),
    fincaActivaId
      ? db.finca.findUnique({
          where: { id: fincaActivaId },
          select: { nombre: true, municipio: true, departamento: true, lat: true, lng: true, areaTotal: true },
        })
      : null,
  ]);

  return (
    <>
      <Header
        title="Configuración"
        subtitle="Perfil, finca y preferencias de alertas"
      />
      <main className="page-scroll">
        <ConfigClient user={user as any} prefs={prefs as any} finca={finca as any} />
      </main>
    </>
  );
}
