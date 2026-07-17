import { z } from "zod";
import type { CategoriaGasto, TipoComprador, TipoRegistro } from "@prisma/client";

// ── Lotes ─────────────────────────────────────────────────────────────────────

export const loteFormSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "Máximo 100 caracteres"),
  areaHa: z
    .number({ invalid_type_error: "Debe ser un número" })
    .min(0.01, "Mínimo 0.01 ha")
    .max(10000, "Máximo 10000 ha"),
  altitud: z.number().min(0, "Mínimo 0 msnm").max(5000, "Máximo 5000 msnm").optional().nullable(),
  pendiente: z.number().min(0, "Mínimo 0°").max(90, "Máximo 90°").optional().nullable(),
  notas: z.string().max(500, "Máximo 500 caracteres").optional().nullable(),
  fincaId: z.string().min(1, "La finca es requerida"),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
});

export type LoteFormData = z.infer<typeof loteFormSchema>;

// ── GeoJSON Polygon Validation ────────────────────────────────────────────────

/** Validates a single coordinate position: [longitude, latitude] */
const coordinateSchema = z.tuple([
  z.number().min(-180, "Longitud debe estar entre -180 y 180").max(180, "Longitud debe estar entre -180 y 180"),
  z.number().min(-90, "Latitud debe estar entre -90 y 90").max(90, "Latitud debe estar entre -90 y 90"),
]);

/** Validates a linear ring: array of positions where first === last, at least 4 positions */
const linearRingSchema = z.array(coordinateSchema).refine(
  (ring) => ring.length >= 4,
  { message: "El anillo debe tener al menos 4 posiciones" }
).refine(
  (ring) => {
    if (ring.length < 4) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first[0] === last[0] && first[1] === last[1];
  },
  { message: "La primera y última posición del anillo deben ser idénticas" }
);

/** Validates a Polygon geometry with coordinates */
const polygonGeometrySchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(linearRingSchema).min(1, "Debe tener al menos un anillo de coordenadas"),
}).refine(
  (polygon) => {
    const totalPositions = polygon.coordinates.reduce((sum, ring) => sum + ring.length, 0);
    return totalPositions <= 100;
  },
  { message: "El polígono no puede exceder 100 coordenadas" }
);

/** Validates a GeoJSON Feature wrapping a Polygon geometry */
const featureWithPolygonSchema = z.object({
  type: z.literal("Feature"),
  geometry: polygonGeometrySchema,
  properties: z.record(z.unknown()).optional().nullable(),
});

/**
 * Validates GeoJSON Polygon or Feature with Polygon geometry.
 * - type: "Polygon" with valid coordinates
 * - type: "Feature" with geometry.type === "Polygon"
 * - Outer ring: at least 4 positions, first === last
 * - Max 100 total coordinate positions
 * - Longitude: [-180, 180], Latitude: [-90, 90]
 */
export const geoJsonPolygonSchema = z.union([polygonGeometrySchema, featureWithPolygonSchema]);

export type GeoJsonPolygonData = z.infer<typeof geoJsonPolygonSchema>;

/** Extends loteFormSchema with optional geoJson field for API create/update */
export const loteCreateWithGeoSchema = loteFormSchema.extend({
  geoJson: geoJsonPolygonSchema.optional().nullable(),
});

export type LoteCreateWithGeoData = z.infer<typeof loteCreateWithGeoSchema>;

/** Schema for updating a lote — all fields optional, geoJson nullable */
export const loteUpdateWithGeoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres").optional(),
  areaHa: z.number().min(0.01, "Mínimo 0.01 ha").max(10000, "Máximo 10000 ha").optional(),
  altitud: z.number().min(0, "Mínimo 0 msnm").max(5000, "Máximo 5000 msnm").optional().nullable(),
  pendiente: z.number().min(0, "Mínimo 0°").max(90, "Máximo 90°").optional().nullable(),
  notas: z.string().max(500, "Máximo 500 caracteres").optional().nullable(),
  geoJson: geoJsonPolygonSchema.optional().nullable(),
});

export type LoteUpdateWithGeoData = z.infer<typeof loteUpdateWithGeoSchema>;

// ── Registro de actividades de cultivo ───────────────────────────────────────

export const registroFormSchema = z.object({
  tipo: z.string().min(1, "El tipo de actividad es requerido") as z.ZodType<TipoRegistro>,
  descripcion: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(2000, "La descripción no puede superar los 2000 caracteres"),
  fecha: z.string().min(1, "La fecha es requerida"),
  cultivoId: z.string().min(1, "El cultivo es requerido"),
});

export type RegistroFormData = z.infer<typeof registroFormSchema>;

// ── Gastos ────────────────────────────────────────────────────────────────────

export const gastoFormSchema = z.object({
  concepto: z
    .string()
    .min(1, "El concepto del gasto es requerido")
    .max(200, "El concepto no puede superar los 200 caracteres"),
  categoria: z.string().min(1, "La categoría es requerida") as z.ZodType<CategoriaGasto>,
  monto: z
    .number({ invalid_type_error: "El monto debe ser un número" })
    .positive("El monto debe ser mayor que 0"),
  fecha: z.string().min(1, "La fecha es requerida"),
  proveedor: z.string().max(200, "El proveedor no puede superar los 200 caracteres").optional(),
  notas: z.string().max(1000, "Las notas no pueden superar los 1000 caracteres").optional(),
  cultivoId: z.string().optional(),
});

export type GastoFormData = z.infer<typeof gastoFormSchema>;

// ── Ingresos ──────────────────────────────────────────────────────────────────

export const ingresoFormSchema = z.object({
  concepto: z
    .string()
    .min(1, "El concepto del ingreso es requerido")
    .max(200, "El concepto no puede superar los 200 caracteres"),
  monto: z
    .number({ invalid_type_error: "El monto debe ser un número" })
    .positive("El monto debe ser mayor que 0"),
  cantidadKg: z
    .number({ invalid_type_error: "La cantidad debe ser un número" })
    .nonnegative("La cantidad no puede ser negativa")
    .optional(),
  fecha: z.string().min(1, "La fecha es requerida"),
  compradorId: z.string().optional(),
  cultivoId: z.string().optional(),
  notas: z.string().max(1000, "Las notas no pueden superar los 1000 caracteres").optional(),
});

export type IngresoFormData = z.infer<typeof ingresoFormSchema>;

// ── Compradores ───────────────────────────────────────────────────────────────

export const compradorFormSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre o razón social es requerido")
    .max(200, "El nombre no puede superar los 200 caracteres"),
  tipo: z.string().min(1, "El tipo de comprador es requerido") as z.ZodType<TipoComprador>,
  ciudad: z
    .string()
    .min(1, "La ciudad es requerida")
    .max(100, "La ciudad no puede superar los 100 caracteres"),
  departamento: z.string().max(100, "El departamento no puede superar los 100 caracteres").optional(),
  contacto: z.string().max(200, "El contacto no puede superar los 200 caracteres").optional(),
  email: z
    .string()
    .email("El email no tiene un formato válido")
    .max(200, "El email no puede superar los 200 caracteres")
    .optional()
    .or(z.literal("")),
  telefono: z.string().max(30, "El teléfono no puede superar los 30 caracteres").optional(),
  capacidadTon: z
    .number({ invalid_type_error: "La capacidad debe ser un número" })
    .nonnegative("La capacidad no puede ser negativa")
    .optional(),
  precioKg: z
    .number({ invalid_type_error: "El precio debe ser un número" })
    .nonnegative("El precio no puede ser negativo")
    .optional(),
  notas: z.string().max(1000, "Las notas no pueden superar los 1000 caracteres").optional(),
  estado: z.string().min(1, "El estado es requerido"),
});

export type CompradorFormData = z.infer<typeof compradorFormSchema>;
