import { describe, it, expect } from "vitest";
import { construirMenu } from "@/lib/navegacion";

const labels = (o: Parameters<typeof construirMenu>[0]) => construirMenu(o).map((i) => i.label);

describe("construirMenu", () => {
  it("dueño: recorrido de principio a fin", () => {
    expect(labels({ esOwner: true, esSuperAdmin: false, modulosPermitidos: "ALL" })).toEqual([
      "Dashboard", "Mapa", "Cultivos", "Alertas", "Asistente IA", "Seguros", "Finanzas", "Inversionistas", "Compradores", "Equipo",
    ]);
  });

  it("Super Admin: agrega la sección Plataforma al final", () => {
    const m = construirMenu({ esOwner: true, esSuperAdmin: true, modulosPermitidos: "ALL" });
    const plataforma = m.filter((i) => i.seccion === "plataforma").map((i) => i.label);
    expect(plataforma).toEqual(["Organizaciones (todas)", "Fichas técnicas", "Precios de mercado", "Tienda (insumos)", "Auditoría"]);
    expect(m.slice(-5).every((i) => i.seccion === "plataforma")).toBe(true);
  });

  it("colaborador: solo los módulos que el dueño le habilitó, sin Inversionistas ni Equipo", () => {
    expect(labels({ esOwner: false, esSuperAdmin: false, modulosPermitidos: ["cultivos", "alertas", "seguros"] })).toEqual(["Dashboard", "Cultivos", "Alertas", "Seguros"]);
  });

  it("colaborador sin ningún módulo: solo Dashboard", () => {
    expect(labels({ esOwner: false, esSuperAdmin: false, modulosPermitidos: [] })).toEqual(["Dashboard"]);
  });

  it("nunca muestra Configuración ni Cerrar sesión (viven en el menú del avatar)", () => {
    const todos = labels({ esOwner: true, esSuperAdmin: true, modulosPermitidos: "ALL" });
    expect(todos).not.toContain("Configuración");
    expect(todos).not.toContain("Cerrar sesión");
  });

  it("sin duplicados de ruta", () => {
    const hrefs = construirMenu({ esOwner: true, esSuperAdmin: true, modulosPermitidos: "ALL" }).map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
