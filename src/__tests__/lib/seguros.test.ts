import { describe, it, expect } from "vitest";
import { vigenciaPoliza, diasParaVencer, polizaCubre, riesgoDesdeAlerta, ventanaEvidencia, perdidaSugerida } from "@/lib/seguros";
import { polizaSchema, siniestroSchema } from "@/lib/validations";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const base = { estado: "ACTIVA" as const, fechaInicio: d("2026-01-01"), fechaFin: d("2026-12-31"), riesgos: ["SEQUIA" as const, "EXCESO_LLUVIA" as const], cultivoIds: ["c1"] };

describe("vigenciaPoliza", () => {
  it("VIGENTE en medio de la vigencia", () => expect(vigenciaPoliza(base, d("2026-06-01"))).toBe("VIGENTE"));
  it("POR_VENCER dentro de los 30 días finales", () => expect(vigenciaPoliza(base, d("2026-12-10"))).toBe("POR_VENCER"));
  it("VENCIDA después de fechaFin", () => expect(vigenciaPoliza(base, d("2027-01-05"))).toBe("VENCIDA"));
  it("NO_INICIADA antes de fechaInicio", () => expect(vigenciaPoliza(base, d("2025-12-01"))).toBe("NO_INICIADA"));
  it("CANCELADA manda sobre las fechas", () => expect(vigenciaPoliza({ ...base, estado: "CANCELADA" }, d("2026-06-01"))).toBe("CANCELADA"));
  it("diasParaVencer es negativo cuando ya venció", () => expect(diasParaVencer(d("2026-01-01"), d("2026-01-11"))).toBeLessThan(0));
});

describe("polizaCubre", () => {
  it("cubre cultivo + riesgo + fecha del evento", () => expect(polizaCubre(base, "c1", "SEQUIA", d("2026-05-05"))).toBe(true));
  it("no cubre un cultivo no asociado", () => expect(polizaCubre(base, "c2", "SEQUIA", d("2026-05-05"))).toBe(false));
  it("no cubre un riesgo no contratado", () => expect(polizaCubre(base, "c1", "GRANIZO", d("2026-05-05"))).toBe(false));
  it("no cubre eventos fuera de la vigencia (aunque hoy la registres)", () => expect(polizaCubre(base, "c1", "SEQUIA", d("2027-02-01"))).toBe(false));
  it("una póliza cancelada no cubre", () => expect(polizaCubre({ ...base, estado: "CANCELADA" }, "c1", "SEQUIA", d("2026-05-05"))).toBe(false));
});

describe("riesgoDesdeAlerta / evidencia / pérdida", () => {
  it("mapea alertas asegurables y descarta las que no lo son", () => {
    expect(riesgoDesdeAlerta("LLUVIA_EXCESIVA")).toBe("EXCESO_LLUVIA");
    expect(riesgoDesdeAlerta("VIENTO_FUERTE")).toBe("VIENTOS_FUERTES");
    expect(riesgoDesdeAlerta("ACTIVIDAD")).toBeNull();
    expect(riesgoDesdeAlerta("TEMPERATURA_ALTA")).toBeNull();
  });
  it("ventana de evidencia de ±7 días", () => {
    const v = ventanaEvidencia(d("2026-05-10"));
    expect(v.desde.toISOString().slice(0, 10)).toBe("2026-05-03");
    expect(v.hasta.toISOString().slice(0, 10)).toBe("2026-05-17");
  });
  it("pérdida sugerida = suma asegurada × % daño", () => {
    expect(perdidaSugerida(10_000_000, 30)).toBe(3_000_000);
    expect(perdidaSugerida(null, 30)).toBeNull();
    expect(perdidaSugerida(1000, null)).toBeNull();
  });
});

describe("polizaSchema", () => {
  const ok = { aseguradora: "Seguros Bolívar", riesgos: ["SEQUIA"], cultivoIds: ["c1"], fechaInicio: "2026-01-01", fechaFin: "2026-12-31" };
  it("acepta una póliza mínima válida", () => expect(polizaSchema.safeParse(ok).success).toBe(true));
  it("exige al menos un riesgo y un cultivo", () => {
    expect(polizaSchema.safeParse({ ...ok, riesgos: [] }).success).toBe(false);
    expect(polizaSchema.safeParse({ ...ok, cultivoIds: [] }).success).toBe(false);
  });
  it("rechaza vigencia invertida, prima negativa y deducible > 100", () => {
    expect(polizaSchema.safeParse({ ...ok, fechaInicio: "2026-12-31", fechaFin: "2026-01-01" }).success).toBe(false);
    expect(polizaSchema.safeParse({ ...ok, prima: -1 }).success).toBe(false);
    expect(polizaSchema.safeParse({ ...ok, deduciblePct: 120 }).success).toBe(false);
  });
});

describe("siniestroSchema", () => {
  const ok = { cultivoId: "c1", tipo: "SEQUIA", fechaEvento: "2026-05-01", descripcion: "Tres semanas sin lluvia, hojas caídas" };
  it("acepta un siniestro válido", () => expect(siniestroSchema.safeParse(ok).success).toBe(true));
  it("rechaza fecha futura, daño > 100 y descripción corta", () => {
    expect(siniestroSchema.safeParse({ ...ok, fechaEvento: "2099-01-01" }).success).toBe(false);
    expect(siniestroSchema.safeParse({ ...ok, porcentajeDanio: 150 }).success).toBe(false);
    expect(siniestroSchema.safeParse({ ...ok, descripcion: "poco" }).success).toBe(false);
  });
  it("máximo 6 fotos", () => expect(siniestroSchema.safeParse({ ...ok, imagenes: Array(7).fill("x") }).success).toBe(false));
});
