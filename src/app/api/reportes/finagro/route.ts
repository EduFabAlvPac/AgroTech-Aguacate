import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/reportes/finagro?desde=2026-01-01&hasta=2026-12-31
 *
 * Compiles financial data in FINAGRO "Plan de Inversión" structure.
 * Returns JSON with all sections — PDF generation happens client-side
 * using jsPDF (already installed) for Vercel Hobby compatibility.
 *
 * Structure follows Banco Agrario / FINAGRO requirements:
 * 1. Datos del predio
 * 2. Costos directos (mano de obra + insumos)
 * 3. Costos indirectos
 * 4. Resumen financiero
 * 5. Proyección de producción e ingresos
 * 6. Flujo de caja neto
 */

export type ReporteFinagroData = {
  // Datos del predio
  predio: {
    nombre: string;
    municipio: string;
    departamento: string;
    areaTotal: number | null;
    cultivo: string;
    variedad: string;
    etapa: string;
    fechaSiembra: string | null;
    cantidadPlantas: number;
    altitud: number | null;
  };
  // Período del reporte
  periodo: { desde: string; hasta: string };
  // Costos directos
  costosDirectos: {
    manoObra: { total: number; jornales: number; detalle: { operario: string; actividad: string; fecha: string; valor: number }[] };
    insumos: { total: number; detalle: { concepto: string; fecha: string; monto: number }[] };
    semillas: { total: number; detalle: { concepto: string; fecha: string; monto: number }[] };
  };
  // Costos indirectos
  costosIndirectos: {
    total: number;
    porCategoria: { categoria: string; total: number }[];
  };
  // Resumen
  resumen: {
    totalCostosDirectos: number;
    totalCostosIndirectos: number;
    costoTotal: number;
    ingresosRegistrados: number;
    saldoNeto: number;
  };
  // Proyección
  proyeccion: {
    produccionEstimadaKg: number;
    precioPromedioKg: number;
    ingresoProyectado: number;
    roi: number;
    cicloMesesRestantes: number;
  };
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const desde = searchParams.get("desde") || "2026-01-01";
    const hasta = searchParams.get("hasta") || new Date().toISOString().split("T")[0];

    const userId = session.user.id;

    // ── Fetch all data in parallel ──────────────────────────────────────────────
    const [finca, jornales, gastos, ingresos, compradores] = await Promise.all([
      db.finca.findFirst({
        where: { userId },
        include: {
          lotes: {
            include: {
              cultivos: {
                where: { estado: "ACTIVO" },
                include: { especieCultivo: true },
                take: 1,
              },
            },
          },
        },
      }),
      db.jornal.findMany({
        where: {
          fecha: { gte: new Date(desde), lte: new Date(hasta) },
          OR: [
            { lote: { finca: { userId } } },
            { cultivo: { lote: { finca: { userId } } } },
          ],
        },
        orderBy: { fecha: "desc" },
      }),
      db.gasto.findMany({
        where: {
          fecha: { gte: new Date(desde), lte: new Date(hasta) },
          cultivo: { lote: { finca: { userId } } },
        },
        orderBy: { fecha: "desc" },
      }),
      db.ingreso.findMany({
        where: {
          fecha: { gte: new Date(desde), lte: new Date(hasta) },
          OR: [
            { cultivo: { lote: { finca: { userId } } } },
            { comprador: { userId } },
          ],
        },
      }),
      db.comprador.findMany({
        where: { userId, precioKg: { not: null } },
        select: { precioKg: true },
      }),
    ]);

    if (!finca) {
      return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
    }

    // ── Extract cultivo info ────────────────────────────────────────────────────
    const activeCultivo = finca.lotes.flatMap((l) => l.cultivos)[0];
    const especie = activeCultivo?.especieCultivo;
    const totalPlantas = finca.lotes.reduce(
      (s, l) => s + l.cultivos.reduce((cs, c) => cs + (c.cantidadPlantas ?? 0), 0), 0
    );

    // ── Costos Directos: Mano de Obra (from Jornales) ───────────────────────────
    const manoObraTotal = jornales.reduce((s, j) => s + j.valorDia, 0);
    const manoObraDetalle = jornales.map((j) => ({
      operario: j.operario,
      actividad: j.actividad,
      fecha: j.fecha.toISOString().split("T")[0],
      valor: j.valorDia,
    }));

    // ── Costos Directos: Insumos + Semillas ─────────────────────────────────────
    const gastosInsumos = gastos.filter((g) => g.categoria === "INSUMOS");
    const gastosSemillas = gastos.filter((g) => g.categoria === "SEMILLAS_PLANTULAS");
    const insumoTotal = gastosInsumos.reduce((s, g) => s + g.monto, 0);
    const semillasTotal = gastosSemillas.reduce((s, g) => s + g.monto, 0);

    // ── Costos Indirectos (everything else) ─────────────────────────────────────
    const categoriasDirectas = ["MANO_OBRA", "INSUMOS", "SEMILLAS_PLANTULAS"];
    const gastosIndirectos = gastos.filter((g) => !categoriasDirectas.includes(g.categoria));
    const indirectoTotal = gastosIndirectos.reduce((s, g) => s + g.monto, 0);

    const porCategoria: Record<string, number> = {};
    gastosIndirectos.forEach((g) => {
      porCategoria[g.categoria] = (porCategoria[g.categoria] ?? 0) + g.monto;
    });

    // ── Ingresos ────────────────────────────────────────────────────────────────
    const ingresosTotal = ingresos.reduce((s, i) => s + i.monto, 0);

    // ── Resumen ─────────────────────────────────────────────────────────────────
    const totalDirectos = manoObraTotal + insumoTotal + semillasTotal;
    const costoTotal = totalDirectos + indirectoTotal;
    const saldoNeto = ingresosTotal - costoTotal;

    // ── Proyección ──────────────────────────────────────────────────────────────
    const produccionPorArbol = especie?.produccionKgArbolAnual ?? 20;
    const produccionEstimadaKg = totalPlantas * produccionPorArbol;
    const preciosCompradores = compradores.map((c) => c.precioKg!).filter(Boolean);
    const precioPromedioKg = preciosCompradores.length > 0
      ? preciosCompradores.reduce((s, p) => s + p, 0) / preciosCompradores.length
      : 3200;
    const ingresoProyectado = produccionEstimadaKg * precioPromedioKg;
    const roi = costoTotal > 0 ? ((ingresoProyectado - costoTotal) / costoTotal) * 100 : 0;

    const cicloTotal = especie?.cicloMesesPrimeraCosecha ?? 24;
    const mesesTranscurridos = activeCultivo?.fechaSiembra
      ? Math.floor((Date.now() - new Date(activeCultivo.fechaSiembra).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;
    const cicloRestante = Math.max(0, cicloTotal - mesesTranscurridos);

    // ── Build response ──────────────────────────────────────────────────────────
    const reporte: ReporteFinagroData = {
      predio: {
        nombre: finca.nombre,
        municipio: finca.municipio,
        departamento: finca.departamento,
        areaTotal: finca.areaTotal,
        cultivo: activeCultivo?.especie ?? "Aguacate",
        variedad: activeCultivo?.variedad ?? "Hass",
        etapa: activeCultivo?.etapa ?? "SIEMBRA",
        fechaSiembra: activeCultivo?.fechaSiembra?.toISOString().split("T")[0] ?? null,
        cantidadPlantas: totalPlantas,
        altitud: finca.lotes[0]?.altitud ?? null,
      },
      periodo: { desde, hasta },
      costosDirectos: {
        manoObra: { total: manoObraTotal, jornales: jornales.length, detalle: manoObraDetalle },
        insumos: {
          total: insumoTotal,
          detalle: gastosInsumos.map((g) => ({ concepto: g.concepto, fecha: g.fecha.toISOString().split("T")[0], monto: g.monto })),
        },
        semillas: {
          total: semillasTotal,
          detalle: gastosSemillas.map((g) => ({ concepto: g.concepto, fecha: g.fecha.toISOString().split("T")[0], monto: g.monto })),
        },
      },
      costosIndirectos: {
        total: indirectoTotal,
        porCategoria: Object.entries(porCategoria).map(([categoria, total]) => ({ categoria, total })),
      },
      resumen: {
        totalCostosDirectos: totalDirectos,
        totalCostosIndirectos: indirectoTotal,
        costoTotal,
        ingresosRegistrados: ingresosTotal,
        saldoNeto,
      },
      proyeccion: {
        produccionEstimadaKg,
        precioPromedioKg,
        ingresoProyectado,
        roi,
        cicloMesesRestantes: cicloRestante,
      },
    };

    return NextResponse.json({ data: reporte });
  } catch (error) {
    console.error("[GET /api/reportes/finagro]", error);
    return NextResponse.json({ error: "Error al generar reporte" }, { status: 500 });
  }
}
