import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 2: Lotes with active cultivos cannot be deleted
 *
 * The delete protection logic in `/api/lotes/[id]/route.ts` checks:
 * - Count cultivos where `estado === "ACTIVO"` for the given loteId
 * - If count > 0, deletion is rejected (409)
 * - If count === 0, deletion is allowed
 *
 * We extract this logic into a pure function and test it with fast-check.
 *
 * **Validates: Requirements 3.3**
 */

// EstadoCultivo values from Prisma schema
type EstadoCultivo = "ACTIVO" | "PAUSADO" | "FINALIZADO";

const ESTADOS: EstadoCultivo[] = ["ACTIVO", "PAUSADO", "FINALIZADO"];

/**
 * Pure function that mirrors the delete protection logic from the API route.
 * Returns true if the lote can be deleted (no active cultivos),
 * false if deletion should be blocked (at least one active cultivo).
 */
function canDeleteLote(cultivos: { estado: EstadoCultivo }[]): boolean {
  const activeCultivos = cultivos.filter((c) => c.estado === "ACTIVO").length;
  return activeCultivos === 0;
}

// Arbitrary for generating a cultivo with a random estado
const cultivoArb = fc.record({
  estado: fc.constantFrom(...ESTADOS),
});

describe("Property 2: Lotes with active cultivos cannot be deleted", () => {
  it("should reject deletion when at least one cultivo has estado ACTIVO", () => {
    fc.assert(
      fc.property(
        // Generate an array of cultivos where at least one is ACTIVO
        fc
          .array(cultivoArb, { minLength: 1 })
          .filter((arr) => arr.some((c) => c.estado === "ACTIVO")),
        (cultivos) => {
          expect(canDeleteLote(cultivos)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should allow deletion when all cultivos have estado PAUSADO or FINALIZADO (no ACTIVO)", () => {
    fc.assert(
      fc.property(
        // Generate an array of cultivos with only non-active states
        fc.array(
          fc.record({
            estado: fc.constantFrom(
              "PAUSADO" as EstadoCultivo,
              "FINALIZADO" as EstadoCultivo
            ),
          }),
          { minLength: 1 }
        ),
        (cultivos) => {
          expect(canDeleteLote(cultivos)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should allow deletion when there are no cultivos (empty array)", () => {
    fc.assert(
      fc.property(fc.constant([]), (cultivos) => {
        expect(canDeleteLote(cultivos)).toBe(true);
      }),
      { numRuns: 1 }
    );
  });

  it("should reject if and only if at least one cultivo is ACTIVO (bidirectional property)", () => {
    fc.assert(
      fc.property(
        fc.array(cultivoArb, { minLength: 0, maxLength: 20 }),
        (cultivos) => {
          const hasActive = cultivos.some((c) => c.estado === "ACTIVO");
          const deletionAllowed = canDeleteLote(cultivos);

          // The core property: deletion is allowed IFF there are no active cultivos
          expect(deletionAllowed).toBe(!hasActive);
        }
      ),
      { numRuns: 200 }
    );
  });
});
