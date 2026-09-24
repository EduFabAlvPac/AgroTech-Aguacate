import { membresiaOwner } from "@/lib/equipo";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { EquipoClient } from "@/components/equipo/EquipoClient";
import { getEquipoResumen } from "@/lib/data/equipo";
import { getAuditoriaOrganizacion } from "@/lib/data/auditoria";

export const metadata = { title: "Equipo" };
export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Chequeo fresco contra BD (no solo el JWT) — mismo patrón que el panel
  // Super Admin.
  const propia = await membresiaOwner(session.user.id);
  if (!propia) redirect("/dashboard");

  const [{ miembros, fincas, plantillas, cuentasCampesino }, auditoria] = await Promise.all([
    getEquipoResumen(propia.organizacionId, session.user.id),
    getAuditoriaOrganizacion(propia.organizacionId),
  ]);

  return (
    <>
      <Header
        title="Equipo"
        subtitle="Colaboradores y administradores con acceso a tus fincas"
      />
      <main className="page-scroll">
        <EquipoClient
          miembros={miembros}
          fincas={fincas}
          plantillasIniciales={plantillas}
          cuentasCampesinoIniciales={cuentasCampesino}
          auditoria={auditoria}
        />
      </main>
    </>
  );
}
