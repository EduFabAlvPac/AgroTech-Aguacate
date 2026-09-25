import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { evaluarReglasBorradoFinca, mensajeErrorBorrado, type DependenciasFinca } from "@/lib/finca-borrado";

const VACIA: DependenciasFinca = { lotes: 0, cultivos: 0, gastos: 0, presupuestos: 0, ingresos: 0, jornales: 0 };
const dueno = { esUltimaFincaDeLaOrganizacion: false, esSuperAdmin: false };

describe("evaluarReglasBorradoFinca", () => {
  it("una finca sin nada, y no la última, se puede eliminar", () => {
    expect(evaluarReglasBorradoFinca("El Juncal", VACIA, dueno)).toEqual({ permitido: true });
  });

  it("con gastos y presupuestos: bloquea y DICE cuáles (antes: 'Error al eliminar la finca')", () => {
    const r = evaluarReglasBorradoFinca("El Juncal", { ...VACIA, gastos: 12, presupuestos: 1 }, dueno);
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("DEPENDENCIAS");
    expect(r.mensaje).toContain("12 gastos");
    expect(r.mensaje).toContain("1 presupuesto");
    expect(r.mensaje).toContain("Finanzas");
    expect(r.mensaje).not.toMatch(/Error/);
  });

  it("con lotes y cultivos indica el camino (Cultivos o el Mapa) y usa singular/plural correcto", () => {
    const r = evaluarReglasBorradoFinca("Finca A", { ...VACIA, lotes: 1, cultivos: 2 }, dueno);
    expect(r.mensaje).toContain("1 lote,");
    expect(r.mensaje).toContain("2 cultivos");
    expect(r.mensaje).toContain("Cultivos o el Mapa");
  });

  it("la última finca de la organización se protege para un dueño, con el siguiente paso", () => {
    const r = evaluarReglasBorradoFinca("Finca A", VACIA, { esUltimaFincaDeLaOrganizacion: true, esSuperAdmin: false });
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("UNICA");
    expect(r.mensaje).toContain("Crea otra finca primero");
  });

  it("el Super Admin queda exento de la regla de la última finca (limpieza / soporte)…", () => {
    expect(evaluarReglasBorradoFinca("Finca prueba", VACIA, { esUltimaFincaDeLaOrganizacion: true, esSuperAdmin: true })).toEqual({ permitido: true });
  });

  it("…pero NO se salta la protección de los datos: con gastos sigue bloqueado", () => {
    const r = evaluarReglasBorradoFinca("Finca prueba", { ...VACIA, gastos: 1 }, { esUltimaFincaDeLaOrganizacion: true, esSuperAdmin: true });
    expect(r.permitido).toBe(false);
  });
});

describe("mensajeErrorBorrado", () => {
  const err = (code: string) => new Prisma.PrismaClientKnownRequestError("x", { code, clientVersion: "test" });
  it("traduce las llaves foráneas (P2003/P2014) a un mensaje humano", () => {
    expect(mensajeErrorBorrado(err("P2003"))).toMatch(/registros asociados/);
    expect(mensajeErrorBorrado(err("P2014"))).toMatch(/registros asociados/);
  });
  it("P2025 = ya no existe", () => {
    expect(mensajeErrorBorrado(err("P2025"))).toMatch(/ya no existe/);
  });
  it("un error desconocido devuelve null (el caller usa su mensaje genérico)", () => {
    expect(mensajeErrorBorrado(new Error("boom"))).toBeNull();
    expect(mensajeErrorBorrado(err("P9999"))).toBeNull();
  });
});
