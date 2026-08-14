import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { EquipoClient } from "@/components/equipo/EquipoClient";
import { getEquipoResumen } from "@/lib/data/equipo";

export const metadata = { title: "Equipo" };
export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Chequeo fresco contra BD (no solo el JWT) — mismo patrón que el panel
  // Super Admin.
  const propia = await db.membresia.findFirst({
    where: { userId: session.user.id, rol: "OWNER", aceptada: true },
    select: { organizacionId: true },
  });
  if (!propia) redirect("/dashboard");

  const { miembros, fincas, plantillas } = await getEquipoResumen(propia.organizacionId);

  return (
    <>
      <Header
        title="Equipo"
        subtitle="Colaboradores y administradores con acceso a tus fincas"
      />
      <main className="page-scroll">
        <EquipoClient miembros={miembros} fincas={fincas} plantillasIniciales={plantillas} />
      </main>
    </>
  );
}
