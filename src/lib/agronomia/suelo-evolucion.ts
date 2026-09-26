/**
 * Evolución del suelo a lo largo del ciclo de un cultivo — reglas puras, sin
 * BD. Solo aritmética sobre lo que el productor registró: NO emite veredictos
 * agronómicos para parámetros sin referencia validada (los semáforos siguen
 * siendo únicamente los de `suelo-referencia.ts`).
 */

export interface ParametroSuelo {
  key: string;
  label: string;
  unidad: string;
  decimales: number;
  /** ¿Tiene semáforo Bajo/Óptimo/Alto en `suelo-referencia.ts`? */
  conReferencia: boolean;
}

/** Orden en que se muestran (los seis originales primero). */
export const PARAMETROS_SUELO: ParametroSuelo[] = [
  { key: "ph", label: "pH", unidad: "", decimales: 2, conReferencia: true },
  { key: "materiaOrganica", label: "Materia orgánica", unidad: "%", decimales: 2, conReferencia: true },
  { key: "nitrogeno", label: "Nitrógeno (N)", unidad: "%", decimales: 2, conReferencia: true },
  { key: "fosforo", label: "Fósforo (P)", unidad: "ppm", decimales: 1, conReferencia: true },
  { key: "potasio", label: "Potasio (K)", unidad: "meq/100g", decimales: 2, conReferencia: true },
  { key: "conductividad", label: "Conductividad (CE)", unidad: "dS/m", decimales: 2, conReferencia: true },
  { key: "calcio", label: "Calcio (Ca)", unidad: "meq/100g", decimales: 2, conReferencia: false },
  { key: "magnesio", label: "Magnesio (Mg)", unidad: "meq/100g", decimales: 2, conReferencia: false },
  { key: "sodio", label: "Sodio (Na)", unidad: "meq/100g", decimales: 2, conReferencia: false },
  { key: "aluminio", label: "Aluminio (Al)", unidad: "meq/100g", decimales: 2, conReferencia: false },
  { key: "cic", label: "CIC", unidad: "meq/100g", decimales: 1, conReferencia: false },
  { key: "azufre", label: "Azufre (S)", unidad: "ppm", decimales: 1, conReferencia: false },
  { key: "boro", label: "Boro (B)", unidad: "ppm", decimales: 2, conReferencia: false },
  { key: "hierro", label: "Hierro (Fe)", unidad: "ppm", decimales: 1, conReferencia: false },
  { key: "manganeso", label: "Manganeso (Mn)", unidad: "ppm", decimales: 1, conReferencia: false },
  { key: "zinc", label: "Zinc (Zn)", unidad: "ppm", decimales: 2, conReferencia: false },
  { key: "cobre", label: "Cobre (Cu)", unidad: "ppm", decimales: 2, conReferencia: false },
];

export type AnalisisNumerico = { fechaMuestreo: Date | string } & Partial<Record<string, number | null | unknown>>;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export type Tendencia = "sube" | "baja" | "igual" | null;

/** Compara el valor más reciente con el anterior (umbral relativo del 2 % para llamarlo «igual»). */
export function tendencia(anterior: number | null, actual: number | null): Tendencia {
  if (anterior === null || actual === null) return null;
  const base = Math.max(Math.abs(anterior), 1e-9);
  if (Math.abs(actual - anterior) / base < 0.02) return "igual";
  return actual > anterior ? "sube" : "baja";
}

export interface FilaEvolucion {
  parametro: ParametroSuelo;
  /** Un valor por análisis, del más antiguo al más reciente (null = no medido ese día). */
  valores: (number | null)[];
  tendencia: Tendencia;
}

/**
 * Tabla parámetros × fechas. `analisis` en cualquier orden; devuelve solo los
 * `max` más recientes, del más antiguo al más nuevo, y solo filas con algún valor.
 * La tendencia compara los DOS últimos valores medidos (aunque no sean columnas contiguas).
 */
export function tablaEvolucion(analisis: AnalisisNumerico[], max = 6): { fechas: (Date | string)[]; filas: FilaEvolucion[] } {
  const orden = [...analisis].sort((a, b) => new Date(a.fechaMuestreo).getTime() - new Date(b.fechaMuestreo).getTime()).slice(-max);
  const filas: FilaEvolucion[] = [];
  for (const parametro of PARAMETROS_SUELO) {
    const valores = orden.map((a) => num(a[parametro.key]));
    if (valores.every((v) => v === null)) continue;
    const medidos = valores.filter((v): v is number => v !== null);
    filas.push({
      parametro,
      valores,
      tendencia: medidos.length >= 2 ? tendencia(medidos[medidos.length - 2], medidos[medidos.length - 1]) : null,
    });
  }
  return { fechas: orden.map((a) => a.fechaMuestreo), filas };
}

export interface RelacionesCationicas {
  caMg: number | null;
  mgK: number | null;
  caMgK: number | null;
  /** % de saturación de aluminio sobre la CIC efectiva (Ca+Mg+K+Na+Al). */
  saturacionAl: number | null;
}

const razon = (a: number | null, b: number | null) => (a !== null && b !== null && b > 0 ? a / b : null);

/** Relaciones entre bases: aritmética pura sobre lo medido; sin veredicto. */
export function relacionesCationicas(a: Partial<Record<"calcio" | "magnesio" | "potasio" | "sodio" | "aluminio", number | null | undefined>>): RelacionesCationicas {
  const ca = num(a.calcio), mg = num(a.magnesio), k = num(a.potasio), na = num(a.sodio), al = num(a.aluminio);
  const bases = [ca, mg, k, na, al];
  const efectiva = bases.every((v) => v !== null) ? bases.reduce<number>((s, v) => s + (v as number), 0) : null;
  return {
    caMg: razon(ca, mg),
    mgK: razon(mg, k),
    caMgK: ca !== null && mg !== null ? razon(ca + mg, k) : null,
    saturacionAl: efectiva && efectiva > 0 && al !== null ? (al / efectiva) * 100 : null,
  };
}

const MES_MS = 30.4375 * 86_400_000;

/** Meses completos desde el último análisis (null si no hay ninguno). */
export function mesesDesdeUltimo(analisis: { fechaMuestreo: Date | string }[], ahora = new Date()): number | null {
  if (analisis.length === 0) return null;
  const ultimo = Math.max(...analisis.map((a) => new Date(a.fechaMuestreo).getTime()));
  return Math.max(0, Math.floor((ahora.getTime() - ultimo) / MES_MS));
}

/** Sugerencia general (no una norma): repetir el análisis al menos una vez al año. */
export const MESES_SUGERIDOS_REPETIR = 12;

/** Redondeo para mostrar según los decimales del parámetro. */
export function fmtValor(v: number | null, decimales: number): string {
  return v === null ? "—" : v.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: decimales });
}
