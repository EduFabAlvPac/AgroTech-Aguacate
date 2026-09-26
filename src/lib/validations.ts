import { z } from "zod";
import type { CategoriaGasto, TipoComprador, TipoRegistro, TexturaSuelo } from "@prisma/client";

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
  imagenes: z.array(z.string()).max(5, "Máximo 5 fotos por registro").optional(),
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
  especiesInteres: z.array(z.string()).optional(),
});

export type CompradorFormData = z.infer<typeof compradorFormSchema>;

// ── Análisis de suelo (RF3) ─────────────────────────────────────────────────

const medida = (max: number) =>
  z.number({ invalid_type_error: "Debe ser un número" }).nonnegative("No puede ser negativo").max(max, "Valor fuera de rango").nullish();

export const analisisSueloFormSchema = z.object({
  fechaMuestreo: z.string().min(1, "La fecha de muestreo es requerida"),
  ph: z.number({ invalid_type_error: "El pH debe ser un número" }).min(0).max(14, "El pH debe estar entre 0 y 14").nullish(),
  materiaOrganica: medida(100),
  nitrogeno: medida(100),
  fosforo: medida(5000),
  potasio: medida(100),
  textura: z.string().nullish() as z.ZodType<TexturaSuelo | "" | null | undefined>,
  conductividad: medida(100),
  laboratorio: z.string().max(200, "Máximo 200 caracteres").nullish(),
  notas: z.string().max(1000, "Las notas no pueden superar los 1000 caracteres").nullish(),
  // Ciclo de vida del cultivo: a qué cultivo se atribuye (opcional) y a qué profundidad se muestreó.
  cultivoId: z.string().min(1).nullish(),
  profundidadCm: z.number({ invalid_type_error: "Debe ser un número" }).int("Debe ser un número entero").min(1, "Mínimo 1 cm").max(300, "Máximo 300 cm").nullish(),
  // Parámetros habituales de un informe de laboratorio (meq/100g y ppm).
  calcio: medida(200),
  magnesio: medida(100),
  sodio: medida(100),
  aluminio: medida(100),
  cic: medida(200),
  azufre: medida(5000),
  boro: medida(500),
  hierro: medida(5000),
  manganeso: medida(5000),
  zinc: medida(1000),
  cobre: medida(1000),
  // Fotos del informe (comprimidas en el navegador).
  imagenes: z.array(z.string().max(1_500_000, "Una foto es demasiado pesada")).max(4, "Máximo 4 fotos").nullish(),
});

export type AnalisisSueloFormData = z.infer<typeof analisisSueloFormSchema>;

// ── Autenticación — self-signup / recuperar contraseña (Fase 1 SaaS) ────────

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "Máximo 72 caracteres"); // bcrypt ignora todo lo que pase de 72 bytes

export const registroSchema = z.object({
  nombre: z.string().min(1, "Tu nombre es requerido").max(100, "Máximo 100 caracteres"),
  // Sin nombreOrganizacion a propósito (hallazgo del usuario, 2026-09-21):
  // Organizacion.nombre no se muestra en ningún lado de la UI, así que
  // pedirlo en el registro era un campo sin utilidad visible. Se genera solo
  // (ver route.ts) con el mismo patrón que ya usa
  // prisma/backfill-organizaciones.ts. El nombre real de la finca lo pone el
  // usuario al crear su primera finca (Configuración → Finca).
  email: z.string().email("Correo inválido"),
  password: passwordSchema,
  // literal(true) en vez de boolean(): rechaza explícitamente `false` Y
  // `undefined` con el mismo mensaje — un checkbox sin marcar no debe pasar
  // por accidente de tipos.
  aceptaTerminos: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar los Términos de Servicio y la Política de Tratamiento de Datos" }),
  }),
});
export type RegistroFormDataInput = z.infer<typeof registroSchema>;

// ── Colectivo/Cooperativa — registro de la organización (ADR-011 §6.1) ──────

export const organizacionColectivoSchema = z.object({
  nombreOrganizacion: z.string().trim().min(2, "El nombre de la cooperativa es requerido").max(120, "Máximo 120 caracteres"),
  nit: z.string().trim().min(5, "Ingresa el NIT").max(20, "NIT demasiado largo"),
  celularContacto: z.string().trim().min(7, "Ingresa un celular de contacto").max(20),
  ciudad: z.string().trim().max(80).optional(),
  departamento: z.string().trim().max(80).optional(),
});
export type OrganizacionColectivoInput = z.infer<typeof organizacionColectivoSchema>;

// Registro completo: la persona (coordinador) + su organización.
export const registroColectivoSchema = registroSchema.merge(organizacionColectivoSchema);

export const recuperarSchema = z.object({
  email: z.string().email("Correo inválido"),
});

export const restablecerSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: passwordSchema,
});

// ── Organización (ADR-011 Sprint 3) ─────────────────────────────────────────
// Solo los campos identitarios/de contacto — `tipo`/`plan` son de solo
// lectura en esta pestaña (ver OrganizacionTab.tsx): cambiar el tipo de una
// organización implica trial/límites que este formulario no maneja.

export const organizacionSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(150, "Máximo 150 caracteres"),
  nit: z.string().max(30, "Máximo 30 caracteres").optional().or(z.literal("")),
  ciudad: z.string().max(100, "Máximo 100 caracteres").optional().or(z.literal("")),
  departamento: z.string().max(100, "Máximo 100 caracteres").optional().or(z.literal("")),
  emailContacto: z.string().email("Correo inválido").max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
  celularContacto: z.string().max(30, "Máximo 30 caracteres").optional().or(z.literal("")),
});
export type OrganizacionFormData = z.infer<typeof organizacionSchema>;

// ── Invitaciones por correo (ADR-011 Sprint 3) ──────────────────────────────

// Solo 2 opciones, no las 3 de agregarMiembro() (ADMIN/OPERARIO/LECTURA):
// `Invitacion.rol` es el enum IAM (Rol), que no distingue OPERARIO de
// LECTURA (ambos son FARM_COLLABORATOR) — guardar solo esa columna y
// reconstruir "LECTURA" al aceptar sería adivinar, con el riesgo real de
// que alguien invitado como "solo lectura" termine con permisos de
// escritura. Más seguro ofrecer menos opciones acá y que el dueño ajuste a
// "Solo lectura" después de que la persona acepte (Equipo → Editar) que
// arriesgar una discrepancia silenciosa. Ver invitacion-actions.ts.
export const invitarMiembroSchema = z.object({
  email: z.string().email("Correo inválido"),
  rolFinca: z.enum(["ADMIN", "OPERARIO"], { errorMap: () => ({ message: "rolFinca debe ser ADMIN u OPERARIO" }) }),
  fincaId: z.string().min(1, "La finca es requerida"),
  mensajePersonal: z.string().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});
export type InvitarMiembroFormData = z.infer<typeof invitarMiembroSchema>;

export const aceptarInvitacionNuevoUsuarioSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  nombre: z.string().min(1, "Tu nombre es requerido").max(100, "Máximo 100 caracteres"),
  password: passwordSchema,
});
export type AceptarInvitacionNuevoUsuarioData = z.infer<typeof aceptarInvitacionNuevoUsuarioSchema>;

// Login Campesino seguro — canje del código de vinculación (público, sin
// sesión). El código se normaliza a dígitos en el servidor
// (campesino-vinculacion.ts), acá solo se exige que traiga al menos 6.
export const vincularCampesinoSchema = z.object({
  telefono: z.string().trim().min(7, "Escribe tu número de celular").max(20),
  codigo: z.string().trim().min(6, "El código tiene 6 números").max(12),
});


// ─── Seguros agrícolas ────────────────────────────────────────────────────────
const RIESGOS = ["SEQUIA", "EXCESO_LLUVIA", "HELADA", "GRANIZO", "VIENTOS_FUERTES", "INUNDACION", "PLAGAS_ENFERMEDADES", "INCENDIO", "OTRO"] as const;
const ESTADOS_SINIESTRO = ["REGISTRADO", "REPORTADO_ASEGURADORA", "EN_REVISION", "APROBADO", "PAGADO", "RECHAZADO"] as const;

const montoOpc = z.number().finite().min(0, "No puede ser negativo").max(100_000_000_000, "Valor demasiado alto").nullish();
const textoOpc = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`).nullish();

export const polizaSchema = z
  .object({
    aseguradora: z.string().trim().min(2, "Escribe el nombre de la aseguradora").max(120),
    numeroPoliza: textoOpc(60),
    riesgos: z.array(z.enum(RIESGOS)).min(1, "Elige al menos un riesgo cubierto"),
    cultivoIds: z.array(z.string().min(1)).min(1, "Elige al menos un cultivo asegurado").max(200),
    sumaAsegurada: montoOpc,
    prima: montoOpc,
    deduciblePct: z.number().finite().min(0, "Entre 0 y 100").max(100, "Entre 0 y 100").nullish(),
    fechaInicio: z.coerce.date({ message: "Fecha de inicio inválida" }),
    fechaFin: z.coerce.date({ message: "Fecha de fin inválida" }),
    contacto: textoOpc(200),
    notas: textoOpc(1000),
    registrarPrimaComoGasto: z.boolean().optional(),
  })
  .refine((v) => v.fechaFin >= v.fechaInicio, { message: "La vigencia termina antes de empezar", path: ["fechaFin"] });

export const siniestroSchema = z.object({
  cultivoId: z.string().min(1, "Elige el cultivo afectado"),
  polizaId: z.string().min(1).nullish(),
  tipo: z.enum(RIESGOS, { message: "Elige el tipo de evento" }),
  fechaEvento: z.coerce
    .date({ message: "Fecha del evento inválida" })
    .refine((d) => d.getTime() <= Date.now() + 86_400_000, "La fecha del evento no puede ser futura"),
  descripcion: z.string().trim().min(10, "Describe lo ocurrido (mínimo 10 caracteres)").max(2000),
  areaAfectadaHa: z.number().finite().min(0).max(100_000).nullish(),
  porcentajeDanio: z.number().int("Debe ser entero").min(0, "Entre 0 y 100").max(100, "Entre 0 y 100").nullish(),
  perdidaEstimada: montoOpc,
  imagenes: z.array(z.string().max(1_500_000, "Una foto es demasiado pesada")).max(6, "Máximo 6 fotos").default([]),
  notas: textoOpc(1000),
});

export const siniestroSeguimientoSchema = z.object({
  estado: z.enum(ESTADOS_SINIESTRO),
  numeroReclamo: textoOpc(60),
  fechaReporteAseguradora: z.coerce.date().nullish(),
  montoIndemnizado: montoOpc,
  notas: textoOpc(1000),
});
