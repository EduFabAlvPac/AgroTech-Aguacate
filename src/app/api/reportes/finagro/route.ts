import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fincaIdsAccesibles } from "@/lib/db/scoped";

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
  // Inversionistas (Fase 3) — capital de terceros aportado a los cultivos de
  // esta finca. null si no hay ninguna inversión activa (no se fabrica una
  // sección vacía en el PDF).
  inversionistas: {
    numInversionistas: number;
    totalAportado: number;
    totalRetornosPagados: number;
  } | null;
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

    // Scoped a las fincas accesibles al usuario (dueño o vía FincaAcceso —
    // Fase 2); antes filtraba por userId literal y un ADMIN_FINCA/COLABORADOR
    // no podía generar el reporte de una finca que no fuera literalmente suya.
    const fincaIds = await fincaIdsAccesibles(session);
    if (fincaIds !== "ALL" && fincaIds.length === 0) {
      return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
    }
    const fincaWhere = fincaIds === "ALL" ? {} : { id: { in: fincaIds } };
    const fincaIdFilter = fincaIds === "ALL" ? undefined : { in: fincaIds };

    // ── Fetch all data in parallel ──────────────────────────────────────────────
    const [finca, jornales, gastos, ingresos, compradores, inversiones] = await Promise.all([
      db.finca.findFirst({
        where: fincaWhere,
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
            { lote: { fincaId: fincaIdFilter } },
            { cultivo: { lote: { fincaId: fincaIdFilter } } },
          ],
        },
        orderBy: { fecha: "desc" },
      }),
      db.gasto.findMany({
        where: {
          fecha: { gte: new Date(desde), lte: new Date(hasta) },
          fincaId: fincaIdFilter,
        },
        orderBy: { fecha: "desc" },
      }),
      db.ingreso.findMany({
        where: {
          fecha: { gte: new Date(desde), lte: new Date(hasta) },
          OR: [
            { cultivo: { lote: { fincaId: fincaIdFilter } } },
            { comprador: { fincaId: fincaIdFilter } },
          ],
        },
      }),
      db.comprador.findMany({
        where: { fincaId: fincaIdFilter, precioKg: { not: null } },
        select: { precioKg: true },
      }),
      // Inversionistas: no está scoped por Inversionista.userId (esa es la
      // capa "solo dueño" de la Fase 3, ver src/lib/modulos.ts) sino por los
      // cultivos reales de esta finca — así el reporte muestra el capital de
      // terceros comprometido en la finca sin importar quién registró cada
      // Inversionista como contacto.
      db.inversionCultivo.findMany({
        where: { cultivo: { lote: { fincaId: fincaIdFilter } }, estado: "ACTIVA" },
        select: { montoAportado: true, inversionistaId: true, retornos: { select: { monto: true } } },
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
    // Sin ficha técnica pinneada no hay rendimiento/ciclo real que proyectar
    // — antes usaba "20 kg/árbol" y "24 meses" fijos (valores típicos de
    // aguacate) para cualquier especie; ahora en 0 si no hay dato real, para
    // no fabricar una cifra en un reporte que puede terminar en un banco.
    const produccionPorArbol = especie?.produccionKgArbolAnual ?? 0;
    const produccionEstimadaKg = totalPlantas * produccionPorArbol;
    const preciosCompradores = compradores.map((c) => c.precioKg!).filter(Boolean);
    const precioPromedioKg = preciosCompradores.length > 0
      ? preciosCompradores.reduce((s, p) => s + p, 0) / preciosCompradores.length
      : 0;
    const ingresoProyectado = produccionEstimadaKg * precioPromedioKg;
    const roi = costoTotal > 0 && ingresoProyectado > 0 ? ((ingresoProyectado - costoTotal) / costoTotal) * 100 : 0;

    const cicloTotal = especie?.cicloMesesPrimeraCosecha ?? 0;
    const mesesTranscurridos = activeCultivo?.fechaSiembra
      ? Math.floor((Date.now() - new Date(activeCultivo.fechaSiembra).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;
    const cicloRestante = cicloTotal > 0 ? Math.max(0, cicloTotal - mesesTranscurridos) : 0;

    // ── Inversionistas ──────────────────────────────────────────────────────────
    const numInversionistas = new Set(inversiones.map((i) => i.inversionistaId)).size;
    const totalAportado = inversiones.reduce((s, i) => s + i.montoAportado, 0);
    const totalRetornosPagados = inversiones.reduce((s, i) => s + i.retornos.reduce((rs, r) => rs + r.monto, 0), 0);

    // ── Build response ──────────────────────────────────────────────────────────
    const reporte: ReporteFinagroData = {
      predio: {
        nombre: finca.nombre,
        municipio: finca.municipio,
        departamento: finca.departamento,
        areaTotal: finca.areaTotal,
        cultivo: activeCultivo?.especie ?? "Sin cultivo activo",
        variedad: activeCultivo?.variedad ?? "",
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
      inversionistas: numInversionistas > 0
        ? { numInversionistas, totalAportado, totalRetornosPagados }
        : null,
    };

    return NextResponse.json({ data: reporte });
  } catch (error) {
    console.error("[GET /api/reportes/finagro]", error);
    return NextResponse.json({ error: "Error al generar reporte" }, { status: 500 });
  }
}
