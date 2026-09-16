import { describe, it, expect } from "vitest";
import { calcularFaseLunar } from "@/lib/fase-lunar";

describe("calcularFaseLunar", () => {
  it("identifica luna nueva en la fecha de referencia exacta", () => {
    const r = calcularFaseLunar(new Date(Date.UTC(2000, 0, 6, 18, 14, 0)));
    expect(r.nombre).toBe("LUNA_NUEVA");
    expect(r.edadDias).toBeCloseTo(0, 1);
  });

  it("identifica luna llena a mitad del ciclo sinódico", () => {
    // ~14.77 días después de una luna nueva de referencia.
    const r = calcularFaseLunar(new Date(Date.UTC(2000, 0, 21, 12, 0, 0)));
    expect(r.nombre).toBe("LUNA_LLENA");
  });

  it("la edad en días siempre está entre 0 y ~29.53 (nunca negativa)", () => {
    // Fecha ANTES de la referencia — probaría un módulo mal implementado
    // (JS % puede devolver negativos con operandos negativos).
    const r = calcularFaseLunar(new Date(Date.UTC(1999, 0, 1)));
    expect(r.edadDias).toBeGreaterThanOrEqual(0);
    expect(r.edadDias).toBeLessThan(29.53058853);
  });

  it("el ciclo se repite cada ~29.53 días (misma fase, misma hora, un ciclo después)", () => {
    const base = new Date(Date.UTC(2026, 5, 15, 10, 0, 0));
    const unCicloDespues = new Date(base.getTime() + 29.530588853 * 86_400_000);
    const faseBase = calcularFaseLunar(base);
    const faseDespues = calcularFaseLunar(unCicloDespues);
    expect(faseDespues.nombre).toBe(faseBase.nombre);
  });
});
