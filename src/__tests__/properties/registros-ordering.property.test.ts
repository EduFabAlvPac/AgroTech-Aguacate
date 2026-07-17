import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 4: Registros are always displayed in descending date order
 *
 * **Validates: Requirements 6.2**
 *
 * For any array of registros with random fechas, after applying the sort logic
 * used in CultivosList, all consecutive pairs (i, i+1) satisfy fecha[i] >= fecha[i+1].
 */

// Replicate the sort logic from CultivosList
function sortRegistrosByFechaDescending<T extends { fecha: string | Date }>(
  registros: T[]
): T[] {
  return [...registros].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
}

// Generate a valid ISO date string within a reasonable range
const fechaArbitrary = fc
  .integer({
    min: new Date("2000-01-01T00:00:00.000Z").getTime(),
    max: new Date("2030-12-31T23:59:59.999Z").getTime(),
  })
  .map((ts) => new Date(ts).toISOString());

// Arbitrary that generates a registro-like object with a random fecha
const registroArbitrary = fc.record({
  id: fc.uuid(),
  fecha: fechaArbitrary,
  tipo: fc.constantFrom(
    "FERTILIZACION",
    "RIEGO",
    "PODA",
    "FUMIGACION",
    "COSECHA",
    "OBSERVACION",
    "OTRO"
  ),
  descripcion: fc.string({ minLength: 10, maxLength: 200 }),
});

describe("Property 4: Registros are always displayed in descending date order", () => {
  it("sorted registros maintain descending date invariant for all generated arrays", () => {
    fc.assert(
      fc.property(
        fc.array(registroArbitrary, { minLength: 0, maxLength: 50 }),
        (registros) => {
          const sorted = sortRegistrosByFechaDescending(registros);

          // For all consecutive pairs, fecha[i] >= fecha[i+1]
          for (let i = 0; i < sorted.length - 1; i++) {
            const currentDate = new Date(sorted[i].fecha).getTime();
            const nextDate = new Date(sorted[i + 1].fecha).getTime();
            expect(currentDate).toBeGreaterThanOrEqual(nextDate);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("empty arrays remain empty after sort", () => {
    fc.assert(
      fc.property(fc.constant([]), (registros) => {
        const sorted = sortRegistrosByFechaDescending(registros);
        expect(sorted).toHaveLength(0);
      }),
      { numRuns: 1 }
    );
  });

  it("single element arrays remain unchanged after sort", () => {
    fc.assert(
      fc.property(
        fc.array(registroArbitrary, { minLength: 1, maxLength: 1 }),
        (registros) => {
          const sorted = sortRegistrosByFechaDescending(registros);
          expect(sorted).toHaveLength(1);
          expect(sorted[0].fecha).toBe(registros[0].fecha);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("arrays with duplicate dates maintain descending order invariant", () => {
    fc.assert(
      fc.property(
        fechaArbitrary,
        fc.integer({ min: 2, max: 20 }),
        (sharedFecha, count) => {
          // Create registros that all share the same date
          const registros = Array.from({ length: count }, (_, i) => ({
            id: `id-${i}`,
            fecha: sharedFecha,
            tipo: "OBSERVACION",
            descripcion: `Registro duplicado ${i}`,
          }));

          const sorted = sortRegistrosByFechaDescending(registros);

          // All dates should be equal, so descending invariant still holds
          for (let i = 0; i < sorted.length - 1; i++) {
            const currentDate = new Date(sorted[i].fecha).getTime();
            const nextDate = new Date(sorted[i + 1].fecha).getTime();
            expect(currentDate).toBeGreaterThanOrEqual(nextDate);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("sort does not lose or duplicate elements", () => {
    fc.assert(
      fc.property(
        fc.array(registroArbitrary, { minLength: 0, maxLength: 50 }),
        (registros) => {
          const sorted = sortRegistrosByFechaDescending(registros);

          // Same length
          expect(sorted).toHaveLength(registros.length);

          // Same elements (by id)
          const originalIds = registros.map((r) => r.id).sort();
          const sortedIds = sorted.map((r) => r.id).sort();
          expect(sortedIds).toEqual(originalIds);
        }
      ),
      { numRuns: 100 }
    );
  });
});
