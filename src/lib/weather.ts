const OW_BASE = "https://api.openweathermap.org/data/2.5";
const API_KEY = process.env.OPENWEATHER_API_KEY;

/**
 * El pronóstico SIMULADO (números aleatorios) solo existe para desarrollo
 * local sin clave. En producción (incluye los previews de Vercel) jamás se usa:
 * antes, sin OPENWEATHER_API_KEY o ante un fallo del servicio, el motor de
 * alertas guardaba alertas de helada/sequía/plaga calculadas con datos
 * inventados y con `fuente: "OpenWeather"` — un agricultor real podía recibir
 * avisos falsos sin ninguna marca. Ahora, sin datos reales, no hay pronóstico
 * (null) y nadie genera nada.
 */
export function simuladoPermitido(): boolean {
  return process.env.NODE_ENV !== "production";
}

export type CurrentWeather = {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;        // km/h
  windDeg: number;
  description: string;
  icon: string;
  rain1h?: number;          // mm
  clouds: number;           // %
  pressure: number;         // hPa
  city: string;
  country: string;
  dt: number;               // unix timestamp
};

export type ForecastItem = {
  dt: number;
  temp: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  windDeg: number;
  description: string;
  icon: string;
  rain3h?: number;          // mm in 3 hours
  pop: number;              // probability of precipitation 0-1
  clouds: number;
};

export type WeatherForecast = {
  city: string;
  list: ForecastItem[];
  /** true = datos inventados (solo desarrollo local). Nunca en producción. */
  simulado?: boolean;
};

// Ocaña, Norte de Santander defaults (Finca El Juncal)
const DEFAULT_LAT = 8.320589;
const DEFAULT_LNG = -73.337551;

// ── Current weather ────────────────────────────────────────────────────────────

export async function getCurrentWeather(
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG
): Promise<CurrentWeather | null> {
  if (!API_KEY) return simuladoPermitido() ? getMockCurrentWeather() : null;

  try {
    const url = `${OW_BASE}/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric&lang=es`;
    const res = await fetch(url, { next: { revalidate: 1800 } }); // cache 30 min
    if (!res.ok) return simuladoPermitido() ? getMockCurrentWeather() : null;

    const d = await res.json();

    return {
      temp: Math.round(d.main.temp),
      feelsLike: Math.round(d.main.feels_like),
      humidity: d.main.humidity,
      windSpeed: Math.round((d.wind?.speed ?? 0) * 3.6),
      windDeg: d.wind?.deg ?? 0,
      description: capitalize(d.weather[0]?.description ?? ""),
      icon: d.weather[0]?.icon ?? "01d",
      rain1h: d.rain?.["1h"],
      clouds: d.clouds?.all ?? 0,
      pressure: d.main.pressure,
      city: d.name,
      country: d.sys?.country ?? "CO",
      dt: d.dt,
    };
  } catch {
    return simuladoPermitido() ? getMockCurrentWeather() : null;
  }
}

// ── 5-day forecast ─────────────────────────────────────────────────────────────

export async function getForecast(
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG
): Promise<WeatherForecast | null> {
  if (!API_KEY) return simuladoPermitido() ? getMockForecast() : null;

  try {
    const url = `${OW_BASE}/forecast?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric&lang=es&cnt=40`;
    const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h
    if (!res.ok) return simuladoPermitido() ? getMockForecast() : null;

    const d = await res.json();

    return {
      city: d.city?.name ?? "Norte de Santander",
      list: d.list.map((item: any) => ({
        dt: item.dt,
        temp: Math.round(item.main.temp),
        tempMin: Math.round(item.main.temp_min),
        tempMax: Math.round(item.main.temp_max),
        humidity: item.main.humidity,
        windSpeed: Math.round((item.wind?.speed ?? 0) * 3.6),
        windDeg: item.wind?.deg ?? 0,
        description: capitalize(item.weather[0]?.description ?? ""),
        icon: item.weather[0]?.icon ?? "01d",
        rain3h: item.rain?.["3h"],
        pop: item.pop,
        clouds: item.clouds?.all ?? 0,
      })),
    };
  } catch {
    return simuladoPermitido() ? getMockForecast() : null;
  }
}

// ── Daily summary from forecast ────────────────────────────────────────────────

export type DailyForecast = {
  date: string;           // YYYY-MM-DD
  dayLabel: string;       // "Hoy", "Mañana", "Jue 10"
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  rainMm: number;         // accumulated daily rain
  popMax: number;         // max probability of precipitation
};

export function groupForecastByDay(forecast: WeatherForecast): DailyForecast[] {
  const days = new Map<string, ForecastItem[]>();

  for (const item of forecast.list) {
    const date = new Date(item.dt * 1000).toISOString().split("T")[0];
    if (!days.has(date)) days.set(date, []);
    days.get(date)!.push(item);
  }

  const today = new Date().toISOString().split("T")[0];

  return Array.from(days.entries())
    .slice(0, 5)
    .map(([date, items]) => {
      const dayIndex = Math.round(
        (new Date(date).getTime() - new Date(today).getTime()) / 86400000
      );
      const dayLabel =
        dayIndex === 0 ? "Hoy" :
        dayIndex === 1 ? "Mañana" :
        new Date(date).toLocaleDateString("es-CO", { weekday: "short", day: "numeric" });

      const temps = items.map((i) => i.temp);
      const rainTotal = items.reduce((s, i) => s + (i.rain3h ?? 0), 0);
      const midday = items.find((i) => {
        const h = new Date(i.dt * 1000).getHours();
        return h >= 11 && h <= 14;
      }) ?? items[Math.floor(items.length / 2)];

      return {
        date,
        dayLabel,
        tempMin: Math.min(...temps),
        tempMax: Math.max(...temps),
        humidity: Math.round(items.reduce((s, i) => s + i.humidity, 0) / items.length),
        windSpeed: Math.max(...items.map((i) => i.windSpeed)),
        description: midday.description,
        icon: midday.icon,
        rainMm: Math.round(rainTotal * 10) / 10,
        popMax: Math.max(...items.map((i) => i.pop)),
      };
    });
}

// ── Mock data (when no API key) ────────────────────────────────────────────────

function getMockCurrentWeather(): CurrentWeather {
  return {
    temp: 21,
    feelsLike: 20,
    humidity: 68,
    windSpeed: 12,
    windDeg: 180,
    description: "Parcialmente nublado",
    icon: "02d",
    clouds: 40,
    pressure: 1013,
    city: "Norte de Santander",
    country: "CO",
    dt: Math.floor(Date.now() / 1000),
  };
}

function getMockForecast(): WeatherForecast {
  const now = Math.floor(Date.now() / 1000);
  const icons = ["02d", "10d", "01d", "03d", "09d"];
  const descs = ["Nublado", "Lluvia leve", "Despejado", "Nublado", "Lluvia moderada"];

  return {
    city: "Norte de Santander",
    simulado: true,
    list: Array.from({ length: 40 }, (_, i) => ({
      dt: now + i * 10800,
      temp: 18 + Math.round(Math.random() * 8),
      tempMin: 14 + Math.round(Math.random() * 4),
      tempMax: 22 + Math.round(Math.random() * 6),
      humidity: 60 + Math.round(Math.random() * 20),
      windSpeed: 8 + Math.round(Math.random() * 15),
      windDeg: Math.round(Math.random() * 360),
      description: descs[Math.floor(i / 8) % 5],
      icon: icons[Math.floor(i / 8) % 5],
      rain3h: Math.random() > 0.6 ? Math.round(Math.random() * 8 * 10) / 10 : undefined,
      pop: Math.random() * 0.6,
      clouds: 20 + Math.round(Math.random() * 60),
    })),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function iconToEmoji(icon: string): string {
  const map: Record<string, string> = {
    "01d": "☀️", "01n": "🌙",
    "02d": "⛅", "02n": "⛅",
    "03d": "🌥️", "03n": "🌥️",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌧️", "09n": "🌧️",
    "10d": "🌦️", "10n": "🌦️",
    "11d": "⛈️", "11n": "⛈️",
    "13d": "❄️", "13n": "❄️",
    "50d": "🌫️", "50n": "🌫️",
  };
  return map[icon] ?? "🌤️";
}
