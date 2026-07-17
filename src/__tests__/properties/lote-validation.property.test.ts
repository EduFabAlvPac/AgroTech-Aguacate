import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { loteFormSchema } from '@/lib/validations'

/**
 * Property 1: Lote validation accepts valid data and rejects invalid data
 *
 * For any lote payload where nombre has 1–100 characters, areaHa is between 0.01 and 10000,
 * altitud (if present) is between 0 and 5000, and pendiente (if present) is between 0 and 90,
 * the loteFormSchema.safeParse SHALL return success. For any payload where any field violates
 * these constraints, the schema SHALL return failure with appropriate error messages.
 *
 * **Validates: Requirements 1.2, 2.2**
 */
describe('Property 1: Lote validation accepts valid data and rejects invalid data', () => {
  // Arbitraries for valid lote data
  const validNombre = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length >= 1)
  const validAreaHa = fc.double({ min: 0.01, max: 10000, noNaN: true })
  const validAltitud = fc.option(fc.double({ min: 0, max: 5000, noNaN: true }), { nil: undefined })
  const validPendiente = fc.option(fc.double({ min: 0, max: 90, noNaN: true }), { nil: undefined })
  const validNotas = fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined })
  const validFincaId = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1)

  const validLotePayload = fc.record({
    nombre: validNombre,
    areaHa: validAreaHa,
    altitud: validAltitud,
    pendiente: validPendiente,
    notas: validNotas,
    fincaId: validFincaId,
  })

  it('should accept any valid lote payload', () => {
    fc.assert(
      fc.property(validLotePayload, (payload) => {
        const result = loteFormSchema.safeParse(payload)
        expect(result.success).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should reject lote with empty nombre', () => {
    fc.assert(
      fc.property(
        fc.record({
          nombre: fc.constant(''),
          areaHa: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          altitud: validAltitud,
          pendiente: validPendiente,
          notas: validNotas,
          fincaId: validFincaId,
        }),
        (payload) => {
          const result = loteFormSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject lote with nombre longer than 100 characters', () => {
    fc.assert(
      fc.property(
        fc.record({
          nombre: fc.string({ minLength: 101, maxLength: 200 }),
          areaHa: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          altitud: validAltitud,
          pendiente: validPendiente,
          notas: validNotas,
          fincaId: validFincaId,
        }),
        (payload) => {
          const result = loteFormSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject lote with areaHa below 0.01', () => {
    fc.assert(
      fc.property(
        fc.record({
          nombre: validNombre,
          areaHa: fc.double({ min: -1000, max: 0.009, noNaN: true }),
          altitud: validAltitud,
          pendiente: validPendiente,
          notas: validNotas,
          fincaId: validFincaId,
        }),
        (payload) => {
          const result = loteFormSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject lote with areaHa above 10000', () => {
    fc.assert(
      fc.property(
        fc.record({
          nombre: validNombre,
          areaHa: fc.double({ min: 10000.01, max: 100000, noNaN: true }),
          altitud: validAltitud,
          pendiente: validPendiente,
          notas: validNotas,
          fincaId: validFincaId,
        }),
        (payload) => {
          const result = loteFormSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject lote with altitud below 0', () => {
    fc.assert(
      fc.property(
        fc.record({
          nombre: validNombre,
          areaHa: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          altitud: fc.double({ min: -1000, max: -0.01, noNaN: true }),
          pendiente: validPendiente,
          notas: validNotas,
          fincaId: validFincaId,
        }),
        (payload) => {
          const result = loteFormSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject lote with altitud above 5000', () => {
    fc.assert(
      fc.property(
        fc.record({
          nombre: validNombre,
          areaHa: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          altitud: fc.double({ min: 5000.01, max: 10000, noNaN: true }),
          pendiente: validPendiente,
          notas: validNotas,
          fincaId: validFincaId,
        }),
        (payload) => {
          const result = loteFormSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject lote with pendiente below 0', () => {
    fc.assert(
      fc.property(
        fc.record({
          nombre: validNombre,
          areaHa: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          altitud: validAltitud,
          pendiente: fc.double({ min: -90, max: -0.01, noNaN: true }),
          notas: validNotas,
          fincaId: validFincaId,
        }),
        (payload) => {
          const result = loteFormSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject lote with pendiente above 90', () => {
    fc.assert(
      fc.property(
        fc.record({
          nombre: validNombre,
          areaHa: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          altitud: validAltitud,
          pendiente: fc.double({ min: 90.01, max: 180, noNaN: true }),
          notas: validNotas,
          fincaId: validFincaId,
        }),
        (payload) => {
          const result = loteFormSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject lote with empty fincaId', () => {
    fc.assert(
      fc.property(
        fc.record({
          nombre: validNombre,
          areaHa: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          altitud: validAltitud,
          pendiente: validPendiente,
          notas: validNotas,
          fincaId: fc.constant(''),
        }),
        (payload) => {
          const result = loteFormSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject lote with notas longer than 500 characters', () => {
    fc.assert(
      fc.property(
        fc.record({
          nombre: validNombre,
          areaHa: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          altitud: validAltitud,
          pendiente: validPendiente,
          notas: fc.string({ minLength: 501, maxLength: 600 }),
          fincaId: validFincaId,
        }),
        (payload) => {
          const result = loteFormSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})
