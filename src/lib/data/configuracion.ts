/**
 * Capa de datos de Configuración — Fase 1 (ADR-006). Reemplaza las 3
 * queries que vivían inline en configuracion/page.tsx.
 */
import { membresiaOwner } from "@/lib/equipo";
import { db } from "@/lib/db";
import { diasRestantesTrial, estadoEfectivoOrg, limiteAsociados } from "@/lib/plan";
import { contarAsociados } from "@/lib/plan-guard";
import type { VistaPreferida } from "@prisma/client";

export interface ConfiguracionResumen {
  user: {
    name: string | null; email: string; telefono: string | null; vistaPreferida: VistaPreferida;
    // ADR-011 Sprint 6 — pestaña "Seguridad". Se lee fresco de la BD (no de
    // la sesión JWT) porque el JWT queda cacheado hasta el próximo login;
    // así la pestaña refleja el estado real justo después de activar/
    // desactivar MFA en la misma sesión.
    mfaHabilitado: boolean;
  } | null;
  prefs: {
    tempMinAlert: number; tempMaxAlert: number;
    rainAlertMm: number; windAlertKmh: number;
    droughtDays: number; emailAlerts: boolean; pushAlerts: boolean;
  } | null;
}

// Ya no devuelve una sola "finca activa" (hallazgo del usuario, 2026-09-21:
// la pestaña "Finca" pasó de editar una implícita a listar/crear/editar/
// eliminar todas — ver FincasTab.tsx, que recibe la lista completa vía
// getFincas() de src/lib/data/fincas.ts, la misma que ya usaba "Mis fincas").
export async function getConfiguracionResumen(userId: string): Promise<ConfiguracionResumen> {
  const [user, prefs] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, telefono: true, vistaPreferida: true, mfaHabilitado: true },
    }),
    db.userPreferences.findUnique({ where: { userId } }),
  ]);

  return { user, prefs };
}

export interface OrganizacionResumen {
  id: string;
  nombre: string;
  tipo: string;
  plan: string;
  nit: string | null;
  ciudad: string | null;
  departamento: string | null;
  emailContacto: string | null;
  celularContacto: string | null;
}

/**
 * Datos de la Organización para la pestaña "Organización" de Configuración
 * (ADR-011 Sprint 3) — solo si `userId` es OWNER (re-chequeo fresco contra
 * BD, no solo el `esOwner` del JWT, mismo patrón que la página de Equipo).
 * null para cualquier otro rol: la pestaña ni siquiera se muestra.
 */
export async function getOrganizacionPropia(userId: string): Promise<OrganizacionResumen | null> {
  // Organización ACTIVA (multi-organización) — null si en ese contexto no es dueño.
  const propia = await membresiaOwner(userId);
  if (!propia) return null;
  return db.organizacion.findUnique({
    where: { id: propia.organizacionId },
    select: {
      id: true, nombre: true, tipo: true, plan: true,
      nit: true, ciudad: true, departamento: true, emailContacto: true, celularContacto: true,
    },
  });
}

export interface PlanResumen {
  esTrial: boolean;
  /** Días completos que le quedan al trial; null si no es trial. */
  diasRestantes: number | null;
  vencido: boolean;
  asociados: number;
  /** null = sin límite. */
  limiteAsociados: number | null;
}

/** Estado de plan/trial de la organización ACTIVA del dueño (para la pestaña
 * Organización). null si no es dueño en el contexto activo. */
export async function getPlanOrganizacion(userId: string): Promise<PlanResumen | null> {
  const propia = await membresiaOwner(userId);
  if (!propia) return null;
  const org = await db.organizacion.findUnique({
    where: { id: propia.organizacionId },
    select: { esTrial: true, trialFinEn: true, estadoPlan: true, trialMaxAsociados: true, limiteAsociadosPlan: true },
  });
  if (!org) return null;
  return {
    esTrial: org.esTrial,
    diasRestantes: diasRestantesTrial(org),
    vencido: estadoEfectivoOrg(org) === "TRIAL_VENCIDO",
    asociados: await contarAsociados(propia.organizacionId, userId),
    limiteAsociados: limiteAsociados(org),
  };
}
