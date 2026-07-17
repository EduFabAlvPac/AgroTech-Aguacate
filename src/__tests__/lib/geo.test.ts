import { describe, it, expect } from 'vitest'
import { calculateGeodesicArea, isValidPolygon, isSelfIntersecting } from '@/lib/geo'

describe('calculateGeodesicArea', () => {
  it('should calculate area for a known polygon (approx 1 hectare square)', () => {
    // A roughly 100m x 100m square near the equator ≈ 1 hectare
    // At equator, 1 degree longitude ≈ 111,320m, so 0.001° ≈ 111.32m
    // 0.0009° lng × 0.0009° lat ≈ 100m × 100m ≈ 1 ha
    const square: [number, number][] = [
      [0, 0],
      [0.0009, 0],
      [0.0009, 0.0009],
      [0, 0.0009],
      [0, 0],
    ]
    const area = calculateGeodesicArea(square)
    // Should be approximately 1 hectare (±0.1 ha is acceptable for this estimate)
    expect(area).toBeGreaterThan(0.5)
    expect(area).toBeLessThan(1.5)
  })

  it('should return a positive number rounded to 2 decimal places', () => {
    const triangle: [number, number][] = [
      [-73.5, 7.0],
      [-73.4, 7.0],
      [-73.45, 7.1],
      [-73.5, 7.0],
    ]
    const area = calculateGeodesicArea(triangle)
    expect(area).toBeGreaterThan(0)
    // Check 2 decimal places
    const decimalPart = area.toString().split('.')
    if (decimalPart[1]) {
      expect(decimalPart[1].length).toBeLessThanOrEqual(2)
    }
  })

  it('should clamp very small areas to 0.01', () => {
    // A tiny polygon (essentially a point)
    const tiny: [number, number][] = [
      [0, 0],
      [0.0000001, 0],
      [0.0000001, 0.0000001],
      [0, 0],
    ]
    const area = calculateGeodesicArea(tiny)
    expect(area).toBe(0.01)
  })

  it('should clamp very large areas to 10000', () => {
    // A huge polygon (covers significant Earth area)
    const huge: [number, number][] = [
      [-90, -60],
      [90, -60],
      [90, 60],
      [-90, 60],
      [-90, -60],
    ]
    const area = calculateGeodesicArea(huge)
    expect(area).toBe(10000)
  })

  it('should handle open polygons (no closing coordinate)', () => {
    const open: [number, number][] = [
      [0, 0],
      [0.01, 0],
      [0.01, 0.01],
      [0, 0.01],
    ]
    const closed: [number, number][] = [...open, [0, 0]]
    expect(calculateGeodesicArea(open)).toBe(calculateGeodesicArea(closed))
  })

  it('should return minimum area for fewer than 3 points', () => {
    expect(calculateGeodesicArea([])).toBe(0.01)
    expect(calculateGeodesicArea([[0, 0]])).toBe(0.01)
    expect(calculateGeodesicArea([[0, 0], [1, 1]])).toBe(0.01)
  })
})

describe('isSelfIntersecting', () => {
  it('should return false for a simple square', () => {
    const square: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]
    expect(isSelfIntersecting(square)).toBe(false)
  })

  it('should return true for a bowtie (figure-8) polygon', () => {
    // This creates a self-intersecting polygon (bowtie shape)
    const bowtie: [number, number][] = [
      [0, 0],
      [1, 1],
      [1, 0],
      [0, 1],
      [0, 0],
    ]
    expect(isSelfIntersecting(bowtie)).toBe(true)
  })

  it('should return false for a triangle', () => {
    const triangle: [number, number][] = [
      [0, 0],
      [1, 0],
      [0.5, 1],
      [0, 0],
    ]
    expect(isSelfIntersecting(triangle)).toBe(false)
  })

  it('should return false for fewer than 4 coordinates', () => {
    expect(isSelfIntersecting([[0, 0], [1, 0], [0.5, 1]])).toBe(false)
  })
})

describe('isValidPolygon', () => {
  it('should accept a valid simple polygon', () => {
    const valid: [number, number][] = [
      [-73.5, 7.0],
      [-73.4, 7.0],
      [-73.45, 7.1],
      [-73.5, 7.0],
    ]
    expect(isValidPolygon(valid)).toEqual({ valid: true })
  })

  it('should reject polygon with fewer than 3 unique vertices', () => {
    const result = isValidPolygon([[0, 0], [1, 1]])
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should reject polygon with longitude out of range', () => {
    const invalid: [number, number][] = [
      [-200, 0],
      [0, 0],
      [0, 1],
      [-200, 0],
    ]
    const result = isValidPolygon(invalid)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Longitud fuera de rango')
  })

  it('should reject polygon with latitude out of range', () => {
    const invalid: [number, number][] = [
      [0, -100],
      [1, 0],
      [0, 1],
      [0, -100],
    ]
    const result = isValidPolygon(invalid)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Latitud fuera de rango')
  })

  it('should reject self-intersecting polygon', () => {
    const bowtie: [number, number][] = [
      [0, 0],
      [1, 1],
      [1, 0],
      [0, 1],
      [0, 0],
    ]
    const result = isValidPolygon(bowtie)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('las líneas no deben cruzarse')
  })

  it('should accept an open polygon (auto-close)', () => {
    const open: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
    expect(isValidPolygon(open)).toEqual({ valid: true })
  })

  it('should reject empty coordinates', () => {
    const result = isValidPolygon([])
    expect(result.valid).toBe(false)
  })
})
