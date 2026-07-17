import { db } from "./db";
import { getForecast, groupForecastByDay } from "./weather";
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

type GeneratedAlert = {
  tipo: TipoAlerta;
  titulo: string;
  descripcion: string;
  severidad: Severidad;
  fechaInicio: Date;
  fechaFin?: Date;
  datos: Record<string, unknown>;
  municipio: string;
};

// ── Main generation function ───────────────────────────────────────────────────

export async function generateWeatherAlerts(
  lat: number,
  lng: number,
  municipio: string,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): Promise<{ created: number; skipped: number }> {
  const forecast = await getForecast(lat, lng);
  if (!forecast) return { created: 0, skipped: 0 };

  const daily = groupForecastByDay(forecast);
  const potentialAlerts: GeneratedAlert[] = [];

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
        descripcion: `Temperatura mínima proyectada de ${day.tempMin}°C en ${municipio}. ${isCritical ? "⚠️ TEMPERATURA CRÍTICA para plántulas de aguacate. Acción inmediata requerida." : "Las plántulas recién sembradas son vulnerables al frío nocturno."} Aplique riego nocturno o cubra las plantas con sacos o agrocover.`,
        severidad: isCritical ? "CRITICA" : "ALTA",
        fechaInicio: fecha,
        fechaFin: new Date(fecha.getTime() + 8 * 3600000),
        datos: { tempMin: day.tempMin, tempMax: day.tempMax, dia: dateStr, fuente: "OpenWeather" },
        municipio,
      });
    }

    // TEMPERATURA_ALTA — heat stress
    if (day.tempMax >= thresholds.tempMaxAlert) {
      potentialAlerts.push({
        tipo: "TEMPERATURA_ALTA",
        titulo: `Temperatura alta el ${day.dayLabel.toLowerCase()} (${day.tempMax}°C)`,
        descripcion: `Se proyecta temperatura máxima de ${day.tempMax}°C en ${municipio}. El aguacate Hass sufre estrés calórico por encima de 30°C. Aumente la frecuencia de riego y verifique coberturas del suelo.`,
        severidad: day.tempMax >= 35 ? "ALTA" : "MEDIA",
        fechaInicio: fecha,
        datos: { tempMax: day.tempMax, fuente: "OpenWeather" },
        municipio,
      });
    }

    // LLUVIA_EXCESIVA — flood / phytophthora risk
    if (day.rainMm >= thresholds.rainAlertMm) {
      potentialAlerts.push({
        tipo: "LLUVIA_EXCESIVA",
        titulo: `Lluvia excesiva el ${day.dayLabel.toLowerCase()} (${day.rainMm} mm)`,
        descripcion: `Se pronostican ${day.rainMm} mm de lluvia en ${municipio}. Riesgo de encharcamiento y activación de Phytophthora cinnamomi. Verifique drenajes, suspenda riego y aplique Fosetil-aluminio preventivo 1–2 semanas después.`,
        severidad: day.rainMm >= 60 ? "ALTA" : "MEDIA",
        fechaInicio: fecha,
        datos: { rainMm: day.rainMm, pop: day.popMax, fuente: "OpenWeather" },
        municipio,
      });
    }

    // VIENTO_FUERTE — mechanical damage
    if (day.windSpeed >= thresholds.windAlertKmh) {
      potentialAlerts.push({
        tipo: "VIENTO_FUERTE",
        titulo: `Vientos fuertes el ${day.dayLabel.toLowerCase()} (${day.windSpeed} km/h)`,
        descripcion: `Se esperan vientos de ${day.windSpeed} km/h en ${municipio}. Las plántulas jóvenes de aguacate son susceptibles al vuelco y daño mecánico. Revise tutores y estacas de soporte.`,
        severidad: day.windSpeed >= 60 ? "ALTA" : "MEDIA",
        fechaInicio: fecha,
        datos: { windSpeed: day.windSpeed, fuente: "OpenWeather" },
        municipio,
      });
    }
  }

  // SEQUIA — check consecutive dry days
  const dryDays = daily.filter((d) => d.rainMm < 1 && d.popMax < 0.2).length;
  if (dryDays >= thresholds.droughtDays) {
    potentialAlerts.push({
      tipo: "SEQUIA",
      titulo: `Posible sequía prolongada (${dryDays} días secos proyectados)`,
      descripcion: `El pronóstico muestra ${dryDays} días consecutivos sin lluvia significativa en ${municipio}. Para plántulas de aguacate en establecimiento, aumente la frecuencia de riego a cada 2 días y aplique mulching de 8–10 cm alrededor de las plantas.`,
      severidad: dryDays >= 8 ? "ALTA" : "MEDIA",
      fechaInicio: new Date(),
      datos: { dryDays, fuente: "OpenWeather" },
      municipio,
    });
  }

  if (potentialAlerts.length === 0) return { created: 0, skipped: 0 };

  // ── Deduplicate: skip alerts already created in last 24h for same tipo + fecha ─
  const recentAlerts = await db.alertaClimatica.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 3600000) },
      municipio,
    },
    select: { tipo: true, fechaInicio: true },
  });

  const isDuplicate = (alert: GeneratedAlert) =>
    recentAlerts.some(
      (r) =>
        r.tipo === alert.tipo &&
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
      },
    });
    created++;
  }

  return { created, skipped };
}
