import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/finanzas/resumen — KPIs financieros calculados
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const anio = Number(searchParams.get("anio")) || new Date().getFullYear();

    const finca = await db.finca.findFirst({
      where: { userId: session.user.id },
      include: {
        lotes: {
          include: {
            cultivos: { where: { estado: "ACTIVO" } },
          },
        },
      },
    });

    if (!finca) {
      return NextResponse.json({ data: null, error: "No se encontró finca" }, { status: 404 });
    }

    const fechaInicio = new Date(anio, 0, 1);
    const fechaFin = new Date(anio, 11, 31, 23, 59, 59);

    // Fetch all gastos for this finca in the year
    const gastos = await db.gasto.findMany({
      where: {
        fincaId: finca.id,
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
      include: { lote: true, cultivo: true },
    });

    // Fetch ingresos
    const ingresos = await db.ingreso.findMany({
      where: {
        cultivo: { lote: { fincaId: finca.id } },
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
    });

    // Fetch presupuestos
    const presupuestos = await db.presupuesto.findMany({
      where: { fincaId: finca.id, anio },
    });

    // Fetch compradores for pricing
    const compradores = await db.comprador.findMany({
      where: { userId: session.user.id, estado: "ACTIVO" },
      select: { precioKg: true },
    });

    // ── Cálculos ─────────────────────────────────────────────────────────────

    const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
    const totalIngresos = ingresos.reduce((s, i) => s + i.monto, 0);
    const saldo = totalIngresos - totalGastos;

    // Costos por lote
    const lotesMap: Record<string, { nombre: string; areaHa: number; total: number }> = {};
    let sinAsignar = 0;

    for (const g of gastos) {
      if (g.loteId && g.lote) {
        if (!lotesMap[g.loteId]) {
          lotesMap[g.loteId] = { nombre: g.lote.nombre, areaHa: g.lote.areaHa, total: 0 };
        }
        lotesMap[g.loteId].total += g.monto;
      } else {
        sinAsignar += g.monto;
      }
    }

    const costoPorLote = [
      ...Object.entries(lotesMap).map(([loteId, d]) => ({
        loteId,
        nombre: d.nombre,
        areaHa: d.areaHa,
        total: d.total,
        costoPorHa: d.areaHa > 0 ? d.total / d.areaHa : 0,
      })),
      ...(sinAsignar > 0 ? [{ loteId: "sin-asignar", nombre: "Sin asignar", areaHa: 0, total: sinAsignar, costoPorHa: 0 }] : []),
    ];

    // Costos por tipo
    const costosPorTipo = { FIJO: 0, VARIABLE: 0, INVERSION: 0 };
    for (const g of gastos) {
      costosPorTipo[g.tipoGasto] += g.monto;
    }

    // Presupuesto vs Real
    const presupuestoVsReal = presupuestos.map((p) => {
      const real = gastos
        .filter((g) => g.categoria === p.categoria)
        .reduce((s, g) => s + g.monto, 0);
      return {
        categoria: p.categoria,
        planeado: p.montoPlaneado,
        real,
        variacion: real - p.montoPlaneado,
        porcentajeEjecucion: p.montoPlaneado > 0 ? (real / p.montoPlaneado) * 100 : 0,
      };
    });

    // Indicadores agronómicos
    const hectareasActivas = finca.lotes.reduce((s, l) => s + l.areaHa, 0);
    const plantasActivas = finca.lotes.reduce(
      (s, l) => s + l.cultivos.reduce((cs, c) => cs + (c.cantidadPlantas ?? 0), 0),
      0
    );

    const costoTotalPorHa = hectareasActivas > 0 ? totalGastos / hectareasActivas : 0;
    const costoTotalPorPlanta = plantasActivas > 0 ? totalGastos / plantasActivas : 0;

    // Punto de equilibrio: 8 ton/ha estimado Hass año 2+
    const produccionEstimadaKg = finca.lotes.reduce((s, l) => s + l.areaHa * 8000, 0);
    const puntoEquilibrioPrecio = produccionEstimadaKg > 0 ? totalGastos / produccionEstimadaKg : 0;

    // Margen bruto proyectado
    const preciosCompradores = compradores.filter((c) => c.precioKg).map((c) => c.precioKg!);
    const precioPromedioCompradores = preciosCompradores.length > 0
      ? preciosCompradores.reduce((s, p) => s + p, 0) / preciosCompradores.length
      : 3200;

    const ingresoProyectado = produccionEstimadaKg * precioPromedioCompradores;
    const margenBruto = ingresoProyectado - totalGastos;
    const margenPorcentaje = ingresoProyectado > 0 ? (margenBruto / ingresoProyectado) * 100 : 0;

    // Top 5 gastos mayores
    const top5Gastos = [...gastos]
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5)
      .map((g) => ({
        id: g.id,
        concepto: g.concepto,
        categoria: g.categoria,
        monto: g.monto,
        fecha: g.fecha,
      }));

    return NextResponse.json({
      data: {
        totalGastos,
        totalIngresos,
        saldo,
        costoPorLote,
        costosPorTipo,
        presupuestoVsReal,
        top5Gastos,
        indicadores: {
          hectareasActivas,
          plantasActivas,
          costoTotalPorHa,
          costoTotalPorPlanta,
          produccionEstimadaKg,
          puntoEquilibrioPrecio,
          precioPromedioCompradores,
          ingresoProyectado,
          margenBruto,
          margenPorcentaje,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/finanzas/resumen]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
