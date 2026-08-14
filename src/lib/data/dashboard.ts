/**
 * Capa de datos del Dashboard — Fase 1 (ADR-006). Toda la obtención de datos
 * y las reglas de negocio derivadas (próxima actividad, progreso de ciclo,
 * cosecha estimada) viven aquí, no en los componentes de presentación
 * (`.tsx`). Los tipos exportados son el contrato que va a consumir tanto la
 * interfaz actual como la interfaz simplificada de la Fase 2 — deben quedar
 * lo más "listos para pintar" posible.
 *
 * Nombres neutrales a propósito (no "getDashboardCompletoData" ni similar):
 * ambas variantes visuales futuras consumen exactamente lo mismo de aquí.
 */
import { differenceInDays } from "date-fns";
import { db } from "@/lib/db";
import { SIN_FINCA_SENTINEL } from "@/lib/finca-activa";
import type { Finca, Lote, Cultivo, EspecieCultivo } from "@prisma/client";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type CultivoConEspecie = Cultivo & {
  especieCultivo: Pick<EspecieCultivo, "cicloMesesPrimeraCosecha" | "produccionKgArbolAnual"> | null;
};
export type DashboardFinca =
  | (Finca & { lotes: (Lote & { cultivos: CultivoConEspecie[] })[] })
  | null;

export interface CosechaEstimada {
  dias: number;
  fechaLabel: string;
}

export type Urgencia = "alta" | "media" | "baja";
export interface ProximaActividad {
  texto: string;
  icono: string;
  urgencia: Urgencia;
}

export interface DashboardKpis {
  totalHa: number;
  totalPlantas: number;
  gastosMes: number;
  alertasActivas: number;
  ingresosTotal: number;
  etapaCultivo?: string;
  variedad?: string | null;
  cosechaEstimada: CosechaEstimada | null;
  /** Siempre presente — el "sin cultivo activo" ya viene resuelto como un
   * valor neutro, no como undefined, para que la presentación nunca tenga
   * que decidir el fallback. */
  proximaActividad: ProximaActividad;
}

export interface DashboardFinancialMonth {
  mes: string;
  gastos: number;
  ingresos: number;
}
export interface DashboardFinancialData {
  monthlyData: DashboardFinancialMonth[];
  totalGastos: number;
  totalIngresos: number;
}

export interface DashboardCompradorPreview {
  id: string;
  nombre: string;
  tipo: string;
  ciudad: string;
  precioKg: number | null;
  capacidadTon: number | null;
  estado: string;
}

export interface CropTimelineData {
  especieLabel: string;
  fincaNombre: string | null;
  fechaSiembra: Date | null;
  fechaCosechaEst: Date | null;
  currentEtapa: string;
  /** 0-100 */
  progreso: number;
  diasRestantes: number | null;
  produccionEstimadaKg: number | null;
}

// ── Reglas de negocio puras (sin I/O — testeables aparte del render) ─────────

/**
 * Motor de calendario agronómico: qué actividad corresponde según etapa y
 * días desde siembra. Extraído de KpiCards.tsx (antes vivía en el
 * componente de presentación) — genérico, no asume aguacate (CLAUDE.md §4).
 */
export function getProximaActividad(etapa: string, diasDesdeSiembra: number): ProximaActividad {
  if (etapa === "PREPARACION") return { texto: "Iniciar siembra", icono: "🌱", urgencia: "alta" };
  if (etapa === "SIEMBRA" && diasDesdeSiembra <= 7)
    return { texto: "Primer riego (3L/planta)", icono: "💧", urgencia: "alta" };
  if (etapa === "SIEMBRA" && diasDesdeSiembra <= 30)
    return { texto: "Riego cada 3 días", icono: "💧", urgencia: "media" };
  if (etapa === "SIEMBRA" && diasDesdeSiembra <= 60)
    return { texto: "Primera fertilización (mes 2)", icono: "🌿", urgencia: "media" };
  if (etapa === "ESTABLECIMIENTO") return { texto: "Poda de formación", icono: "✂️", urgencia: "media" };
  if (etapa === "CRECIMIENTO") return { texto: "Análisis foliar", icono: "🔬", urgencia: "baja" };
  return { texto: "Revisar cultivo", icono: "👁️", urgencia: "baja" };
}

/**
 * Progreso de ciclo + proyección de cosecha, derivados de la finca ya
 * cargada (no dispara una query nueva) — misma fuente que consumen
 * MapPreview/Header, para no repetir el fetch tres veces en la misma
 * página. Toma el cultivo del primer lote (mismo criterio que ya usaba
 * CropTimeline.tsx antes de este refactor — ver nota en getDashboardKpis
 * sobre por qué NO es el mismo criterio que usan los KPIs).
 */
export function computeCropTimeline(finca: DashboardFinca): CropTimelineData {
  const firstCultivo = finca?.lotes[0]?.cultivos[0];
  const currentEtapa = firstCultivo?.etapa ?? "PREPARACION";
  const fechaSiembra = firstCultivo?.fechaSiembra ? new Date(firstCultivo.fechaSiembra) : null;
  const cicloMeses = firstCultivo?.especieCultivo?.cicloMesesPrimeraCosecha;

  let fechaCosechaEst: Date | null = null;
  let diasTotal = 0;
  let diasTranscurridos = 0;
  if (fechaSiembra && cicloMeses) {
    fechaCosechaEst = new Date(fechaSiembra);
    fechaCosechaEst.setMonth(fechaCosechaEst.getMonth() + cicloMeses);
    diasTotal = differenceInDays(fechaCosechaEst, fechaSiembra);
    diasTranscurridos = differenceInDays(new Date(), fechaSiembra);
  }
  const progreso = diasTotal > 0 ? Math.min(Math.max((diasTranscurridos / diasTotal) * 100, 0), 100) : 0;

  const especieLabel = firstCultivo
    ? `${firstCultivo.especie}${firstCultivo.variedad ? ` ${firstCultivo.variedad}` : ""}`
    : "Sin cultivo activo";

  const totalPlantas =
    finca?.lotes.reduce((s, l) => s + l.cultivos.reduce((cs, c) => cs + (c.cantidadPlantas ?? 0), 0), 0) ?? 0;
  const produccionPorArbol = firstCultivo?.especieCultivo?.produccionKgArbolAnual;
  const produccionEstimadaKg = produccionPorArbol && totalPlantas > 0 ? totalPlantas * produccionPorArbol : null;

  return {
    especieLabel,
    fincaNombre: finca?.nombre ?? null,
    fechaSiembra,
    fechaCosechaEst,
    currentEtapa,
    progreso,
    diasRestantes: fechaCosechaEst ? Math.max(differenceInDays(fechaCosechaEst, new Date()), 0) : null,
    produccionEstimadaKg,
  };
}

// ── Funciones de datos (Server-only — usan Prisma directo) ──────────────────

export async function getDashboardFinca(fincaActivaId: string | null): Promise<DashboardFinca> {
  if (!fincaActivaId) return null;
  return db.finca.findUnique({
    where: { id: fincaActivaId },
    include: {
      lotes: {
        include: {
          cultivos: {
            where: { estado: "ACTIVO" },
            include: {
              especieCultivo: { select: { cicloMesesPrimeraCosecha: true, produccionKgArbolAnual: true } },
            },
          },
        },
      },
    },
  });
}

/**
 * KPIs del dashboard — antes vivía como `KpiCardsLoader` dentro de
 * page.tsx, con su propia query independiente de `getDashboardFinca` (para
 * no bloquear el streaming del resto de la página, sigue siendo un fetch
 * aparte, solo que ahora reusa la misma función de datos en vez de
 * duplicar la query Prisma).
 *
 * Nota de comportamiento preexistente que se conserva tal cual (no se
 * "corrige" aquí para no cambiar ningún resultado): el cultivo usado para
 * "próxima actividad"/"cosecha estimada" es el primer cultivo ACTIVO
 * encontrado recorriendo TODOS los lotes (flatMap+find) — distinto del
 * criterio de `computeCropTimeline`, que toma el cultivo del PRIMER lote
 * únicamente. En una finca de un solo lote dan el mismo resultado; en una
 * finca multi-lote donde el primer lote no tiene cultivo activo, podrían
 * divergir. Ya era así antes de este refactor.
 */
export async function getDashboardKpis(fincaActivaId: string | null): Promise<DashboardKpis> {
  const fincaId = fincaActivaId ?? SIN_FINCA_SENTINEL;

  const [finca, gastosMes, alertas, ingresosAggregate] = await Promise.all([
    fincaActivaId ? getDashboardFinca(fincaActivaId) : null,
    db.gasto.aggregate({
      where: {
        fincaId,
        fecha: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { monto: true },
    }),
    db.alertaClimatica.count({ where: { activa: true, leida: false, fincaId } }),
    db.ingreso.aggregate({
      where: {
        OR: [{ cultivo: { lote: { fincaId } } }, { comprador: { fincaId } }],
      },
      _sum: { monto: true },
    }),
  ]);

  const totalHa = finca?.lotes.reduce((s, l) => s + l.areaHa, 0) ?? 0;
  const totalPlantas =
    finca?.lotes.reduce((s, l) => s + l.cultivos.reduce((cs, c) => cs + (c.cantidadPlantas ?? 0), 0), 0) ?? 0;
  const gastosMesTotal = gastosMes._sum.monto ?? 0;
  const ingresosTotal = ingresosAggregate._sum.monto ?? 0;

  // Sin cultivo activo no hay etapa/siembra real que proyectar — se deja
  // undefined (no se asume "riego cada 3 días" por defecto).
  const primerCultivo = finca?.lotes.flatMap((l) => l.cultivos).find((c) => c.estado === "ACTIVO");
  const etapaCultivo = primerCultivo?.etapa;
  const diasDesdeSiembra = primerCultivo?.fechaSiembra
    ? Math.floor((Date.now() - new Date(primerCultivo.fechaSiembra).getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  let cosechaEstimada: CosechaEstimada | null = null;
  const cicloMeses = primerCultivo?.especieCultivo?.cicloMesesPrimeraCosecha;
  if (primerCultivo?.fechaSiembra && cicloMeses) {
    const fechaEst = new Date(primerCultivo.fechaSiembra);
    fechaEst.setMonth(fechaEst.getMonth() + cicloMeses);
    cosechaEstimada = {
      dias: Math.ceil((fechaEst.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      fechaLabel: fechaEst.toLocaleDateString("es-CO", { month: "short", year: "numeric" }),
    };
  }

  const proximaActividad: ProximaActividad = etapaCultivo
    ? getProximaActividad(etapaCultivo, diasDesdeSiembra ?? 30)
    : { texto: "Registra un cultivo", icono: "🌱", urgencia: "baja" };

  return {
    totalHa,
    totalPlantas,
    gastosMes: gastosMesTotal,
    alertasActivas: alertas,
    ingresosTotal,
    etapaCultivo,
    variedad: totalPlantas > 0 ? primerCultivo?.variedad : null,
    cosechaEstimada,
    proximaActividad,
  };
}

/** Antes `FinancialChartLoader` dentro de page.tsx. */
export async function getDashboardFinancialChart(fincaActivaId: string | null): Promise<DashboardFinancialData> {
  const fincaId = fincaActivaId ?? SIN_FINCA_SENTINEL;
  const year = new Date().getFullYear();
  const fechaInicio = new Date(year, 0, 1);
  const fechaFin = new Date(year, 11, 31, 23, 59, 59);

  const [gastos, ingresos] = await Promise.all([
    db.gasto.findMany({
      where: { fincaId, fecha: { gte: fechaInicio, lte: fechaFin } },
      select: { monto: true, fecha: true },
    }),
    db.ingreso.findMany({
      where: {
        OR: [{ cultivo: { lote: { fincaId } } }, { comprador: { fincaId } }],
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
      select: { monto: true, fecha: true },
    }),
  ]);

  const monthlyData: DashboardFinancialMonth[] = Array.from({ length: 12 }, (_, i) => {
    const mes = new Date(year, i, 1).toLocaleDateString("es-CO", { month: "short" });
    const gastosMonth = gastos.filter((g) => new Date(g.fecha).getMonth() === i).reduce((s, g) => s + g.monto, 0);
    const ingresosMonth = ingresos
      .filter((ing) => new Date(ing.fecha).getMonth() === i)
      .reduce((s, ing) => s + ing.monto, 0);
    return { mes, gastos: gastosMonth, ingresos: ingresosMonth };
  });

  return {
    monthlyData,
    totalGastos: gastos.reduce((s, g) => s + g.monto, 0),
    totalIngresos: ingresos.reduce((s, i) => s + i.monto, 0),
  };
}

/** Antes embebido directo en BuyersPreview.tsx. */
export async function getDashboardCompradoresPreview(fincaActivaId: string | null): Promise<DashboardCompradorPreview[]> {
  return db.comprador.findMany({
    where: { fincaId: fincaActivaId ?? SIN_FINCA_SENTINEL },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, nombre: true, tipo: true, ciudad: true, precioKg: true, capacidadTon: true, estado: true },
  });
}
