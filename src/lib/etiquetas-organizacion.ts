/**
 * Etiquetas de organización en UN solo lugar (antes había 3 copias, y el panel
 * de administración solo conocía 2 de los 10 tipos: un GREMIO se veía como
 * "GREMIO" y una asociación como "ASOCIACION_CAMPESINA").
 */
import type { EstadoEfectivo } from "@/lib/plan";

export const TIPO_ORG_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual",
  COOPERATIVA: "Cooperativa",
  GREMIO: "Gremio",
  ASOCIACION_CAMPESINA: "Asociación campesina",
  FUNDACION: "Fundación",
  GOBIERNO: "Gobierno",
  UNIVERSIDAD: "Universidad",
  ONG: "ONG",
  EMPRESA_PRIVADA: "Empresa privada",
  CRECIAGRO_INTERNAL: "CrecIAgro (interno)",
};

export const ESTADO_ORG_UI: Record<EstadoEfectivo, { label: string; clase: string }> = {
  ACTIVA: { label: "Activa", clase: "bg-agro-50 text-agro-600 border-agro-100" },
  EN_TRIAL: { label: "En prueba", clase: "bg-amber-50 text-amber-700 border-amber-100" },
  TRIAL_VENCIDO: { label: "Prueba vencida", clase: "bg-red-50 text-red-700 border-red-100" },
  SUSPENDIDA: { label: "Suspendida", clase: "bg-red-50 text-red-700 border-red-100" },
};
