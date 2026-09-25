import { describe, it, expect, vi, afterEach } from "vitest";
import { esDuplicada, asuntoAlerta, fuenteClima, type AlertaComparable } from "@/lib/alert-engine";

/**
 * Hallazgo de la auditoría de calidad (2026-09-24): el dedupe de alertas
 * miraba TODAS las fincas y comparaba solo tipo + cultivo + fecha. Estos tests
 * fijan el comportamiento correcto: aislado por finca y por "asunto".
 */
const HOY = new Date("2026-10-01T06:00:00Z");
const base = (over: Partial<AlertaComparable> = {}): AlertaComparable => ({
  tipo: "HELADA", fincaId: "finca-a", cultivoId: null, fechaInicio: HOY, titulo: "Riesgo de helada", datos: {}, ...over,
});

describe("esDuplicada", () => {
  it("la misma alerta de la misma finca el mismo día es duplicada", () => {
    expect(esDuplicada(base(), [base()])).toBe(true);
  });

  it("la MISMA alerta en OTRA finca no es duplicada (antes la finca B perdía la alerta que ya tenía la A)", () => {
    expect(esDuplicada(base({ fincaId: "finca-b" }), [base({ fincaId: "finca-a" })])).toBe(false);
  });

  it("días distintos (≥ 24 h) no son duplicadas", () => {
    expect(esDuplicada(base({ fechaInicio: new Date(HOY.getTime() + 25 * 3600000) }), [base()])).toBe(false);
  });

  it("tipos distintos no son duplicadas", () => {
    expect(esDuplicada(base({ tipo: "SEQUIA" }), [base()])).toBe(false);
  });

  it("dos PLAGAS distintas del mismo cultivo no se anulan entre sí, pero la misma plaga sí", () => {
    const plaga = (plagaId: string): AlertaComparable => base({ tipo: "PLAGA", cultivoId: "c1", titulo: `Plaga ${plagaId}`, datos: { plagaId } });
    expect(esDuplicada(plaga("trips"), [plaga("acaros")])).toBe(false);
    expect(esDuplicada(plaga("trips"), [plaga("trips")])).toBe(true);
  });

  it("dos ACTIVIDADES distintas del mismo cultivo no se anulan, la misma sí", () => {
    const act = (t: string): AlertaComparable => base({ tipo: "ACTIVIDAD", cultivoId: "c1", titulo: t });
    expect(esDuplicada(act("Poda — Aguacate"), [act("Riego — Aguacate")])).toBe(false);
    expect(esDuplicada(act("Poda — Aguacate"), [act("Poda — Aguacate")])).toBe(true);
  });

  it("distinto cultivo no es duplicada", () => {
    expect(esDuplicada(base({ tipo: "PLAGA", cultivoId: "c1", datos: { plagaId: "p" } }), [base({ tipo: "PLAGA", cultivoId: "c2", datos: { plagaId: "p" } })])).toBe(false);
  });
});

describe("asuntoAlerta", () => {
  it("clima no tiene asunto extra; plaga usa plagaId; actividad usa el título", () => {
    expect(asuntoAlerta({ tipo: "HELADA", titulo: "x", datos: {} })).toBe("");
    expect(asuntoAlerta({ tipo: "PLAGA", titulo: "x", datos: { plagaId: "abc" } })).toBe("abc");
    expect(asuntoAlerta({ tipo: "ACTIVIDAD", titulo: "Poda — Café", datos: {} })).toBe("Poda — Café");
  });
});

describe("fuenteClima", () => {
  it("un pronóstico simulado se marca SIMULADO; uno real, OpenWeather", () => {
    expect(fuenteClima({ city: "x", list: [], simulado: true })).toBe("SIMULADO");
    expect(fuenteClima({ city: "x", list: [] })).toBe("OpenWeather");
  });
});

describe("clima simulado: nunca en producción", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it("sin OPENWEATHER_API_KEY en producción no hay pronóstico (null), así que no se inventan alertas", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    vi.resetModules();
    const { getForecast, getCurrentWeather } = await import("@/lib/weather");
    expect(await getForecast(1, 1)).toBeNull();
    expect(await getCurrentWeather(1, 1)).toBeNull();
  });

  it("en desarrollo sin clave sí hay pronóstico, pero marcado como simulado", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    vi.resetModules();
    const { getForecast } = await import("@/lib/weather");
    expect((await getForecast(1, 1))?.simulado).toBe(true);
  });
});
