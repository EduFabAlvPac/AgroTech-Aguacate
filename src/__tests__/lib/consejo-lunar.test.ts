import { describe, it, expect } from "vitest";
import { CONSEJO_LUNAR } from "@/lib/consejo-lunar";
import type { NombreFaseLunar } from "@/lib/fase-lunar";

const FASES: NombreFaseLunar[] = [
  "LUNA_NUEVA",
  "CRECIENTE",
  "CUARTO_CRECIENTE",
  "GIBOSA_CRECIENTE",
  "LUNA_LLENA",
  "GIBOSA_MENGUANTE",
  "CUARTO_MENGUANTE",
  "MENGUANTE",
];

describe("CONSEJO_LUNAR", () => {
  it("tiene una recomendación completa para cada una de las 8 fases", () => {
    for (const fase of FASES) {
      expect(CONSEJO_LUNAR[fase].actividad.length).toBeGreaterThan(0);
      expect(CONSEJO_LUNAR[fase].texto.length).toBeGreaterThan(20);
    }
  });

  it("distingue creciente (sembrar) de menguante (podar) — no son el mismo texto", () => {
    expect(CONSEJO_LUNAR.CRECIENTE.texto).not.toBe(CONSEJO_LUNAR.MENGUANTE.texto);
    expect(CONSEJO_LUNAR.CRECIENTE.actividad).toMatch(/sembrar/i);
    expect(CONSEJO_LUNAR.CUARTO_MENGUANTE.actividad).toMatch(/podar/i);
  });
});
