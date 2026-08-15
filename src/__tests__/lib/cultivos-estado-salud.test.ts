import { describe, it, expect } from "vitest";
import { calcularEstadoSalud } from "@/lib/data/cultivos";

describe("calcularEstadoSalud", () => {
  it("'requiere_atencion' si sigue en PREPARACION sin fecha de siembra", () => {
    const r = calcularEstadoSalud({ etapa: "PREPARACION", fechaSiembra: null, registros: [] });
    expect(r).toBe("requiere_atencion");
  });

  it("'requiere_atencion' si no tiene ningún registro de bitácora", () => {
    const r = calcularEstadoSalud({ etapa: "CRECIMIENTO", fechaSiembra: new Date("2025-01-01"), registros: [] });
    expect(r).toBe("requiere_atencion");
  });

  it("'requiere_atencion' si el último registro tiene más de 21 días", () => {
    const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const r = calcularEstadoSalud({ etapa: "CRECIMIENTO", fechaSiembra: new Date("2025-01-01"), registros: [{ fecha: hace30dias }] });
    expect(r).toBe("requiere_atencion");
  });

  it("'saludable' si el último registro tiene 5 días (dentro del umbral)", () => {
    const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const r = calcularEstadoSalud({ etapa: "CRECIMIENTO", fechaSiembra: new Date("2025-01-01"), registros: [{ fecha: hace5dias }] });
    expect(r).toBe("saludable");
  });

  it("'saludable' justo en el borde de 21 días", () => {
    const hace21dias = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
    const r = calcularEstadoSalud({ etapa: "CRECIMIENTO", fechaSiembra: new Date("2025-01-01"), registros: [{ fecha: hace21dias }] });
    expect(r).toBe("saludable");
  });
});
