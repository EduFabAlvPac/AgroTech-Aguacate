/**
 * Seguros agrícolas — reglas puras (sin BD). GermIA NO vende ni intermedia
 * seguros: el productor registra la póliza que contrató y la asocia a sus
 * cultivos; cuando ocurre un evento registra el siniestro y arma el expediente.
 */
import type { TipoAlerta, RiesgoAsegurado } from "@prisma/client";

export const DIAS_AVISO_VENCIMIENTO = 30;
const DIA_MS = 86_400_000;

export type VigenciaPoliza = "VIGENTE" | "POR_VENCER" | "VENCIDA" | "CANCELADA" | "NO_INICIADA";

export interface PolizaBasica {
  estado: "ACTIVA" | "CANCELADA";
  fechaInicio: Date;
  fechaFin: Date;
  riesgos: RiesgoAsegurado[];
  cultivoIds: string[];
}

/** Estado "efectivo" de una póliza, calculado de las fechas (no depende de un cron). */
export function vigenciaPoliza(p: Pick<PolizaBasica, "estado" | "fechaInicio" | "fechaFin">, ahora = new Date()): VigenciaPoliza {
  if (p.estado === "CANCELADA") return "CANCELADA";
  if (ahora < p.fechaInicio) return "NO_INICIADA";
  if (ahora > p.fechaFin) return "VENCIDA";
  return diasParaVencer(p.fechaFin, ahora) <= DIAS_AVISO_VENCIMIENTO ? "POR_VENCER" : "VIGENTE";
}

/** Días completos que faltan (0 = vence hoy; negativo = ya venció). */
export function diasParaVencer(fechaFin: Date, ahora = new Date()): number {
  return Math.ceil((fechaFin.getTime() - ahora.getTime()) / DIA_MS);
}

/**
 * ¿La póliza respondería por un siniestro de este cultivo, de este tipo, en
 * esta fecha? Lo que importa es la vigencia EN LA FECHA DEL EVENTO (se puede
 * registrar un siniestro días después de ocurrido, incluso con la póliza ya vencida).
 */
export function polizaCubre(p: PolizaBasica, cultivoId: string, riesgo: RiesgoAsegurado, fechaEvento: Date): boolean {
  if (p.estado === "CANCELADA") return false;
  if (fechaEvento < p.fechaInicio || fechaEvento > p.fechaFin) return false;
  if (!p.cultivoIds.includes(cultivoId)) return false;
  return p.riesgos.includes(riesgo);
}

/** Tipo de alerta climática → riesgo asegurable (null si no es asegurable, ej. ACTIVIDAD). */
export function riesgoDesdeAlerta(tipo: TipoAlerta): RiesgoAsegurado | null {
  switch (tipo) {
    case "LLUVIA_EXCESIVA": return "EXCESO_LLUVIA";
    case "SEQUIA": return "SEQUIA";
    case "HELADA": return "HELADA";
    case "GRANIZO": return "GRANIZO";
    case "VIENTO_FUERTE": return "VIENTOS_FUERTES";
    case "PLAGA": return "PLAGAS_ENFERMEDADES";
    default: return null;
  }
}

/** Alertas climáticas que sirven de evidencia para un siniestro: mismo tipo y cercanas a la fecha del evento. */
export const VENTANA_EVIDENCIA_DIAS = 7;

export function ventanaEvidencia(fechaEvento: Date): { desde: Date; hasta: Date } {
  return {
    desde: new Date(fechaEvento.getTime() - VENTANA_EVIDENCIA_DIAS * DIA_MS),
    hasta: new Date(fechaEvento.getTime() + VENTANA_EVIDENCIA_DIAS * DIA_MS),
  };
}

/** Pérdida estimada por defecto cuando el productor no la escribe: suma asegurada × % de daño. */
export function perdidaSugerida(sumaAsegurada: number | null | undefined, porcentajeDanio: number | null | undefined): number | null {
  if (!sumaAsegurada || porcentajeDanio == null) return null;
  return Math.round((sumaAsegurada * porcentajeDanio) / 100);
}
