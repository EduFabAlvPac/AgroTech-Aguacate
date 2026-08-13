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

// Exportada para poder probar la lógica de umbral sin depender de la API de
// clima real (mismo criterio que evaluarNivel en suelo-referencia.ts).
export function umbralCoincide(umbral: UmbralAlertaPlaga, day: DailyForecast): boolean {
  if (umbral.humedadMinPct !== undefined && day.humidity < umbral.humedadMinPct) return false;
  if (umbral.humedadMaxPct !== undefined && day.humidity > umbral.humedadMaxPct) return false;
  if (umbral.lluviaMinMm !== undefined && day.rainMm < umbral.lluviaMinMm) return false;
  if (umbral.lluviaMaxMm !== undefined && day.rainMm > umbral.lluviaMaxMm) return false;
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

// ── Calendario de actividades proyectado (ActividadCalendario) ──────────────────
// A diferencia de las alertas de clima/plaga, esta no reacciona a nada
// externo — proyecta desde Cultivo.fechaSiembra + la ficha técnica qué
// manejo (riego/fertilización/poda/inspección) corresponde ahora. Antes el
// motor de alertas solo reaccionaba al clima; esta es la brecha "no solo de
// datos" documentada en docs/REQUERIMIENTOS.md RF17/RF18.
//
// Se consultan las actividades de TODAS las etapas de la ficha técnica, no
// solo la que "coincide" con Cultivo.etapa — diaInicioRelativo/diaFinRelativo
// ya son acumulados desde la siembra (no desde el inicio de cada etapa, ver
// comentario más abajo), así que la ventana de días por sí sola decide qué
// actividad corresponde ahora, sin depender de mapear Cultivo.etapa (enum
// fijo de 6 valores: PREPARACION/SIEMBRA/ESTABLECIMIENTO/CRECIMIENTO/
// PRODUCCION/COSECHA) a una EtapaFenologica concreta.
//
// Esto reemplaza un primer diseño que sí hacía ese mapeo 1:1 por posición
// (ORDEN_POR_ETAPA) — funcionaba para Aguacate Hass (6 etapas, calzan
// exacto con el enum) pero daba resultados INCORRECTOS para cultivos con
// más etapas y nombres propios: la ficha de Café Caturra tiene 8 etapas
// (..., FLORACION, LLENADO, COSECHA, BENEFICIO) y la de Cacao CCN-51 otras 8
// (..., FLORACION, FRUCTIFICACION, COSECHA, FERMENTACION) — con el mapeo
// viejo, un cultivo de café marcado "COSECHA" (el único valor de etapa
// disponible en el enum) resolvía a la EtapaFenologica de orden 6, que en la
// ficha de café es "LLENADO", no "COSECHA". Se descubrió al diseñar el seed
// de actividades de café/cacao para esta misma feature.
export async function generateActividadAlerts(
  municipio: string,
  fincaId: string,
  cultivoId: string,
  cropName: string,
  fechaSiembra: Date,
  fichaTecnicaId: string
): Promise<{ created: number; skipped: number }> {
  // diaInicioRelativo/diaFinRelativo/frecuenciaDias se interpretan como días
  // desde Cultivo.fechaSiembra (no desde el inicio de la etapa — evita
  // depender de que TODAS las etapas previas tengan duración configurada,
  // que hoy no es el caso). Documentado aquí porque es la única fuente de
  // verdad de esa convención hasta que exista un admin UI para esto.
  const diasDesdeSiembra = Math.floor((Date.now() - fechaSiembra.getTime()) / 86400000);
  if (diasDesdeSiembra < 0) return { created: 0, skipped: 0 };

  const actividades = await db.actividadCalendario.findMany({
    where: { etapa: { fichaId: fichaTecnicaId } },
  });
  if (actividades.length === 0) return { created: 0, skipped: 0 };

  const potentialAlerts: GeneratedAlert[] = [];

  for (const act of actividades) {
    const inicio = act.diaInicioRelativo;
    const fin = act.diaFinRelativo ?? inicio;
    if (diasDesdeSiembra < inicio || diasDesdeSiembra > fin) continue;

    const enVentana = act.frecuenciaDias && act.frecuenciaDias > 0
      ? (diasDesdeSiembra - inicio) % act.frecuenciaDias === 0
      : true;
    if (!enVentana) continue;

    // No molestar si el productor ya registró esta actividad recientemente
    // (dentro de la frecuencia esperada, o en los últimos 3 días si es puntual).
    const ventanaChequeo = act.frecuenciaDias ?? 3;
    const yaRegistrada = await db.registroCultivo.findFirst({
      where: {
        cultivoId,
        tipo: act.tipoRegistro,
        fecha: { gte: new Date(Date.now() - ventanaChequeo * 86400000) },
      },
      select: { id: true },
    });
    if (yaRegistrada) continue;

    potentialAlerts.push({
      tipo: "ACTIVIDAD",
      titulo: `${act.nombre} — ${cropName}`,
      descripcion:
        (act.descripcion || `Según la ficha técnica de ${cropName}, corresponde ${act.nombre.toLowerCase()} en esta etapa del cultivo.`) +
        (act.obligatoria ? " Es una actividad crítica para el desarrollo del cultivo." : ""),
      severidad: act.obligatoria ? "ALTA" : "MEDIA",
      fechaInicio: new Date(),
      datos: { diasDesdeSiembra, tipoRegistro: act.tipoRegistro, fuente: "FichaTecnica" },
      municipio,
      fincaId,
      cultivoId,
    });
  }

  return persistAlerts(potentialAlerts);
}

// ── Orquestador: genera las 3 categorías de alertas para UNA finca ─────────────
// Única fuente de verdad para "generar alertas de una finca" — reutilizada
// por la ruta manual (POST /api/alertas/generate, con sesión de usuario) y
// por el cron diario (GET /api/cron/generar-alertas, sin sesión — Vercel
// Cron). Antes esta lógica vivía duplicada dentro del route handler manual;
// el cron la necesitaba igual, así que se extrajo aquí.

export interface ResultadoGeneracion {
  created: number;
  skipped: number;
  detalle: {
    clima: { created: number; skipped: number };
    plaga: { created: number; skipped: number };
    actividad: { created: number; skipped: number };
  };
}

const RESULTADO_VACIO: ResultadoGeneracion = {
  created: 0,
  skipped: 0,
  detalle: {
    clima: { created: 0, skipped: 0 },
    plaga: { created: 0, skipped: 0 },
    actividad: { created: 0, skipped: 0 },
  },
};

export async function generarAlertasParaFinca(fincaId: string): Promise<ResultadoGeneracion> {
  const finca = await db.finca.findUnique({
    where: { id: fincaId },
    select: { id: true, lat: true, lng: true, municipio: true, userId: true },
  });
  if (!finca) return RESULTADO_VACIO;

  const [userPrefs, cultivosActivos] = await Promise.all([
    db.userPreferences.findUnique({
      where: { userId: finca.userId },
      select: {
        tempMinAlert: true, tempMaxAlert: true,
        rainAlertMm: true, windAlertKmh: true, droughtDays: true,
      },
    }),
    db.cultivo.findMany({
      where: { lote: { fincaId: finca.id }, estado: "ACTIVO" },
      select: {
        id: true, especie: true, variedad: true, etapa: true, fechaSiembra: true, fichaTecnicaId: true,
        fichaTecnica: {
          select: {
            tempMinC: true,
            tempMaxC: true,
            variedad: { select: { especie: { select: { nombre: true } } } },
            plagas: { select: { id: true, nombre: true, tipo: true, manejoRecomendado: true, umbralAlerta: true } },
          },
        },
      },
    }),
  ]);

  const lat = finca.lat ?? 8.320589;
  const lng = finca.lng ?? -73.337551;
  const municipio = finca.municipio ?? "Ocaña";

  // Contexto descriptivo de las alertas climáticas (finca-wide): se usa el
  // primer cultivo activo como referencia si existe, tanto para el texto
  // como para los umbrales de temperatura reales de su ficha técnica.
  const primero = cultivosActivos[0];
  const cropName = primero ? `${primero.especie} ${primero.variedad ?? ""}`.trim() : "cultivo";
  const cropStage = primero?.etapa ?? "SIEMBRA";

  // Prioridad de umbrales: preferencia explícita del usuario > rango de la
  // ficha técnica del cultivo (real, por especie/variedad) > default genérico.
  const fichaTemp = primero?.fichaTecnica;
  const thresholds: AlertThresholds = {
    tempMinAlert: userPrefs?.tempMinAlert ?? fichaTemp?.tempMinC ?? DEFAULT_THRESHOLDS.tempMinAlert,
    tempMinCritical: DEFAULT_THRESHOLDS.tempMinCritical,
    tempMaxAlert: userPrefs?.tempMaxAlert ?? fichaTemp?.tempMaxC ?? DEFAULT_THRESHOLDS.tempMaxAlert,
    rainAlertMm: userPrefs?.rainAlertMm ?? DEFAULT_THRESHOLDS.rainAlertMm,
    windAlertKmh: userPrefs?.windAlertKmh ?? DEFAULT_THRESHOLDS.windAlertKmh,
    droughtDays: userPrefs?.droughtDays ?? DEFAULT_THRESHOLDS.droughtDays,
  };

  const weatherResult = await generateWeatherAlerts(lat, lng, municipio, finca.id, thresholds, { cropName, cropStage });

  // Alertas de plaga — una por cultivo activo con ficha técnica + catálogo
  // de plagas con umbral configurado.
  let plagaCreated = 0;
  let plagaSkipped = 0;
  for (const cultivo of cultivosActivos) {
    if (!cultivo.fichaTecnica || cultivo.fichaTecnica.plagas.length === 0) continue;
    const nombreCultivo = `${cultivo.fichaTecnica.variedad.especie.nombre} ${cultivo.variedad ?? ""}`.trim();
    const result = await generatePlagaAlerts(
      lat, lng, municipio, finca.id, cultivo.id, nombreCultivo, cultivo.fichaTecnica.plagas
    );
    plagaCreated += result.created;
    plagaSkipped += result.skipped;
  }

  // Calendario de actividades — un recordatorio por cultivo activo con
  // ficha técnica pinneada, según cuántos días lleva desde la siembra (ya
  // no según Cultivo.etapa — ver comentario en generateActividadAlerts).
  let actividadCreated = 0;
  let actividadSkipped = 0;
  for (const cultivo of cultivosActivos) {
    if (!cultivo.fichaTecnicaId || !cultivo.fechaSiembra) continue;
    const nombreCultivo = `${cultivo.especie} ${cultivo.variedad ?? ""}`.trim();
    const result = await generateActividadAlerts(
      municipio, finca.id, cultivo.id, nombreCultivo, cultivo.fechaSiembra, cultivo.fichaTecnicaId
    );
    actividadCreated += result.created;
    actividadSkipped += result.skipped;
  }

  return {
    created: weatherResult.created + plagaCreated + actividadCreated,
    skipped: weatherResult.skipped + plagaSkipped + actividadSkipped,
    detalle: {
      clima: weatherResult,
      plaga: { created: plagaCreated, skipped: plagaSkipped },
      actividad: { created: actividadCreated, skipped: actividadSkipped },
    },
  };
}
