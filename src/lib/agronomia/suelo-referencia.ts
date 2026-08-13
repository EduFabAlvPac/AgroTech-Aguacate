/**
 * Rangos de referencia agronómica GENERALES para interpretar un análisis de
 * suelo (RF3 — docs/REQUERIMIENTOS.md §1.1). Deliberadamente NO son
 * específicos por cultivo/variedad todavía: ese dato vive en
 * `RequerimientoNutricional` (dosis de fertilización por etapa fenológica de
 * una `FichaTecnica`), que hoy no modela "rango óptimo de suelo" — solo
 * cantidad a aplicar. Mientras el motor de fichas técnicas no cubra ese caso
 * (ver CLAUDE.md §2.2), se usan rangos generales aceptados para cultivos
 * perennes tropicales (aguacate/café/cacao) — la UI debe advertir esto
 * explícitamente, nunca presentarlo como un veredicto específico del cultivo.
 *
 * Fuentes: tablas de interpretación estándar de laboratorios de suelo
 * agropecuarios en Colombia (ICA/Fedearroz-Fedecafé, criterios Bray II para P).
 */

export type NivelReferencia = "BAJO" | "OPTIMO" | "ALTO";

export interface RangoReferencia {
  label: string;
  unidad: string;
  min: number; // inicio del rango óptimo
  max: number; // fin del rango óptimo
}

export const RANGOS_SUELO: Record<string, RangoReferencia> = {
  ph: { label: "pH", unidad: "", min: 5.5, max: 6.5 },
  materiaOrganica: { label: "Materia orgánica", unidad: "%", min: 3, max: 6 },
  nitrogeno: { label: "Nitrógeno (N)", unidad: "%", min: 0.15, max: 0.3 },
  fosforo: { label: "Fósforo (P)", unidad: "ppm", min: 15, max: 30 },
  potasio: { label: "Potasio (K)", unidad: "meq/100g", min: 0.2, max: 0.4 },
  conductividad: { label: "Conductividad eléctrica (CE)", unidad: "dS/m", min: 0, max: 2 },
};

/** Clasifica un valor contra su rango de referencia general. */
export function evaluarNivel(campo: keyof typeof RANGOS_SUELO, valor: number): NivelReferencia {
  const rango = RANGOS_SUELO[campo];
  if (!rango) return "OPTIMO";
  if (valor < rango.min) return "BAJO";
  if (valor > rango.max) return "ALTO";
  return "OPTIMO";
}

export const NIVEL_COLOR: Record<NivelReferencia, { bg: string; text: string; label: string }> = {
  BAJO: { bg: "#FEF3E2", text: "#B7791F", label: "Bajo" },
  OPTIMO: { bg: "#EAF3DE", text: "#3B6D11", label: "Óptimo" },
  ALTO: { bg: "#FDF2F2", text: "#DC2626", label: "Alto" },
};
