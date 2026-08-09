import { db } from "./db";
import { getForecast, groupForecastByDay, type DailyForecast } from "./weather";
import type { UmbralAlertaPlaga } from "./fichas-tecnicas";
import type { TipoAlerta, Severidad } from "@prisma/client";

// ── Default thresholds (used when UserPreferences not yet configured) ──────────
export const DEFAULT_THRESHOLDS = {
  tempMinAlert: 12,       // °C — below triggers HELADA
  tempMinCritical: 8,     // °C — below triggers CRITICA helada
  tempMaxAlert: 32,       // °C — above triggers TEMPERATURA_ALTA
  rainAlertMm: 30,        // mm/day — above triggers LLUVIA_EXCESIVA
  windAlertKmh: 40,       // km/h — above triggers VIENTO_FUERTE
  droughtDays: 5,         // consecutive dry days — triggers SEQUIA
};

export type AlertThresholds = typeof DEFAULT_THRESHOLDS;

/** Context about the active crop — used to parametrize alert descriptions */
export type CropContext = {
  cropName: string;    // e.g. "Aguacate Hass", "Café Caturra"
  cropStage: string;   // EtapaCultivo value
};

const DEFAULT_CROP_CONTEXT: CropContext = {
  cropName: "cultivo",
  cropStage: "SIEMBRA",
};

type GeneratedAlert = {
  tipo: TipoAlerta;
  titulo: string;
  descripcion: string;
  severidad: Severidad;
  fechaInicio: Date;
  fechaFin?: Date;
  datos: Record<string, unknown>;
  municipio: string;
  fincaId?: string;
  cultivoId?: string;
};

// ── Helper: stage-aware vulnerability text ─────────────────────────────────────

function getVulnerabilityText(cropName: string, stage: string): string {
  const isEarly = ["PREPARACION", "SIEMBRA", "ESTABLECIMIENTO"].includes(stage);
  if (isEarly) {
    return `Las plantas jóvenes de ${cropName} son especialmente vulnerables en esta etapa.`;
  }
  return `Revise el estado de su ${cropName} y tome medidas preventivas.`;
}

// ── Shared: dedupe + persist ────────────────────────────────────────────────────
// Un mismo tipo+fecha(+cultivo) no se vuelve a crear si ya se generó en las
// últimas 24h — evita duplicar alertas cada vez que se dispara la generación.

async function persistAlerts(potentialAlerts: GeneratedAlert[]): Promise<{ created: number; skipped: number }> {
  if (potentialAlerts.length === 0) return { created: 0, skipped: 0 };

  const recentAlerts = await db.alertaClimatica.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 24 * 3600000) } },
    select: { tipo: true, fechaInicio: true, cultivoId: true },
  });

  const isDuplicate = (alert: GeneratedAlert) =>
    recentAlerts.some(
      (r) =>
        r.tipo === alert.tipo &&
        r.cultivoId === (alert.cultivoId ?? null) &&
        Math.abs(r.fechaInicio.getTime() - alert.fechaInicio.getTime()) < 86400000
    );

  let created = 0;
  let skipped = 0;

  for (const alert of potentialAlerts) {
    if (isDuplicate(alert)) {
      skipped++;
      continue;
    }

    await db.alertaClimatica.create({
      data: {
        tipo: alert.tipo,
        titulo: alert.titulo,
        descripcion: alert.descripcion,
        severidad: alert.severidad,
        fechaInicio: alert.fechaInicio,
        fechaFin: alert.fechaFin,
        activa: true,
        leida: false,
        datos: alert.datos as any,
        municipio: alert.municipio,
        fincaId: alert.fincaId,
        cultivoId: alert.cultivoId,
      },
    });
    created++;
  }

  return { created, skipped };
}

// ── Weather alerts (finca-scoped) ───────────────────────────────────────────────

export async function generateWeatherAlerts(
  lat: number,
  lng: number,
  municipio: string,
  fincaId: string,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS,
  cropContext: CropContext = DEFAULT_CROP_CONTEXT
): Promise<{ created: number; skipped: number }> {
  const forecast = await getForecast(lat, lng);
  if (!forecast) return { created: 0, skipped: 0 };

  const daily = groupForecastByDay(forecast);
  const potentialAlerts: GeneratedAlert[] = [];

  const { cropName, cropStage } = cropContext;
  const vulnText = getVulnerabilityText(cropName, cropStage);

  // ── Check each day ──────────────────────────────────────────────────────────
  for (const day of daily) {
    const dateStr = day.date;
    const fecha = new Date(dateStr + "T06:00:00");

    // HELADA — temperature below threshold
    if (day.tempMin <= thresholds.tempMinAlert) {
      const isCritical = day.tempMin <= thresholds.tempMinCritical;
      potentialAlerts.push({
        tipo: "HELADA",
        titulo: `Riesgo de helada el ${day.dayLabel.toLowerCase()} (${day.tempMin}°C)`,
        descripcion: `Temperatura mínima proyectada de ${day.tempMin}°C en ${municipio}. ${isCritical ? `⚠️ TEMPERATURA CRÍTICA para ${cropName}. Acción inmediata requerida.` : vulnText} Aplique riego nocturno o cubra las plantas con sacos o agrocover.`,
        severidad: isCritical ? "CRITICA" : "ALTA",
        fechaInicio: fecha,
        fechaFin: new Date(fecha.getTime() + 8 * 3600000),
        datos: { tempMin: day.tempMin, tempMax: day.tempMax, dia: dateStr, fuente: "OpenWeather" },
        municipio,
        fincaId,
      });
    }

    // TEMPERATURA_ALTA — heat stress
    if (day.tempMax >= thresholds.tempMaxAlert) {
      potentialAlerts.push({
        tipo: "TEMPERATURA_ALTA",
        titulo: `Temperatura alta el ${day.dayLabel.toLowerCase()} (${day.tempMax}°C)`,
        descripcion: `Se proyecta temperatura máxima de ${day.tempMax}°C en ${municipio}. ${cropName} puede sufrir estrés calórico. Aumente la frecuencia de riego y verifique coberturas del suelo.`,
        severidad: day.tempMax >= 35 ? "ALTA" : "MEDIA",
        fechaInicio: fecha,
        datos: { tempMax: day.tempMax, fuente: "OpenWeather" },
        municipio,
        fincaId,
      });
    }

    // LLUVIA_EXCESIVA — flood / root disease risk
    if (day.rainMm >= thresholds.rainAlertMm) {
      potentialAlerts.push({
        tipo: "LLUVIA_EXCESIVA",
        titulo: `Lluvia excesiva el ${day.dayLabel.toLowerCase()} (${day.rainMm} mm)`,
        descripcion: `Se pronostican ${day.rainMm} mm de lluvia en ${municipio}. Riesgo de encharcamiento y enfermedades radiculares en ${cropName}. Verifique drenajes y suspenda riego.`,
        severidad: day.rainMm >= 60 ? "ALTA" : "MEDIA",
        fechaInicio: fecha,
        datos: { rainMm: day.rainMm, pop: day.popMax, fuente: "OpenWeather" },
        municipio,
        fincaId,
      });
    }

    // VIENTO_FUERTE — mechanical damage
    if (day.windSpeed >= thresholds.windAlertKmh) {
      potentialAlerts.push({
        tipo: "VIENTO_FUERTE",
        titulo: `Vientos fuertes el ${day.dayLabel.toLowerCase()} (${day.windSpeed} km/h)`,
        descripcion: `Se esperan vientos de ${day.windSpeed} km/h en ${municipio}. ${vulnText} Revise tutores y estacas de soporte.`,
        severidad: day.windSpeed >= 60 ? "ALTA" : "MEDIA",
        fechaInicio: fecha,
        datos: { windSpeed: day.windSpeed, fuente: "OpenWeather" },
        municipio,
        fincaId,
      });
    }
  }

  // SEQUIA — check consecutive dry days
  const dryDays = daily.filter((d) => d.rainMm < 1 && d.popMax < 0.2).length;
  if (dryDays >= thresholds.droughtDays) {
    potentialAlerts.push({
      tipo: "SEQUIA",
      titulo: `Posible sequía prolongada (${dryDays} días secos proyectados)`,
      descripcion: `El pronóstico muestra ${dryDays} días consecutivos sin lluvia significativa en ${municipio}. Para ${cropName} en ${cropStage.toLowerCase()}, aumente la frecuencia de riego y aplique mulching alrededor de las plantas.`,
      severidad: dryDays >= 8 ? "ALTA" : "MEDIA",
      fechaInicio: new Date(),
      datos: { dryDays, fuente: "OpenWeather" },
      municipio,
      fincaId,
    });
  }

  return persistAlerts(potentialAlerts);
}

// ── Plaga alerts (cultivo-scoped, motor de fichas técnicas) ────────────────────
// Fase 5 — ver CLAUDE.md §2.2 y docs/REQUERIMIENTOS.md RF17. Cruza el
// pronóstico contra PlagaEnfermedad.umbralAlerta del catálogo de la
// FichaTecnica pinneada al cultivo. Todos los umbrales definidos en una
// plaga deben cumplirse a la vez (AND) para que dispare — ver
// src/lib/fichas-tecnicas.ts (UmbralAlertaPlaga).
//
// No se filtra por etapa fenológica todavía (Cultivo.etapa es el enum legacy
// fijo, distinto de EtapaFenologica.orden de la ficha técnica — no hay hoy
// una forma confiable de saber en qué EtapaFenologica está un cultivo).
// Deuda reconocida, no bloqueante para el valor de esta fase.

export interface PlagaParaAlerta {
  id: string;
  nombre: string;
  tipo: string;
  manejoRecomendado: string | null;
  umbralAlerta: unknown;
}

function umbralCoincide(umbral: UmbralAlertaPlaga, day: DailyForecast): boolean {
  if (umbral.humedadMinPct !== undefined && day.humidity < umbral.humedadMinPct) return false;
  if (umbral.lluviaMinMm !== undefined && day.rainMm < umbral.lluviaMinMm) return false;
  // Rango de riesgo [tempMinC, tempMaxC]: dispara si el rango del día se
  // solapa con el rango de riesgo configurado.
  if (umbral.tempMinC !== undefined && day.tempMax < umbral.tempMinC) return false;
  if (umbral.tempMaxC !== undefined && day.tempMin > umbral.tempMaxC) return false;
  return true;
}

export async function generatePlagaAlerts(
  lat: number,
  lng: number,
  municipio: string,
  fincaId: string,
  cultivoId: string,
  cropName: string,
  plagas: PlagaParaAlerta[]
): Promise<{ created: number; skipped: number }> {
  const conUmbral = plagas.filter((p) => p.umbralAlerta && typeof p.umbralAlerta === "object");
  if (conUmbral.length === 0) return { created: 0, skipped: 0 };

  const forecast = await getForecast(lat, lng);
  if (!forecast) return { created: 0, skipped: 0 };

  const daily = groupForecastByDay(forecast);
  const potentialAlerts: GeneratedAlert[] = [];

  for (const plaga of conUmbral) {
    const umbral = plaga.umbralAlerta as UmbralAlertaPlaga;
    const diaRiesgo = daily.find((d) => umbralCoincide(umbral, d));
    if (!diaRiesgo) continue;

    potentialAlerts.push({
      tipo: "PLAGA",
      titulo: `Condiciones favorables para ${plaga.nombre} en ${cropName}`,
      descripcion:
        `El pronóstico para ${diaRiesgo.dayLabel.toLowerCase()} en ${municipio} cumple las condiciones de riesgo ` +
        `de ${plaga.nombre.toLowerCase()} registradas en la ficha técnica de ${cropName}. ` +
        (plaga.manejoRecomendado ? `Manejo recomendado: ${plaga.manejoRecomendado}` : "Revise el cultivo e inspeccione síntomas tempranos."),
      severidad: "MEDIA",
      fechaInicio: new Date(diaRiesgo.date + "T06:00:00"),
      datos: {
        plagaId: plaga.id,
        humedad: diaRiesgo.humidity,
        tempMin: diaRiesgo.tempMin,
        tempMax: diaRiesgo.tempMax,
        rainMm: diaRiesgo.rainMm,
        umbral,
        fuente: "OpenWeather + FichaTecnica",
      },
      municipio,
      fincaId,
      cultivoId,
    });
  }

  return persistAlerts(potentialAlerts);
}
