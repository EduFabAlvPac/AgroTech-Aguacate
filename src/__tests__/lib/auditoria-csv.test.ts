import { describe, it, expect } from "vitest";
import { filasACSV } from "@/lib/auditoria-csv";

describe("filasACSV — ADR-011 Sprint 5, exportar auditoría", () => {
  it("arma encabezado + una fila por evento, todo entre comillas", () => {
    const csv = filasACSV([
      {
        createdAt: new Date("2026-09-23T10:00:00.000Z"),
        actorEmail: "dueno@ejemplo.co",
        accion: "equipo.editar",
        resultado: "EXITO",
        detalle: { membresiaId: "m1" },
      },
    ]);
    const [encabezado, fila] = csv.split("\r\n");
    expect(encabezado).toBe('"Fecha","Quién","Acción","Resultado","Detalle"');
    expect(fila).toContain('"dueno@ejemplo.co"');
    expect(fila).toContain('"equipo.editar"');
    expect(fila).toContain('"EXITO"');
    expect(fila).toContain('{""membresiaId"":""m1""}'); // JSON dentro de una celda CSV: comillas duplicadas
  });

  it("actorEmail null se exporta como celda vacía, no como el texto 'null'", () => {
    const csv = filasACSV([
      { createdAt: new Date(), actorEmail: null, accion: "auth.cuenta_bloqueada", resultado: "DENEGADO", detalle: null },
    ]);
    const [, fila] = csv.split("\r\n");
    expect(fila.startsWith('"2')).toBe(true); // fecha primero
    expect(fila).toContain('"",');
  });

  it("un valor con comas o comillas dentro no rompe el CSV (se escapa)", () => {
    const csv = filasACSV([
      {
        createdAt: new Date(),
        actorEmail: 'raro "con comillas", y coma@ejemplo.co',
        accion: "equipo.editar",
        resultado: "EXITO",
        detalle: null,
      },
    ]);
    const [, fila] = csv.split("\r\n");
    expect(fila).toContain('""con comillas""');
  });

  it("sin filas, produce solo el encabezado", () => {
    const csv = filasACSV([]);
    expect(csv.split("\r\n")).toHaveLength(1);
  });
});
