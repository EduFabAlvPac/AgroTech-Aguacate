import { describe, it, expect } from "vitest";
import { motivoBloqueoBorrado } from "@/lib/borrado-guardas";

const vacio = { ingresos: 0, jornales: 0, inversiones: 0 };

describe("motivoBloqueoBorrado", () => {
  it("permite borrar sin ingresos, jornales ni inversiones (los gastos no bloquean)", () => {
    expect(motivoBloqueoBorrado("cultivo", "Aguacate Hass", vacio)).toBeNull();
    expect(motivoBloqueoBorrado("lote", "Lote 1", vacio)).toBeNull();
  });

  it("bloquea si hay ingresos y dice dónde resolverlo", () => {
    const m = motivoBloqueoBorrado("cultivo", "Aguacate Hass", { ...vacio, ingresos: 1 })!;
    expect(m).toContain("1 ingreso");
    expect(m).toContain("Aguacate Hass");
    expect(m).toContain("Finanzas");
  });

  it("bloquea por inversiones de inversionistas (se borrarían en cascada)", () => {
    const m = motivoBloqueoBorrado("lote", "Lote Norte", { ...vacio, inversiones: 2 })!;
    expect(m).toContain("el lote «Lote Norte»");
    expect(m).toContain("2 inversiones de inversionistas");
    expect(m).toContain("Inversionistas");
  });

  it("junta todo con plurales correctos", () => {
    const m = motivoBloqueoBorrado("cultivo", "X", { ingresos: 3, jornales: 1, inversiones: 1 })!;
    expect(m).toContain("3 ingresos, 1 jornal, 1 inversión de un inversionista");
  });

  it("bloquea por siniestros de seguro (evidencia de un reclamo)", () => {
    const m = motivoBloqueoBorrado("cultivo", "Café", { ...vacio, siniestros: 2 })!;
    expect(m).toContain("2 siniestros de seguro");
    expect(m).toContain("Seguros");
  });
});
