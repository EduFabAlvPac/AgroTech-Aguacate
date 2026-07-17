import { Header } from "@/components/layout/Header";
import { ConfigClient } from "@/components/configuracion/ConfigClient";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [user, prefs, finca] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, telefono: true },
    }),
    db.userPreferences.findUnique({ where: { userId: session.user.id } }),
    db.finca.findFirst({
      where: { userId: session.user.id },
      select: { nombre: true, municipio: true, departamento: true, lat: true, lng: true, areaTotal: true },
    }),
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
