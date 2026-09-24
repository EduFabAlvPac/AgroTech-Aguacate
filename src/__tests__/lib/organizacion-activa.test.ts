import { describe, it, expect } from "vitest";
import { elegirOrganizacionActiva, type MembresiaContexto } from "@/lib/organizacion-activa";

/**
 * Multi-organización — el resolver es una función PURA (sin cookies ni BD):
 * qué organización queda activa dado el valor de la cookie y las membresías.
 */
const m = (organizacionId: string, over: Partial<MembresiaContexto> = {}): MembresiaContexto => ({
  organizacionId,
  rol: "COLABORADOR",
  esRolPrimario: false,
  createdAt: new Date("2026-01-01"),
  ...over,
});

describe("elegirOrganizacionActiva", () => {
  it("sin membresías → null", () => {
    expect(elegirOrganizacionActiva([], "x")).toBeNull();
  });

  it("con una sola organización devuelve esa, con o sin cookie (usuarios actuales no cambian)", () => {
    const solo = [m("a", { rol: "OWNER" })];
    expect(elegirOrganizacionActiva(solo)?.organizacionId).toBe("a");
    expect(elegirOrganizacionActiva(solo, "otra-que-no-es-mia")?.organizacionId).toBe("a");
  });

  it("una cookie válida gana sobre cualquier prioridad", () => {
    const orgs = [m("a", { rol: "OWNER", esRolPrimario: true }), m("b")];
    expect(elegirOrganizacionActiva(orgs, "b")?.organizacionId).toBe("b");
  });

  it("una cookie de una organización ajena se ignora (no se puede 'entrar' a una org que no es mía)", () => {
    const orgs = [m("a", { rol: "OWNER" }), m("b")];
    expect(elegirOrganizacionActiva(orgs, "org-ajena")?.organizacionId).toBe("a");
  });

  it("sin cookie: la primaria; si no hay, la de OWNER más antigua; si no, la más antigua", () => {
    const vieja = new Date("2025-01-01");
    const nueva = new Date("2026-06-01");
    expect(
      elegirOrganizacionActiva([m("a", { createdAt: vieja }), m("b", { esRolPrimario: true, createdAt: nueva })])?.organizacionId
    ).toBe("b");
    expect(
      elegirOrganizacionActiva([m("a", { createdAt: vieja }), m("b", { rol: "OWNER", createdAt: nueva })])?.organizacionId
    ).toBe("b");
    expect(elegirOrganizacionActiva([m("b", { createdAt: nueva }), m("a", { createdAt: vieja })])?.organizacionId).toBe("a");
  });

  it("es determinístico: no depende del orden en que la BD devuelva las filas", () => {
    const a = m("a", { rol: "OWNER", createdAt: new Date("2025-01-01") });
    const b = m("b", { rol: "OWNER", createdAt: new Date("2026-01-01") });
    expect(elegirOrganizacionActiva([a, b])?.organizacionId).toBe("a");
    expect(elegirOrganizacionActiva([b, a])?.organizacionId).toBe("a");
  });
});
