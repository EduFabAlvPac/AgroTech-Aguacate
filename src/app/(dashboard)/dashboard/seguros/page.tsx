import { Header } from "@/components/layout/Header";
import { SegurosClient } from "@/components/seguros/SegurosClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";
import { getContextoUsuario } from "@/lib/organizacion-activa";
import { resolverFincaActiva, SIN_FINCA_SENTINEL } from "@/lib/finca-activa";
import { getSegurosResumen } from "@/lib/data/seguros";
import { puedeEnFinca } from "@/lib/authz";
import { db } from "@/lib/db";

export const metadata = { title: "Seguros" };
export const dynamic = "force-dynamic";

type SP = Promise<{ accion?: string; cultivoId?: string; tipo?: string; fecha?: string }>;

export default async function SegurosPage({ searchParams }: { searchParams: SP }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const ctx = await getContextoUsuario(session.user.id, !!session.user.esSuperAdmin);
  if (!tieneModulo(ctx.modulosPermitidos, "seguros")) redirect("/dashboard");

  const { fincaActivaId } = await resolverFincaActiva(session);
  const resumen = await getSegurosResumen(fincaActivaId, SIN_FINCA_SENTINEL);
  const sp = await searchParams;

  // Qué botones mostrar según el rol en ESTA finca (el servidor vuelve a decidir al ejecutar cada acción).
  const [puedeGestionarPolizas, puedeReportarSiniestro, puedeEliminar] = fincaActivaId
    ? await Promise.all([
        puedeEnFinca(session, "seguro", "update", fincaActivaId),
        puedeEnFinca(session, "siniestro", "create", fincaActivaId),
        puedeEnFinca(session, "seguro", "delete", fincaActivaId),
      ])
    : [false, false, false];

  const fincaNombre = fincaActivaId ? (await db.finca.findUnique({ where: { id: fincaActivaId }, select: { nombre: true } }))?.nombre : undefined;
  const ahora = new Date();
  const accion = sp.accion === "poliza" || sp.accion === "siniestro" ? sp.accion : undefined;

  return (
    <>
      <Header title="Seguros" subtitle="Pólizas de tus cultivos y siniestros con su expediente" />
      <main className="page-scroll">
        <SegurosClient
          resumen={resumen}
          ahoraISO={ahora.toISOString()}
          fincaNombre={fincaNombre}
          hoy={ahora.toLocaleDateString("en-CA", { timeZone: "America/Bogota" })}
          puedeGestionarPolizas={puedeGestionarPolizas}
          puedeReportarSiniestro={puedeReportarSiniestro}
          puedeEliminar={puedeEliminar}
          prefill={{ accion, cultivoId: sp.cultivoId ?? null, tipo: sp.tipo ?? null, fecha: /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha ?? "") ? sp.fecha : null }}
        />
      </main>
    </>
  );
}
