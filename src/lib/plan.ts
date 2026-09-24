/**
 * Plan y trial de una organización — lógica PURA (sin BD), ADR-011 Sprint 6
 * (trial Colectivo: 30 días, máx. 5 asociados; al vencer, modo lectura).
 *
 * El estado se CALCULA de las fechas al leer (`estadoEfectivoOrg`), no depende
 * de que un cron haya alcanzado a cambiar `estadoPlan`: el bloqueo de
 * escritura es robusto aunque el cron falle o se retrase un día. El cron
 * (/api/cron/trial-avisos) solo manda avisos por correo y marca
 * `estadoPlan = SUSPENDIDA_PAGO` para que el Super Admin lo vea.
 */
import type { EstadoPlan } from "@prisma/client";

export const TRIAL_DIAS = 30;
export const TRIAL_MAX_ASOCIADOS = 5;
/** Avisos por correo: días antes del vencimiento; 0 = el día que vence. */
export const AVISOS_TRIAL_DIAS = [7, 3, 1, 0] as const;

const DIA_MS = 24 * 60 * 60 * 1000;

export interface OrgPlanInfo {
  esTrial: boolean;
  trialFinEn: Date | null;
  estadoPlan: EstadoPlan;
  trialMaxAsociados: number | null;
  limiteAsociadosPlan: number | null;
}

export type EstadoEfectivo = "ACTIVA" | "EN_TRIAL" | "TRIAL_VENCIDO" | "SUSPENDIDA";

export function estadoEfectivoOrg(org: OrgPlanInfo, ahora: Date = new Date()): EstadoEfectivo {
  if (org.esTrial) {
    // Sin fecha de fin (dato incompleto) no se bloquea nada: ante la duda, no
    // dejar a una organización sin poder trabajar por un dato faltante.
    return org.trialFinEn && org.trialFinEn.getTime() < ahora.getTime() ? "TRIAL_VENCIDO" : "EN_TRIAL";
  }
  // Organización pagada/individual: solo se bloquea si alguien la suspendió
  // explícitamente. Las organizaciones existentes (estadoPlan ACTIVA, sin
  // trial) no cambian de comportamiento.
  if (org.estadoPlan === "SUSPENDIDA_PAGO" || org.estadoPlan === "CANCELADA") return "SUSPENDIDA";
  return "ACTIVA";
}

/** ¿Puede la organización crear/editar/borrar datos? (los GET nunca se bloquean) */
export function puedeEscribir(org: OrgPlanInfo, ahora: Date = new Date()): boolean {
  const e = estadoEfectivoOrg(org, ahora);
  return e === "ACTIVA" || e === "EN_TRIAL";
}

/** Días completos que le quedan al trial (0 si ya venció); null si no es trial. */
export function diasRestantesTrial(org: OrgPlanInfo, ahora: Date = new Date()): number | null {
  if (!org.esTrial || !org.trialFinEn) return null;
  return Math.max(0, Math.ceil((org.trialFinEn.getTime() - ahora.getTime()) / DIA_MS));
}

/** Tope de asociados: trial → trialMaxAsociados (5 por defecto); plan pago →
 * limiteAsociadosPlan; null = sin límite. */
export function limiteAsociados(org: OrgPlanInfo): number | null {
  if (org.esTrial) return org.trialMaxAsociados ?? TRIAL_MAX_ASOCIADOS;
  return org.limiteAsociadosPlan;
}

export function puedeAgregarAsociado(org: OrgPlanInfo, asociadosActuales: number): boolean {
  const limite = limiteAsociados(org);
  return limite === null || asociadosActuales < limite;
}

export function finDeTrial(desde: Date = new Date()): Date {
  return new Date(desde.getTime() + TRIAL_DIAS * DIA_MS);
}

export const MENSAJE_MODO_LECTURA =
  "Tu prueba terminó — tu organización está en modo lectura. Contacta a GermIA para activar el plan Colectivo.";
export const MENSAJE_LIMITE_ASOCIADOS =
  "Llegaste al límite de asociados de tu prueba. Contacta a GermIA para activar el plan Colectivo y agregar más.";

/**
 * Qué aviso de vencimiento toca enviar hoy, dado cuántos días quedan y cuáles
 * ya se mandaron. Devuelve el umbral a enviar (el más cercano al vencimiento)
 * y todos los umbrales a marcar como enviados — si el cron se saltó un día
 * (ej. quedan 2 días y nunca salió el de 7 ni el de 3), se manda UN solo
 * correo y se marcan ambos, no dos correos seguidos.
 */
export function avisoPendiente(
  diasRestantes: number,
  yaEnviados: number[]
): { enviar: number; marcar: number[] } | null {
  const pendientes = AVISOS_TRIAL_DIAS.filter((t) => diasRestantes <= t && !yaEnviados.includes(t));
  if (pendientes.length === 0) return null;
  return { enviar: Math.min(...pendientes), marcar: [...pendientes] };
}
