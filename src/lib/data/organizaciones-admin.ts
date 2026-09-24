/**
 * Capa de datos del panel Super Admin de organizaciones (Colectivo/Cooperativa,
 * PR C) — solo lectura. El chequeo "es Super Admin" vive en la page (redirect)
 * y en las Server Actions (requireSuperAdmin), no acá.
 */
import { db } from "@/lib/db";
import { contarAsociados } from "@/lib/plan-guard";
import { diasRestantesTrial, estadoEfectivoOrg, limiteAsociados, type EstadoEfectivo } from "@/lib/plan";

export interface OrganizacionAdmin {
  id: string;
  nombre: string;
  tipo: string;
  plan: string;
  nit: string | null;
  duenos: string[];
  createdAt: Date;
  esTrial: boolean;
  estado: EstadoEfectivo;
  diasRestantes: number | null;
  trialFinEn: Date | null;
  planVigenteHasta: Date | null;
  asociados: number;
  limiteAsociados: number | null;
  fincas: number;
}

export async function getOrganizacionesAdmin(): Promise<OrganizacionAdmin[]> {
  const orgs = await db.organizacion.findMany({
    where: { eliminadoEn: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, nombre: true, tipo: true, plan: true, nit: true, createdAt: true,
      esTrial: true, trialFinEn: true, estadoPlan: true, trialMaxAsociados: true, limiteAsociadosPlan: true, planVigenteHasta: true,
      membresias: { where: { rol: "OWNER", aceptada: true }, select: { user: { select: { id: true, email: true } } } },
      _count: { select: { fincas: true } },
    },
  });

  return Promise.all(
    orgs.map(async (o) => {
      const duenos = o.membresias.map((m) => m.user);
      return {
        id: o.id,
        nombre: o.nombre,
        tipo: o.tipo,
        plan: o.plan,
        nit: o.nit,
        duenos: duenos.map((d) => d.email),
        createdAt: o.createdAt,
        esTrial: o.esTrial,
        estado: estadoEfectivoOrg(o),
        diasRestantes: diasRestantesTrial(o),
        trialFinEn: o.trialFinEn,
        planVigenteHasta: o.planVigenteHasta,
        asociados: await contarAsociados(o.id, duenos[0]?.id ?? ""),
        limiteAsociados: limiteAsociados(o),
        fincas: o._count.fincas,
      };
    })
  );
}
