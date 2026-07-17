/**
 * Geodesic area calculation and polygon validation utilities.
 *
 * Uses the Spherical Excess formula for WGS84 ellipsoid approximation.
 * No external dependencies required.
 */

/** WGS84 mean Earth radius in meters */
const EARTH_RADIUS = 6371008.8;

/** Square meters per hectare */
const SQ_METERS_PER_HECTARE = 10000;

/** Minimum area in hectares */
const MIN_AREA_HA = 0.01;

/** Maximum area in hectares */
const MAX_AREA_HA = 10000;

/**
 * Convert degrees to radians.
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate the geodesic area of a polygon on the WGS84 sphere
 * using the Spherical Excess formula.
 *
 * Coordinates are in GeoJSON format: [longitude, latitude].
 * The polygon can be open or closed (first === last coordinate).
 *
 * Returns area in hectáreas, rounded to 2 decimal places,
 * clamped to [0.01, 10000].
 */
export function calculateGeodesicArea(coordinates: [number, number][]): number {
  if (coordinates.length < 3) {
    return MIN_AREA_HA;
  }

  // Work with a copy, ensure ring is not closed for the calculation
  let ring = [...coordinates];

  // If the ring is closed (first === last), remove the duplicate closing point
  if (
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  ) {
    ring = ring.slice(0, -1);
  }

  if (ring.length < 3) {
    return MIN_AREA_HA;
  }

  // Calculate spherical excess using the formula:
  // Area = |R² * Σ (λ[i+1] - λ[i-1]) * sin(φ[i])| for the spherical polygon
  // This is the simplified spherical excess formula for area on a sphere.
  const n = ring.length;
  let sum = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const k = (i + 2) % n;

    const lam1 = toRadians(ring[i][0]);
    const lam2 = toRadians(ring[j][0]);
    const lam3 = toRadians(ring[k][0]);
    const phi2 = toRadians(ring[j][1]);

    sum += (lam3 - lam1) * Math.sin(phi2);
  }

  // Area in square meters (absolute value, as winding order may vary)
  const areaM2 = Math.abs((sum * EARTH_RADIUS * EARTH_RADIUS) / 2);

  // Convert to hectares
  let areaHa = areaM2 / SQ_METERS_PER_HECTARE;

  // Round to 2 decimal places
  areaHa = Math.round(areaHa * 100) / 100;

  // Clamp to valid range
  areaHa = Math.max(MIN_AREA_HA, Math.min(MAX_AREA_HA, areaHa));

  return areaHa;
}

/**
 * Check if two line segments (p1-p2 and p3-p4) intersect.
 * Uses the cross product orientation method.
 * Returns true if segments properly intersect (not just share an endpoint).
 */
function segmentsIntersect(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number]
): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;

  return false;
}

/**
 * Cross product direction: (p2-p1) × (p3-p1)
 */
function direction(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number]
): number {
  return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
}

/**
 * Check if point p is on segment (p1, p2), given that the three are collinear.
 */
function onSegment(
  p1: [number, number],
  p2: [number, number],
  p: [number, number]
): boolean {
  return (
    Math.min(p1[0], p2[0]) <= p[0] &&
    p[0] <= Math.max(p1[0], p2[0]) &&
    Math.min(p1[1], p2[1]) <= p[1] &&
    p[1] <= Math.max(p1[1], p2[1])
  );
}

/**
 * Detect if a polygon is self-intersecting.
 *
 * Checks all non-adjacent edge pairs for intersection.
 * Coordinates can be open or closed (first === last).
 */
export function isSelfIntersecting(coordinates: [number, number][]): boolean {
  if (coordinates.length < 4) {
    return false;
  }

  // Ensure ring is closed for edge construction
  let ring = [...coordinates];
  if (
    ring[0][0] !== ring[ring.length - 1][0] ||
    ring[0][1] !== ring[ring.length - 1][1]
  ) {
    ring.push(ring[0]);
  }

  const n = ring.length - 1; // number of edges (closed ring has n+1 points, n edges)

  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      // Skip adjacent edges (they share a vertex)
      if (i === 0 && j === n - 1) continue;

      if (segmentsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate a polygon for use in the lote system.
 *
 * Checks:
 * - At least 3 unique vertices
 * - Coordinates within valid WGS84 ranges (longitude [-180, 180], latitude [-90, 90])
 * - Not self-intersecting
 *
 * Coordinates are in GeoJSON format: [longitude, latitude].
 * Accepts both open and closed rings (first === last).
 */
export function isValidPolygon(
  coordinates: [number, number][]
): { valid: boolean; error?: string } {
  if (!coordinates || coordinates.length < 3) {
    // If closed ring with less than 4 points (3 unique + closing), it's invalid
    if (coordinates && coordinates.length === 3) {
      // Check if it's a closed ring with only 2 unique vertices
      if (
        coordinates[0][0] === coordinates[2][0] &&
        coordinates[0][1] === coordinates[2][1]
      ) {
        return { valid: false, error: 'El polígono debe tener al menos 3 vértices únicos' };
      }
      // 3 open points is valid
    } else {
      return { valid: false, error: 'El polígono debe tener al menos 3 vértices únicos' };
    }
  }

  // Get unique vertices (remove closing point if ring is closed)
  let ring = [...coordinates];
  if (
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  ) {
    ring = ring.slice(0, -1);
  }

  if (ring.length < 3) {
    return { valid: false, error: 'El polígono debe tener al menos 3 vértices únicos' };
  }

  // Validate coordinate ranges
  for (const coord of ring) {
    const [lng, lat] = coord;
    if (lng < -180 || lng > 180) {
      return { valid: false, error: `Longitud fuera de rango: ${lng}. Debe estar entre -180 y 180` };
    }
    if (lat < -90 || lat > 90) {
      return { valid: false, error: `Latitud fuera de rango: ${lat}. Debe estar entre -90 y 90` };
    }
  }

  // Check for self-intersection
  if (isSelfIntersecting(coordinates)) {
    return { valid: false, error: 'El polígono no es válido: las líneas no deben cruzarse' };
  }

  return { valid: true };
}
