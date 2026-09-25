/**
 * Capa de datos del panel Super Admin de organizaciones — solo lectura. El
 * chequeo "es Super Admin" vive en la page (redirect) y en las Server Actions
 * (requireSuperAdmin), no acá.
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
  eliminadaEn: Date | null;
  diasRestantes: number | null;
  trialFinEn: Date | null;
  planVigenteHasta: Date | null;
  asociados: number;
  limiteAsociados: number | null;
  fincas: number;
}

const SELECT_LISTA = {
  id: true, nombre: true, tipo: true, plan: true, nit: true, createdAt: true, eliminadoEn: true,
  esTrial: true, trialFinEn: true, estadoPlan: true, trialMaxAsociados: true, limiteAsociadosPlan: true, planVigenteHasta: true,
  membresias: { where: { rol: "OWNER" as const, aceptada: true }, select: { user: { select: { id: true, email: true } } } },
  _count: { select: { fincas: true } },
};

/** Incluye las eliminadas (soft-delete) para que el Super Admin pueda restaurarlas. */
export async function getOrganizacionesAdmin(): Promise<OrganizacionAdmin[]> {
  const orgs = await db.organizacion.findMany({ orderBy: { createdAt: "desc" }, select: SELECT_LISTA });

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
        eliminadaEn: o.eliminadoEn,
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

export interface OrganizacionDetalle extends OrganizacionAdmin {
  ciudad: string | null;
  departamento: string | null;
  emailContacto: string | null;
  celularContacto: string | null;
  suspension: { motivo: string; en: string } | null;
  miembros: { membresiaId: string; userId: string; email: string; nombre: string | null; rol: string; activa: boolean; esSuperAdmin: boolean }[];
  fincasDetalle: { id: string; nombre: string; municipio: string; lotes: number }[];
  auditoria: { id: string; createdAt: Date; actorEmail: string | null; accion: string }[];
}

export async function getOrganizacionDetalle(id: string): Promise<OrganizacionDetalle | null> {
  const o = await db.organizacion.findUnique({
    where: { id },
    select: {
      ...SELECT_LISTA,
      ciudad: true, departamento: true, emailContacto: true, celularContacto: true, configuracion: true,
      membresias: {
        orderBy: { createdAt: "asc" },
        select: { id: true, rol: true, activa: true, aceptada: true, user: { select: { id: true, email: true, name: true, esSuperAdmin: true } } },
      },
      fincas: { orderBy: { createdAt: "asc" }, select: { id: true, nombre: true, municipio: true, _count: { select: { lotes: true } } } },
    },
  });
  if (!o) return null;

  const duenos = o.membresias.filter((m) => m.rol === "OWNER" && m.aceptada).map((m) => m.user);
  const cfg = (o.configuracion && typeof o.configuracion === "object" ? o.configuracion : {}) as Record<string, any>;
  const auditoria = await db.auditLog.findMany({
    where: { organizacionId: id },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { id: true, createdAt: true, actorEmail: true, accion: true },
  });

  return {
    id: o.id, nombre: o.nombre, tipo: o.tipo, plan: o.plan, nit: o.nit,
    duenos: duenos.map((d) => d.email), createdAt: o.createdAt,
    esTrial: o.esTrial, estado: estadoEfectivoOrg(o), eliminadaEn: o.eliminadoEn,
    diasRestantes: diasRestantesTrial(o), trialFinEn: o.trialFinEn, planVigenteHasta: o.planVigenteHasta,
    asociados: await contarAsociados(o.id, duenos[0]?.id ?? ""),
    limiteAsociados: limiteAsociados(o), fincas: o.fincas.length,
    ciudad: o.ciudad, departamento: o.departamento, emailContacto: o.emailContacto, celularContacto: o.celularContacto,
    suspension: cfg.suspension ?? null,
    miembros: o.membresias.map((m) => ({
      membresiaId: m.id, userId: m.user.id, email: m.user.email, nombre: m.user.name, rol: m.rol, activa: m.activa, esSuperAdmin: m.user.esSuperAdmin,
    })),
    fincasDetalle: o.fincas.map((f) => ({ id: f.id, nombre: f.nombre, municipio: f.municipio, lotes: f._count.lotes })),
    auditoria,
  };
}
