import { z } from "zod";
import type { CategoriaGasto, TipoComprador, TipoRegistro } from "@prisma/client";

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
