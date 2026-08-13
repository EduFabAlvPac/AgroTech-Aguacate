/**
 * Motor de recomendación de cultivo por lote — responde la pregunta real del
 * productor antes de sembrar: "¿qué cultivo/variedad se adapta mejor a este
 * lote?" (no solo "registra tu análisis de suelo", que es el insumo, no la
 * respuesta).
 *
 * Cruza las condiciones conocidas del lote (altitud, pH del último análisis
 * de suelo) contra el rango óptimo de cada `FichaTecnica` PUBLICADA
 * (altitudMinM/MaxM, phMin/Max — ya existen en el schema, sembrados para
 * Aguacate Hass/Lorena, Café Caturra, Cacao CCN-51, Limón Tahití vía
 * prisma/seed-especies.ts). No inventa datos climáticos que no tenemos
 * (OpenWeatherMap free tier no da promedios anuales/históricos confiables) —
 * cuando un criterio no tiene datos de referencia para un cultivo o el lote,
 * se excluye del puntaje en vez de penalizar o fabricar un valor.
 */

export interface FichaCandidata {
  fichaTecnicaId: string;
  especie: string;
  variedad: string;
  altitudMinM: number | null;
  altitudMaxM: number | null;
  phMin: number | null;
  phMax: number | null;
}

export type NivelFactor = "OPTIMO" | "FUERA_RANGO" | "SIN_DATO";

export interface FactorEvaluado {
  criterio: "altitud" | "ph";
  nivel: NivelFactor;
  mensaje: string;
}

export interface CandidatoRecomendacion {
  fichaTecnicaId: string;
  especie: string;
  variedad: string;
  score: number; // 0-100, redondeado
  factores: FactorEvaluado[];
}

function evaluarAltitud(loteAltitud: number, min: number | null, max: number | null): { factor: FactorEvaluado; score: number | null } {
  if (min == null || max == null) {
    return {
      factor: { criterio: "altitud", nivel: "SIN_DATO", mensaje: "Sin rango de altitud de referencia registrado para este cultivo todavía." },
      score: null,
    };
  }
  if (loteAltitud >= min && loteAltitud <= max) {
    return {
      factor: {
        criterio: "altitud",
        nivel: "OPTIMO",
        mensaje: `✅ La altitud de tu lote (${loteAltitud.toLocaleString()} msnm) está dentro del rango ideal (${min.toLocaleString()}–${max.toLocaleString()} msnm).`,
      },
      score: 100,
    };
  }
  const diff = loteAltitud < min ? min - loteAltitud : loteAltitud - max;
  const direccion = loteAltitud < min ? "por debajo" : "por encima";
  return {
    factor: {
      criterio: "altitud",
      nivel: "FUERA_RANGO",
      mensaje: `⚠️ Tu lote está ${direccion} del rango ideal por ${Math.round(diff).toLocaleString()} m (ideal: ${min.toLocaleString()}–${max.toLocaleString()} msnm). No impide sembrar, pero puede afectar el desarrollo.`,
    },
    score: Math.max(0, 100 - diff / 15),
  };
}

function evaluarPh(loteUltimoPh: number | null, min: number | null, max: number | null): { factor: FactorEvaluado; score: number | null } {
  if (loteUltimoPh == null) {
    return {
      factor: { criterio: "ph", nivel: "SIN_DATO", mensaje: "Registra un análisis de suelo de este lote para comparar el pH." },
      score: null,
    };
  }
  if (min == null || max == null) {
    return {
      factor: { criterio: "ph", nivel: "SIN_DATO", mensaje: "Sin rango de pH de referencia registrado para este cultivo todavía." },
      score: null,
    };
  }
  if (loteUltimoPh >= min && loteUltimoPh <= max) {
    return {
      factor: { criterio: "ph", nivel: "OPTIMO", mensaje: `✅ El pH de tu suelo (${loteUltimoPh}) está dentro del rango ideal (${min}–${max}).` },
      score: 100,
    };
  }
  const diff = loteUltimoPh < min ? min - loteUltimoPh : loteUltimoPh - max;
  return {
    factor: {
      criterio: "ph",
      nivel: "FUERA_RANGO",
      mensaje: `⚠️ El pH de tu suelo (${loteUltimoPh}) está fuera del rango ideal (${min}–${max}) — considera enmiendas para corregirlo.`,
    },
    score: Math.max(0, 100 - (diff / 0.25) * 10),
  };
}

/**
 * Genera y ordena las recomendaciones de mayor a menor puntaje. Retorna
 * `null` si el lote no tiene altitud registrada — sin ese dato mínimo no hay
 * base suficiente para recomendar nada (se le pide al usuario completarlo).
 */
export function generarRecomendaciones(
  loteAltitud: number | null,
  loteUltimoPh: number | null,
  fichas: FichaCandidata[]
): CandidatoRecomendacion[] | null {
  if (loteAltitud == null) return null;

  return fichas
    .map((f) => {
      const altitud = evaluarAltitud(loteAltitud, f.altitudMinM, f.altitudMaxM);
      const ph = evaluarPh(loteUltimoPh, f.phMin, f.phMax);

      // Promedio ponderado de los criterios con datos disponibles (altitud
      // pesa más — es el dato más confiable y siempre presente cuando el
      // lote tiene altitud). Si un criterio no tiene datos, se excluye del
      // promedio en vez de penalizar.
      const pesos: { score: number; peso: number }[] = [];
      if (altitud.score != null) pesos.push({ score: altitud.score, peso: 0.6 });
      if (ph.score != null) pesos.push({ score: ph.score, peso: 0.4 });

      const pesoTotal = pesos.reduce((s, p) => s + p.peso, 0);
      const score = pesoTotal > 0 ? Math.round(pesos.reduce((s, p) => s + p.score * p.peso, 0) / pesoTotal) : 0;

      return {
        fichaTecnicaId: f.fichaTecnicaId,
        especie: f.especie,
        variedad: f.variedad,
        score,
        factores: [altitud.factor, ph.factor],
      };
    })
    .sort((a, b) => b.score - a.score);
}
