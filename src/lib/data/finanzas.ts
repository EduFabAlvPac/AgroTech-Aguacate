/**
 * Capa de datos de Finanzas — Fase 1 (ADR-006). Reemplaza las 7 queries
 * Prisma que antes vivían inline en finanzas/page.tsx. Los indicadores
 * (ROI, punto de equilibrio, margen, presupuesto vs real) NO se calculan
 * aquí — se delega a las funciones puras de lib/finanzas/calculos.ts, que
 * también usa FinanzasClient.tsx para recalcular al cambiar el filtro de
 * período (misma función en los dos lugares).
 */
import { db } from "@/lib/db";
import { calcularIndicadoresFinancieros, type IndicadoresFinancieros } from "@/lib/finanzas/calculos";
import type { CategoriaGasto, Comprador, Cultivo, Gasto, Lote, Presupuesto } from "@prisma/client";
import type { IngresoWithRelations } from "@/types";

export type GastoConRelaciones = Gasto & { cultivo: (Cultivo & { lote: Lote }) | null; lote: Lote | null };
export type CultivoConProduccion = Cultivo & {
  lote: Lote;
  especieCultivo: { produccionKgArbolAnual: number | null } | null;
};

export interface FinanzasResumen {
  gastos: GastoConRelaciones[];
  ingresos: IngresoWithRelations[];
  cultivos: CultivoConProduccion[];
  compradores: Comprador[];
  lotes: { id: string; nombre: string; areaHa: number }[];
  presupuestos: Presupuesto[];
  nombreFinca?: string;
  /** Indicadores iniciales (todo el historial, sin filtro de período) — el
   * cliente los recalcula reactivamente al cambiar el filtro usando la
   * MISMA función pura, con gastosFiltrados en vez de gastos completos. */
  indicadores: IndicadoresFinancieros;
}

/**
 * Todo lo que necesita la página de Finanzas de la finca activa, en una sola
 * función. Antes eran 7 `Promise.all` inline en finanzas/page.tsx.
 */
export async function getFinanzasResumen(fincaActivaId: string | null, sinFincaSentinel: string): Promise<FinanzasResumen> {
  const fincaId = fincaActivaId ?? sinFincaSentinel;

  const [gastos, ingresos, cultivos, compradores, finca, lotes, presupuestos] = await Promise.all([
    db.gasto.findMany({
      where: { fincaId },
      include: { cultivo: { include: { lote: true } }, lote: true },
      orderBy: { fecha: "desc" },
    }),
    db.ingreso.findMany({
      where: {
        OR: [
          { cultivo: { lote: { fincaId } } },
          { comprador: { fincaId } },
        ],
      },
      include: {
        cultivo: { include: { lote: true } },
        comprador: true,
      },
      orderBy: { fecha: "desc" },
    }),
    db.cultivo.findMany({
      where: { lote: { fincaId } },
      include: { lote: true, especieCultivo: { select: { produccionKgArbolAnual: true } } },
    }),
    db.comprador.findMany({
      where: { fincaId, estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
    }),
    fincaActivaId
      ? db.finca.findUnique({
          where: { id: fincaActivaId },
          select: { nombre: true, lotes: { select: { id: true, nombre: true, areaHa: true } } },
        })
      : null,
    db.lote.findMany({
      where: { fincaId },
      select: { id: true, nombre: true, areaHa: true },
      orderBy: { nombre: "asc" },
    }),
    db.presupuesto.findMany({
      where: {
        fincaId,
        anio: new Date().getFullYear(),
      },
    }),
  ]);

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const indicadores = calcularIndicadoresFinancieros({ totalGastos, lotes, cultivos, compradores });

  return {
    gastos,
    ingresos,
    cultivos,
    compradores,
    lotes,
    presupuestos,
    nombreFinca: finca?.nombre,
    indicadores,
  };
}

/** Presupuesto por año — usado por el Server Action de guardar presupuesto
 * para devolver el estado actualizado sin re-hacer el resto de queries. */
export async function getPresupuestos(fincaId: string, anio: number): Promise<Presupuesto[]> {
  return db.presupuesto.findMany({ where: { fincaId, anio }, orderBy: { categoria: "asc" } });
}
