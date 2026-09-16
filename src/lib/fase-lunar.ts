/**
 * Fase lunar — cálculo astronómico puro (ciclo sinódico ~29.53 días desde
 * una luna nueva de referencia conocida), sin API ni librería externa
 * (coherente con el presupuesto del proyecto, ~$12-15 USD/mes). 0% de esto
 * existía antes (confirmado por grep en la exploración del plan).
 *
 * Referencia: luna nueva del 2000-01-06 18:14 UTC — epoch estándar usado en
 * cálculos de fase lunar simplificados.
 */
const SINODICO_DIAS = 29.530588853;
const REF_LUNA_NUEVA_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

export type NombreFaseLunar =
  | "LUNA_NUEVA"
  | "CRECIENTE"
  | "CUARTO_CRECIENTE"
  | "GIBOSA_CRECIENTE"
  | "LUNA_LLENA"
  | "GIBOSA_MENGUANTE"
  | "CUARTO_MENGUANTE"
  | "MENGUANTE";

export interface FaseLunar {
  nombre: NombreFaseLunar;
  label: string;
  emoji: string;
  edadDias: number; // días transcurridos desde la última luna nueva (0-29.5)
}

const FASES: { hastaEdadDias: number; nombre: NombreFaseLunar; label: string; emoji: string }[] = [
  { hastaEdadDias: 1.84566, nombre: "LUNA_NUEVA", label: "Luna nueva", emoji: "🌑" },
  { hastaEdadDias: 5.53699, nombre: "CRECIENTE", label: "Luna creciente", emoji: "🌒" },
  { hastaEdadDias: 9.22831, nombre: "CUARTO_CRECIENTE", label: "Cuarto creciente", emoji: "🌓" },
  { hastaEdadDias: 12.91963, nombre: "GIBOSA_CRECIENTE", label: "Luna gibosa creciente", emoji: "🌔" },
  { hastaEdadDias: 16.61096, nombre: "LUNA_LLENA", label: "Luna llena", emoji: "🌕" },
  { hastaEdadDias: 20.30228, nombre: "GIBOSA_MENGUANTE", label: "Luna gibosa menguante", emoji: "🌖" },
  { hastaEdadDias: 23.99361, nombre: "CUARTO_MENGUANTE", label: "Cuarto menguante", emoji: "🌗" },
  { hastaEdadDias: 27.68493, nombre: "MENGUANTE", label: "Luna menguante", emoji: "🌘" },
  { hastaEdadDias: SINODICO_DIAS, nombre: "LUNA_NUEVA", label: "Luna nueva", emoji: "🌑" },
];

export function calcularFaseLunar(fecha: Date = new Date()): FaseLunar {
  const diasDesdeRef = (fecha.getTime() - REF_LUNA_NUEVA_MS) / 86_400_000;
  const edadDias = ((diasDesdeRef % SINODICO_DIAS) + SINODICO_DIAS) % SINODICO_DIAS;

  const fase = FASES.find((f) => edadDias < f.hastaEdadDias) ?? FASES[FASES.length - 1];
  return { nombre: fase.nombre, label: fase.label, emoji: fase.emoji, edadDias };
}
