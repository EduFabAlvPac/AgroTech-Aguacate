import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { registroFormSchema } from '@/lib/validations'

/**
 * Property 3: Registro validation accepts valid data and rejects invalid data
 *
 * For any registro payload where descripcion has 10–2000 characters, tipo is a
 * valid TipoRegistro enum value, and fecha is a non-empty string, the
 * registroFormSchema.safeParse SHALL return success. For any payload violating
 * these constraints, the schema SHALL return failure.
 *
 * **Validates: Requirements 4.2**
 */

const TIPO_REGISTRO_VALUES = [
  'SIEMBRA',
  'RIEGO',
  'FERTILIZACION',
  'PODA',
  'TRATAMIENTO_PLAGAS',
  'COSECHA',
  'OBSERVACION',
  'INSPECCION',
  'ALERTA',
] as const

describe('Property 3: Registro validation accepts valid data and rejects invalid data', () => {
  it('should accept any valid registro payload', () => {
    const fechaArb = fc.tuple(
      fc.integer({ min: 2000, max: 2099 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)

    const validRegistroArb = fc.record({
      tipo: fc.constantFrom(...TIPO_REGISTRO_VALUES),
      descripcion: fc.string({ minLength: 10, maxLength: 2000 }).filter(s => s.trim().length >= 10),
      fecha: fechaArb,
      cultivoId: fc.uuid(),
    })

    fc.assert(
      fc.property(validRegistroArb, (payload) => {
        const result = registroFormSchema.safeParse(payload)
        expect(result.success).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should reject registro with descripcion shorter than 10 characters', () => {
    const fechaArb = fc.tuple(
      fc.integer({ min: 2000, max: 2099 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)

    const shortDescArb = fc.record({
      tipo: fc.constantFrom(...TIPO_REGISTRO_VALUES),
      descripcion: fc.string({ minLength: 0, maxLength: 9 }),
      fecha: fechaArb,
      cultivoId: fc.uuid(),
    })

    fc.assert(
      fc.property(shortDescArb, (payload) => {
        const result = registroFormSchema.safeParse(payload)
        expect(result.success).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('should reject registro with descripcion longer than 2000 characters', () => {
    const fechaArb = fc.tuple(
      fc.integer({ min: 2000, max: 2099 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)

    const longDescArb = fc.record({
      tipo: fc.constantFrom(...TIPO_REGISTRO_VALUES),
      descripcion: fc.string({ minLength: 2001, maxLength: 3000 }),
      fecha: fechaArb,
      cultivoId: fc.uuid(),
    })

    fc.assert(
      fc.property(longDescArb, (payload) => {
        const result = registroFormSchema.safeParse(payload)
        expect(result.success).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('should reject registro with empty tipo', () => {
    const fechaArb = fc.tuple(
      fc.integer({ min: 2000, max: 2099 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)

    const emptyTipoArb = fc.record({
      tipo: fc.constant(''),
      descripcion: fc.string({ minLength: 10, maxLength: 2000 }).filter(s => s.trim().length >= 10),
      fecha: fechaArb,
      cultivoId: fc.uuid(),
    })

    fc.assert(
      fc.property(emptyTipoArb, (payload) => {
        const result = registroFormSchema.safeParse(payload)
        expect(result.success).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('should reject registro with empty fecha', () => {
    const emptyFechaArb = fc.record({
      tipo: fc.constantFrom(...TIPO_REGISTRO_VALUES),
      descripcion: fc.string({ minLength: 10, maxLength: 2000 }).filter(s => s.trim().length >= 10),
      fecha: fc.constant(''),
      cultivoId: fc.uuid(),
    })

    fc.assert(
      fc.property(emptyFechaArb, (payload) => {
        const result = registroFormSchema.safeParse(payload)
        expect(result.success).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('should reject registro with empty cultivoId', () => {
    const fechaArb = fc.tuple(
      fc.integer({ min: 2000, max: 2099 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)

    const emptyCultivoIdArb = fc.record({
      tipo: fc.constantFrom(...TIPO_REGISTRO_VALUES),
      descripcion: fc.string({ minLength: 10, maxLength: 2000 }).filter(s => s.trim().length >= 10),
      fecha: fechaArb,
      cultivoId: fc.constant(''),
    })

    fc.assert(
      fc.property(emptyCultivoIdArb, (payload) => {
        const result = registroFormSchema.safeParse(payload)
        expect(result.success).toBe(false)
      }),
      { numRuns: 100 }
    )
  })
})
