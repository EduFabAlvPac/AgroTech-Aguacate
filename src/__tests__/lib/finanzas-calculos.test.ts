import { describe, it, expect } from "vitest";
import {
  calcularProduccionEstimadaKg,
  calcularPrecioPromedioCompradores,
  calcularCostoPorHa,
  calcularCostoPorPlanta,
  calcularPuntoEquilibrio,
  calcularMargenBruto,
  calcularROI,
  calcularIndicadoresFinancieros,
  calcularPresupuestoVsReal,
  calcularCostosPorTipo,
  calcularPorCategoria,
} from "@/lib/finanzas/calculos";

describe("calcularIndicadoresFinancieros — caso a mano", () => {
  // Escenario controlado, cuentas hechas a mano ANTES de correr el test:
  // - 2 lotes: 1 ha + 1 ha = 2 ha totales
  // - 1 cultivo: 100 plantas, rendimiento de ficha técnica 20 kg/planta/año
  //   → producción estimada = 100 × 20 = 2.000 kg
  // - Gastos totales: $10.000.000 COP
  //   → costo/ha = 10.000.000 / 2 = $5.000.000
  //   → costo/planta = 10.000.000 / 100 = $100.000
  //   → punto de equilibrio = 10.000.000 / 2.000 kg = $5.000/kg
  // - 2 compradores con precioKg 6.000 y 8.000 → promedio = 7.000
  //   → ingreso proyectado = 2.000 kg × 7.000 = $14.000.000
  //   → margen bruto = 14.000.000 - 10.000.000 = $4.000.000
  //   → margen % = 4.000.000 / 14.000.000 × 100 = 28.571428...%
  //   → ROI = (14.000.000 - 10.000.000) / 10.000.000 × 100 = 40%
  const totalGastos = 10_000_000;
  const lotes = [{ areaHa: 1 }, { areaHa: 1 }];
  const cultivos = [
    { cantidadPlantas: 100, especieCultivo: { produccionKgArbolAnual: 20 } },
  ];
  const compradores = [{ precioKg: 6_000 }, { precioKg: 8_000 }];

  it("calcula cada indicador exactamente como la cuenta hecha a mano", () => {
    const r = calcularIndicadoresFinancieros({ totalGastos, lotes, cultivos, compradores });

    expect(r.hectareasActivas).toBe(2);
    expect(r.plantasActivas).toBe(100);
    expect(r.produccionEstimadaKg).toBe(2_000);
    expect(r.costoTotalPorHa).toBe(5_000_000);
    expect(r.costoTotalPorPlanta).toBe(100_000);
    expect(r.puntoEquilibrioPrecio).toBe(5_000);
    expect(r.precioPromedioCompradores).toBe(7_000);
    expect(r.ingresoProyectado).toBe(14_000_000);
    expect(r.margenBruto).toBe(4_000_000);
    expect(r.margenPorcentaje).toBeCloseTo(28.571428, 5);
    expect(r.roi).toBe(40);
  });

  it("cada función individual coincide con el mismo cálculo por separado", () => {
    const produccion = calcularProduccionEstimadaKg(cultivos);
    const precioProm = calcularPrecioPromedioCompradores(compradores);
    const ingresoProyectado = produccion * precioProm;

    expect(produccion).toBe(2_000);
    expect(precioProm).toBe(7_000);
    expect(calcularCostoPorHa(totalGastos, 2)).toBe(5_000_000);
    expect(calcularCostoPorPlanta(totalGastos, 100)).toBe(100_000);
    expect(calcularPuntoEquilibrio(totalGastos, produccion)).toBe(5_000);
    const margen = calcularMargenBruto(ingresoProyectado, totalGastos);
    expect(margen.margenBruto).toBe(4_000_000);
    expect(margen.margenPorcentaje).toBeCloseTo(28.571428, 5);
    expect(calcularROI(totalGastos, ingresoProyectado)).toBe(40);
  });

  it("casos borde: sin hectáreas/plantas/producción/ingreso no divide por cero", () => {
    expect(calcularCostoPorHa(1000, 0)).toBe(0);
    expect(calcularCostoPorPlanta(1000, 0)).toBe(0);
    expect(calcularPuntoEquilibrio(1000, 0)).toBe(0);
    expect(calcularMargenBruto(0, 1000)).toEqual({ margenBruto: -1000, margenPorcentaje: 0 });
    expect(calcularROI(0, 1000)).toBe(0); // sin gasto no hay ROI que calcular
    expect(calcularROI(1000, 0)).toBe(0); // sin ingreso proyectado, no reportar -100% engañoso
    expect(calcularPrecioPromedioCompradores([])).toBe(0);
    expect(calcularProduccionEstimadaKg([])).toBe(0);
  });
});

describe("calcularPresupuestoVsReal — caso a mano", () => {
  it("calcula variación y porcentaje de ejecución exactos", () => {
    // Presupuesto INSUMOS: planeado $1.000.000, gastado real $700.000 + $300.000 = $1.000.000 → 100%
    // Presupuesto MANO_OBRA: planeado $500.000, gastado real $600.000 → 120% (sobre-ejecutado)
    // Presupuesto AGUA_RIEGO: planeado $200.000, sin gastos registrados → 0%
    const presupuestos = [
      { categoria: "INSUMOS" as const, montoPlaneado: 1_000_000 },
      { categoria: "MANO_OBRA" as const, montoPlaneado: 500_000 },
      { categoria: "AGUA_RIEGO" as const, montoPlaneado: 200_000 },
    ];
    const gastos = [
      { categoria: "INSUMOS" as const, monto: 700_000 },
      { categoria: "INSUMOS" as const, monto: 300_000 },
      { categoria: "MANO_OBRA" as const, monto: 600_000 },
    ];

    const r = calcularPresupuestoVsReal(presupuestos, gastos);

    expect(r).toEqual([
      { categoria: "INSUMOS", planeado: 1_000_000, real: 1_000_000, variacion: 0, porcentaje: 100 },
      { categoria: "MANO_OBRA", planeado: 500_000, real: 600_000, variacion: 100_000, porcentaje: 120 },
      { categoria: "AGUA_RIEGO", planeado: 200_000, real: 0, variacion: -200_000, porcentaje: 0 },
    ]);
  });
});

describe("calcularCostosPorTipo / calcularPorCategoria — casos a mano", () => {
  it("suma correctamente por tipoGasto", () => {
    const gastos = [
      { tipoGasto: "FIJO" as const, monto: 100 },
      { tipoGasto: "FIJO" as const, monto: 50 },
      { tipoGasto: "VARIABLE" as const, monto: 200 },
      { tipoGasto: "INVERSION" as const, monto: 1000 },
    ];
    expect(calcularCostosPorTipo(gastos)).toEqual({ FIJO: 150, VARIABLE: 200, INVERSION: 1000 });
  });

  it("agrupa y ordena por categoría de mayor a menor", () => {
    const gastos = [
      { categoria: "INSUMOS" as const, monto: 100 },
      { categoria: "MANO_OBRA" as const, monto: 500 },
      { categoria: "INSUMOS" as const, monto: 50 },
    ];
    expect(calcularPorCategoria(gastos)).toEqual([
      { name: "MANO_OBRA", value: 500 },
      { name: "INSUMOS", value: 150 },
    ]);
  });
});
