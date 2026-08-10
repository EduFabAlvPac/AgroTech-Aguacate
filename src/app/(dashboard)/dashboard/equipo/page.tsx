import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { EquipoClient } from "@/components/equipo/EquipoClient";

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

  const [miembros, fincas] = await Promise.all([
    db.membresia.findMany({
      where: { organizacionId: propia.organizacionId, rol: { not: "OWNER" } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.finca.findMany({ where: { organizacionId: propia.organizacionId }, select: { id: true, nombre: true } }),
  ]);

  const accesos = await db.fincaAcceso.findMany({
    where: { fincaId: { in: fincas.map((f) => f.id) }, userId: { in: miembros.map((m) => m.userId) } },
    select: { userId: true, fincaId: true, rol: true },
  });

  const miembrosConAcceso = miembros.map((m) => ({
    id: m.id,
    nombre: m.user.name,
    email: m.user.email,
    rol: m.rol,
    fincas: accesos
      .filter((a) => a.userId === m.userId)
      .map((a) => ({ fincaId: a.fincaId, nombre: fincas.find((f) => f.id === a.fincaId)?.nombre ?? "?", rol: a.rol })),
  }));

  return (
    <>
      <Header
        title="Equipo"
        subtitle="Colaboradores y administradores con acceso a tus fincas"
      />
      <main className="page-scroll">
        <EquipoClient miembros={miembrosConAcceso} fincas={fincas} />
      </main>
    </>
  );
}
