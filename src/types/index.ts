import type {
  User,
  Finca,
  Lote,
  Cultivo,
  RegistroCultivo,
  Gasto,
  Ingreso,
  Comprador,
  AlertaClimatica,
  ChatMessage,
  Presupuesto,
  EtapaCultivo,
  EstadoCultivo,
  TipoRegistro,
  CategoriaGasto,
  TipoGasto,
  TipoComprador,
  TipoAlerta,
  Severidad,
  UserRole,
  ChatRole,
} from "@prisma/client";

export type {
  User, Finca, Lote, Cultivo, RegistroCultivo,
  Gasto, Ingreso, Comprador, AlertaClimatica, ChatMessage, Presupuesto,
  EtapaCultivo, EstadoCultivo, TipoRegistro, CategoriaGasto, TipoGasto,
  TipoComprador, TipoAlerta, Severidad, UserRole, ChatRole,
};

// ── Extended types with relations ────────────────────────────────────────────

export type CultivoWithRelations = Cultivo & {
  lote: Lote & { finca: Finca };
  registros: RegistroCultivo[];
  gastos: Gasto[];
  ingresos: (Ingreso & { comprador: Comprador | null })[];
};

export type LoteWithCultivos = Lote & {
  cultivos: CultivoWithRelations[];
};

export type FincaWithLotes = Finca & {
  lotes: LoteWithCultivos[];
};

export type GastoWithCultivo = Gasto & {
  cultivo: (Cultivo & { lote: Lote }) | null;
};

export type IngresoWithRelations = Ingreso & {
  cultivo: (Cultivo & { lote: Lote }) | null;
  comprador: Comprador | null;
};

export type CompradorWithIngresos = Comprador & {
  ingresos: IngresoWithRelations[];
};

// ── API response types ────────────────────────────────────────────────────────

export type ApiResponse<T> = {
  data?: T;
  error?: string;
};

// ── Form types ────────────────────────────────────────────────────────────────

export type GastoFormData = {
  concepto: string;
  categoria: CategoriaGasto;
  monto: number;
  fecha: string;
  proveedor?: string;
  notas?: string;
  cultivoId?: string;
};

export type IngresoFormData = {
  concepto: string;
  monto: number;
  cantidadKg?: number;
  precioKg?: number;
  fecha: string;
  compradorId?: string;
  cultivoId?: string;
  notas?: string;
};

export type RegistroFormData = {
  tipo: TipoRegistro;
  descripcion: string;
  fecha: string;
  cultivoId: string;
};

export type CompradorFormData = {
  nombre: string;
  tipo: TipoComprador;
  ciudad: string;
  departamento?: string;
  contacto?: string;
  email?: string;
  telefono?: string;
  capacidadTon?: number;
  precioKg?: number;
  notas?: string;
  estado: string;
};

// ── UI types ──────────────────────────────────────────────────────────────────

export type SelectOption = {
  value: string;
  label: string;
};

export type TableColumn<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

// ── Dashboard stat types ──────────────────────────────────────────────────────

export type FinanceSummary = {
  totalGastos: number;
  totalIngresos: number;
  saldo: number;
  gastosPorCategoria: { categoria: string; total: number }[];
  gastosPorMes: { mes: string; gastos: number; ingresos: number }[];
};

// ── Chat types ────────────────────────────────────────────────────────────────

export type ChatMessageUI = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

// ── Etapa labels ──────────────────────────────────────────────────────────────

export const ETAPA_LABELS: Record<EtapaCultivo, string> = {
  PREPARACION: "Preparación",
  SIEMBRA: "Siembra",
  ESTABLECIMIENTO: "Establecimiento",
  CRECIMIENTO: "Crecimiento",
  PRODUCCION: "Producción",
  COSECHA: "Cosecha",
};

export const CATEGORIA_LABELS: Record<CategoriaGasto, string> = {
  INSUMOS: "Insumos",
  MANO_OBRA: "Mano de obra",
  MAQUINARIA: "Maquinaria",
  AGUA_RIEGO: "Agua y riego",
  TRANSPORTE: "Transporte",
  CERTIFICACIONES: "Certificaciones",
  TIERRA: "Tierra",
  SEMILLAS_PLANTULAS: "Semillas/Plántulas",
  HERRAMIENTAS: "Herramientas",
  ENERGIA: "Energía",
  OTROS: "Otros",
};

export const TIPO_REGISTRO_LABELS: Record<TipoRegistro, string> = {
  SIEMBRA: "Siembra",
  RIEGO: "Riego",
  FERTILIZACION: "Fertilización",
  PODA: "Poda",
  TRATAMIENTO_PLAGAS: "Tratamiento de plagas",
  COSECHA: "Cosecha",
  OBSERVACION: "Observación",
  INSPECCION: "Inspección",
  ALERTA: "Alerta",
};

export const ESTADO_CULTIVO_LABELS: Record<EstadoCultivo, string> = {
  ACTIVO: "Activo",
  PAUSADO: "Pausado",
  FINALIZADO: "Finalizado",
};

export const TIPO_COMPRADOR_LABELS: Record<TipoComprador, string> = {
  COOPERATIVA: "Cooperativa",
  EXPORTADOR: "Exportador",
  MAYORISTA: "Mayorista",
  SUPERMERCADO: "Supermercado",
  PLAZA_MERCADO: "Plaza de mercado",
  RESTAURANTE: "Restaurante",
  OTRO: "Otro",
};

export const TIPO_GASTO_LABELS: Record<TipoGasto, string> = {
  FIJO: "Fijo",
  VARIABLE: "Variable",
  INVERSION: "Inversión",
};
