/**
 * Cálculos financieros puros — Fase 1 (ADR-006). Sin acceso a datos ni a la
 * base: reciben números/arrays ya resueltos, devuelven números/arrays. Los
 * consume tanto la capa de datos (lib/data/finanzas.ts, para el cómputo
 * inicial server-side) como FinanzasClient.tsx (para recalcular cuando el
 * usuario cambia el filtro de período, client-side) — MISMA función en los
 * dos lugares, no una copia.
 *
 * A diferencia de Cultivos (puro CRUD), aquí hay lógica de negocio real que
 * conviene poder probar con casos conocidos — ver
 * src/__tests__/finanzas/calculos.test.ts.
 */
import type { CategoriaGasto } from "@prisma/client";

// ── Producción y precios ─────────────────────────────────────────────────────

export interface CultivoParaProduccion {
  cantidadPlantas: number | null;
  especieCultivo: { produccionKgArbolAnual: number | null } | null;
}

/**
 * kg estimados de producción anual, sumando planta×rendimiento por cultivo.
 * Usa el rendimiento REAL de la ficha técnica de cada cultivo (motor de
 * fichas técnicas) — nunca un valor fijo asumiendo aguacate en plena
 * producción; un cultivo sin ficha con ese dato aporta 0, no un supuesto.
 */
export function calcularProduccionEstimadaKg(cultivos: CultivoParaProduccion[]): number {
  return cultivos.reduce(
    (s, c) => s + (c.cantidadPlantas ?? 0) * (c.especieCultivo?.produccionKgArbolAnual ?? 0),
    0
  );
}

/** Promedio simple de precioKg entre los compradores que lo tienen registrado. */
export function calcularPrecioPromedioCompradores(compradores: { precioKg: number | null }[]): number {
  const precios = compradores.filter((c) => c.precioKg).map((c) => c.precioKg!);
  return precios.length > 0 ? precios.reduce((s, p) => s + p, 0) / precios.length : 0;
}

// ── Costos unitarios ──────────────────────────────────────────────────────────

export function calcularCostoPorHa(totalGastos: number, hectareasActivas: number): number {
  return hectareasActivas > 0 ? totalGastos / hectareasActivas : 0;
}

export function calcularCostoPorPlanta(totalGastos: number, plantasActivas: number): number {
  return plantasActivas > 0 ? totalGastos / plantasActivas : 0;
}

// ── Punto de equilibrio, margen y ROI ────────────────────────────────────────

/**
 * Precio mínimo de venta (COP/kg) para no perder — total gastado dividido
 * entre la producción estimada. Antes de la Fase 1 esto vivía duplicado:
 * FinanzasClient.tsx ya usaba la producción real por ficha técnica, pero
 * /api/finanzas/resumen tenía su PROPIA copia con "8000 kg/ha" fijo
 * hardcodeado (deuda técnica documentada en REQUERIMIENTOS.md) — ver nota
 * en el commit de este archivo.
 */
export function calcularPuntoEquilibrio(totalGastos: number, produccionEstimadaKg: number): number {
  return produccionEstimadaKg > 0 ? totalGastos / produccionEstimadaKg : 0;
}

export interface MargenBruto {
  margenBruto: number;
  margenPorcentaje: number;
}

export function calcularMargenBruto(ingresoProyectado: number, totalGastos: number): MargenBruto {
  const margenBruto = ingresoProyectado - totalGastos;
  const margenPorcentaje = ingresoProyectado > 0 ? (margenBruto / ingresoProyectado) * 100 : 0;
  return { margenBruto, margenPorcentaje };
}

/**
 * ROI proyectado en % — 0 (no "-100%") cuando no hay ingreso proyectado
 * todavía, para no mostrar un número engañoso cuando en realidad es "sin
 * datos suficientes" (sin ficha técnica de rendimiento o sin comprador con
 * precio registrado).
 */
export function calcularROI(totalGastos: number, ingresoProyectado: number): number {
  return totalGastos > 0 && ingresoProyectado > 0 ? ((ingresoProyectado - totalGastos) / totalGastos) * 100 : 0;
}

// ── Indicadores financieros (composición de todo lo anterior) ───────────────

export interface IndicadoresFinancieros {
  hectareasActivas: number;
  plantasActivas: number;
  costoTotalPorHa: number;
  costoTotalPorPlanta: number;
  produccionEstimadaKg: number;
  puntoEquilibrioPrecio: number;
  precioPromedioCompradores: number;
  ingresoProyectado: number;
  margenBruto: number;
  margenPorcentaje: number;
  roi: number;
}

export function calcularIndicadoresFinancieros(params: {
  totalGastos: number;
  lotes: { areaHa: number }[];
  cultivos: (CultivoParaProduccion & { cantidadPlantas: number | null })[];
  compradores: { precioKg: number | null }[];
}): IndicadoresFinancieros {
  const { totalGastos, lotes, cultivos, compradores } = params;
  const hectareasActivas = lotes.reduce((s, l) => s + l.areaHa, 0);
  const plantasActivas = cultivos.reduce((s, c) => s + (c.cantidadPlantas ?? 0), 0);
  const produccionEstimadaKg = calcularProduccionEstimadaKg(cultivos);
  const precioPromedioCompradores = calcularPrecioPromedioCompradores(compradores);
  const ingresoProyectado = produccionEstimadaKg * precioPromedioCompradores;
  const { margenBruto, margenPorcentaje } = calcularMargenBruto(ingresoProyectado, totalGastos);

  return {
    hectareasActivas,
    plantasActivas,
    costoTotalPorHa: calcularCostoPorHa(totalGastos, hectareasActivas),
    costoTotalPorPlanta: calcularCostoPorPlanta(totalGastos, plantasActivas),
    produccionEstimadaKg,
    puntoEquilibrioPrecio: calcularPuntoEquilibrio(totalGastos, produccionEstimadaKg),
    precioPromedioCompradores,
    ingresoProyectado,
    margenBruto,
    margenPorcentaje,
    roi: calcularROI(totalGastos, ingresoProyectado),
  };
}

// ── Presupuesto vs. ejecución real ───────────────────────────────────────────

export interface PresupuestoVsRealRow {
  categoria: CategoriaGasto;
  planeado: number;
  real: number;
  variacion: number;
  porcentaje: number;
}

export function calcularPresupuestoVsReal(
  presupuestos: { categoria: CategoriaGasto; montoPlaneado: number }[],
  gastos: { categoria: CategoriaGasto; monto: number }[]
): PresupuestoVsRealRow[] {
  return presupuestos.map((p) => {
    const real = gastos.filter((g) => g.categoria === p.categoria).reduce((s, g) => s + g.monto, 0);
    const porcentaje = p.montoPlaneado > 0 ? (real / p.montoPlaneado) * 100 : 0;
    return { categoria: p.categoria, planeado: p.montoPlaneado, real, variacion: real - p.montoPlaneado, porcentaje };
  });
}

// ── Desgloses (gastos por categoría/tipo/lote, evolución mensual) ───────────

export function calcularCostosPorTipo(
  gastos: { tipoGasto: "FIJO" | "VARIABLE" | "INVERSION"; monto: number }[]
): Record<"FIJO" | "VARIABLE" | "INVERSION", number> {
  const result = { FIJO: 0, VARIABLE: 0, INVERSION: 0 };
  gastos.forEach((g) => { result[g.tipoGasto] += g.monto; });
  return result;
}

export interface CostoPorLote {
  nombre: string;
  areaHa: number;
  total: number;
}

export function calcularCostosPorLote(
  gastos: { monto: number; lote: { id: string; nombre: string; areaHa: number } | null; cultivo: { lote: { id: string; nombre: string; areaHa: number } } | null }[]
): CostoPorLote[] {
  const map: Record<string, CostoPorLote> = {};
  let sinAsignar = 0;
  gastos.forEach((g) => {
    const lote = g.lote || g.cultivo?.lote;
    if (lote) {
      if (!map[lote.id]) map[lote.id] = { nombre: lote.nombre, areaHa: lote.areaHa, total: 0 };
      map[lote.id].total += g.monto;
    } else {
      sinAsignar += g.monto;
    }
  });
  const result = Object.values(map).sort((a, b) => b.total - a.total);
  if (sinAsignar > 0) result.push({ nombre: "Sin asignar", areaHa: 0, total: sinAsignar });
  return result;
}

export interface CategoriaTotal {
  name: string;
  value: number;
}

export function calcularPorCategoria(gastos: { categoria: CategoriaGasto; monto: number }[]): CategoriaTotal[] {
  const map: Record<string, number> = {};
  gastos.forEach((g) => { map[g.categoria] = (map[g.categoria] ?? 0) + g.monto; });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export interface MesFinanciero {
  mes: string;
  gastos: number;
  ingresos: number;
}

/** Evolución mensual de un año calendario específico (12 puntos, ene-dic). */
export function calcularEvolucionMensual(
  anio: number,
  gastos: { fecha: Date | string; monto: number }[],
  ingresos: { fecha: Date | string; monto: number }[]
): MesFinanciero[] {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = new Date(anio, i, 1).toLocaleDateString("es-CO", { month: "short" });
    const gastosMonth = gastos
      .filter((g) => { const f = new Date(g.fecha); return f.getMonth() === i && f.getFullYear() === anio; })
      .reduce((s, g) => s + g.monto, 0);
    const ingresosMonth = ingresos
      .filter((ing) => { const f = new Date(ing.fecha); return f.getMonth() === i && f.getFullYear() === anio; })
      .reduce((s, ing) => s + ing.monto, 0);
    return { mes, gastos: gastosMonth, ingresos: ingresosMonth };
  });
}
