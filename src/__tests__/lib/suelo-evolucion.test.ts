import { describe, it, expect } from "vitest";
import { tendencia, tablaEvolucion, relacionesCationicas, mesesDesdeUltimo, fmtValor } from "@/lib/agronomia/suelo-evolucion";

const d = (s: string) => new Date(`${s}T12:00:00Z`);

describe("tendencia", () => {
  it("sube, baja e igual (±2 %)", () => {
    expect(tendencia(5, 6)).toBe("sube");
    expect(tendencia(6, 5)).toBe("baja");
    expect(tendencia(5, 5.05)).toBe("igual");
  });
  it("sin dato en alguno de los dos → null", () => {
    expect(tendencia(null, 5)).toBeNull();
    expect(tendencia(5, null)).toBeNull();
  });
  it("no divide por cero", () => expect(tendencia(0, 1)).toBe("sube"));
});

describe("tablaEvolucion", () => {
  const a = [
    { fechaMuestreo: d("2026-06-01"), ph: 5.2, fosforo: 10, calcio: null },
    { fechaMuestreo: d("2025-01-01"), ph: 4.8, fosforo: 8, materiaOrganica: 3 },
    { fechaMuestreo: d("2026-01-01"), ph: 5.0, fosforo: null },
  ];
  it("ordena del más antiguo al más reciente, sin importar el orden de entrada", () => {
    const t = tablaEvolucion(a);
    expect(t.fechas.map((f) => new Date(f).getUTCFullYear())).toEqual([2025, 2026, 2026]);
    expect(t.filas.find((f) => f.parametro.key === "ph")!.valores).toEqual([4.8, 5.0, 5.2]);
  });
  it("omite parámetros nunca medidos", () => {
    const keys = tablaEvolucion(a).filas.map((f) => f.parametro.key);
    expect(keys).toContain("ph");
    expect(keys).not.toContain("calcio");
    expect(keys).not.toContain("zinc");
  });
  it("la tendencia compara los dos últimos valores MEDIDOS (salta huecos)", () => {
    const p = tablaEvolucion(a).filas.find((f) => f.parametro.key === "fosforo")!;
    expect(p.valores).toEqual([8, null, 10]);
    expect(p.tendencia).toBe("sube");
  });
  it("un solo valor → sin tendencia", () => {
    expect(tablaEvolucion(a).filas.find((f) => f.parametro.key === "materiaOrganica")!.tendencia).toBeNull();
  });
  it("respeta el máximo de columnas (las más recientes)", () => {
    expect(tablaEvolucion(a, 2).fechas).toHaveLength(2);
  });
});

describe("relacionesCationicas", () => {
  it("calcula Ca/Mg, Mg/K y (Ca+Mg)/K", () => {
    const r = relacionesCationicas({ calcio: 6, magnesio: 2, potasio: 0.4 });
    expect(r.caMg).toBe(3);
    expect(r.mgK).toBe(5);
    expect(r.caMgK).toBe(20);
  });
  it("saturación de Al solo si están todas las bases", () => {
    expect(relacionesCationicas({ calcio: 3, magnesio: 1, potasio: 0.5, sodio: 0.5, aluminio: 1 }).saturacionAl).toBeCloseTo(16.6667, 3);
    expect(relacionesCationicas({ calcio: 3, magnesio: 1, aluminio: 1 }).saturacionAl).toBeNull();
  });
  it("divisor cero o ausente → null (nunca Infinity)", () => {
    expect(relacionesCationicas({ calcio: 3, magnesio: 0 }).caMg).toBeNull();
    expect(relacionesCationicas({}).caMg).toBeNull();
  });
});

describe("mesesDesdeUltimo / fmtValor", () => {
  it("meses COMPLETOS desde el análisis más reciente", () => {
    expect(mesesDesdeUltimo([{ fechaMuestreo: d("2025-01-01") }, { fechaMuestreo: d("2026-01-01") }], d("2026-09-01"))).toBe(7);
  });
  it("sin análisis → null", () => expect(mesesDesdeUltimo([])).toBeNull());
  it("formatea con decimales y guion para vacío", () => {
    expect(fmtValor(null, 2)).toBe("—");
    expect(fmtValor(5.2, 2)).toBe("5,2");
  });
});
