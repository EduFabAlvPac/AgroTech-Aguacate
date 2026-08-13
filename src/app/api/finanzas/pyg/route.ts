import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { CATEGORIA_LABELS } from "@/types";
import type { CategoriaGasto } from "@prisma/client";

/**
 * GET /api/finanzas/pyg — Estado de Resultados (Pérdidas y Ganancias) formal,
 * RF12 de docs/REQUERIMIENTOS.md §1.2. Complementa (no reemplaza) el resumen
 * simplificado de /api/finanzas/resumen: aquí se separan costos directos
 * (atribuibles a un cultivo específico vía Gasto.cultivoId) de indirectos
 * (gastos de finca sin cultivo asignado — agua, tierra, administración
 * general), con utilidad bruta y neta, desglose por cultivo, y — cuando el
 * cultivo tiene InversionCultivo asociadas — la utilidad neta distribuible
 * según porcentajeParticipacion de cada inversionista.
 *
 * Rango de fechas libre (desde/hasta) en vez de solo año calendario, a
 * diferencia de /api/finanzas/resumen — un estado de resultados formal suele
 * pedirse por trimestre o por ciclo de cosecha, no solo por año.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const hoy = new Date();
    const desdeParam = searchParams.get("desde");
    const hastaParam = searchParams.get("hasta");
    const cultivoIdFiltro = searchParams.get("cultivoId"); // null = toda la finca

    const desde = desdeParam ? new Date(desdeParam) : new Date(hoy.getFullYear(), 0, 1);
    const hasta = hastaParam ? new Date(hastaParam) : new Date(hoy.getFullYear(), 11, 31, 23, 59, 59);
    // Normalizar "hasta" al final del día cuando viene de un <input type="date">
    hasta.setHours(23, 59, 59, 999);

    const { fincaActivaId } = await resolverFincaActiva(session);
    const finca = fincaActivaId ? await db.finca.findUnique({ where: { id: fincaActivaId }, select: { id: true, nombre: true } }) : null;

    if (!finca) {
      return NextResponse.json({ error: "No se encontró finca" }, { status: 404 });
    }

    // ── Datos base del período ────────────────────────────────────────────────

    const gastos = await db.gasto.findMany({
      where: {
        fincaId: finca.id,
        fecha: { gte: desde, lte: hasta },
        ...(cultivoIdFiltro ? { cultivoId: cultivoIdFiltro } : {}),
      },
      select: {
        monto: true,
        categoria: true,
        cultivoId: true,
        cultivo: { select: { id: true, especie: true, variedad: true, lote: { select: { nombre: true } } } },
      },
    });

    // Un Ingreso no tiene fincaId propio — se scopea vía su cultivo (lote →
    // finca) o vía su comprador (Comprador.fincaId), igual que en
    // GET /api/ingresos. Sin esto, ingresos ligados solo a un comprador
    // quedarían fuera del reporte.
    const ingresos = await db.ingreso.findMany({
      where: {
        OR: [{ cultivo: { lote: { fincaId: finca.id } } }, { comprador: { fincaId: finca.id } }],
        fecha: { gte: desde, lte: hasta },
        ...(cultivoIdFiltro ? { cultivoId: cultivoIdFiltro } : {}),
      },
      select: {
        monto: true,
        cultivoId: true,
        cultivo: { select: { id: true, especie: true, variedad: true, lote: { select: { nombre: true } } } },
      },
    });

    // ── Costos directos vs. indirectos ──────────────────────────────────────
    // Directo = atribuible a un cultivo específico (Gasto.cultivoId set).
    // Indirecto = gasto de finca sin cultivo asignado (ej. agua/riego general,
    // arriendo de tierra, administración) — no se prorratea en el total de
    // finca, solo al bajar al detalle por cultivo (ver más abajo).
    const gastosDirectos = gastos.filter((g) => g.cultivoId);
    const gastosIndirectos = gastos.filter((g) => !g.cultivoId);

    const costosDirectos = gastosDirectos.reduce((s, g) => s + g.monto, 0);
    const costosIndirectos = gastosIndirectos.reduce((s, g) => s + g.monto, 0);
    const ingresosOperativos = ingresos.reduce((s, i) => s + i.monto, 0);

    const utilidadBruta = ingresosOperativos - costosDirectos;
    const utilidadNeta = utilidadBruta - costosIndirectos;
    const margenBrutoPct = ingresosOperativos > 0 ? (utilidadBruta / ingresosOperativos) * 100 : 0;
    const margenNetoPct = ingresosOperativos > 0 ? (utilidadNeta / ingresosOperativos) * 100 : 0;

    const agrupar = (items: { categoria: CategoriaGasto; monto: number }[]) => {
      const acc: Partial<Record<CategoriaGasto, number>> = {};
      for (const it of items) acc[it.categoria] = (acc[it.categoria] ?? 0) + it.monto;
      return Object.entries(acc)
        .map(([categoria, monto]) => ({ categoria, label: CATEGORIA_LABELS[categoria as CategoriaGasto], monto: monto ?? 0 }))
        .sort((a, b) => b.monto - a.monto);
    };

    // ── Desglose por cultivo ─────────────────────────────────────────────────
    const cultivoLabel = (c: { especie: string; variedad: string; lote: { nombre: string } }) =>
      `${c.especie} ${c.variedad} — ${c.lote.nombre}`;

    const porCultivoMap = new Map<
      string,
      { cultivoId: string; nombre: string; ingresos: number; costosDirectos: number }
    >();
    const SIN_CULTIVO_KEY = "__sin_cultivo__";
    porCultivoMap.set(SIN_CULTIVO_KEY, { cultivoId: SIN_CULTIVO_KEY, nombre: "Sin cultivo asignado", ingresos: 0, costosDirectos: 0 });

    for (const g of gastosDirectos) {
      const key = g.cultivoId!;
      if (!porCultivoMap.has(key)) {
        porCultivoMap.set(key, { cultivoId: key, nombre: g.cultivo ? cultivoLabel(g.cultivo) : "Cultivo eliminado", ingresos: 0, costosDirectos: 0 });
      }
      porCultivoMap.get(key)!.costosDirectos += g.monto;
    }
    for (const i of ingresos) {
      const key = i.cultivoId ?? SIN_CULTIVO_KEY;
      if (!porCultivoMap.has(key)) {
        porCultivoMap.set(key, { cultivoId: key, nombre: i.cultivo ? cultivoLabel(i.cultivo) : "Sin cultivo asignado", ingresos: 0, costosDirectos: 0 });
      }
      porCultivoMap.get(key)!.ingresos += i.monto;
    }

    const porCultivo = [...porCultivoMap.values()]
      .filter((c) => c.ingresos > 0 || c.costosDirectos > 0)
      .map((c) => ({
        ...c,
        utilidadBruta: c.ingresos - c.costosDirectos,
        // Prorrateo de costos indirectos: proporcional a la participación del
        // cultivo en el total de costos directos de la finca — método simple
        // y transparente (se explicita en la UI), no exacto, mientras no
        // exista un criterio de asignación más fino (ej. por área/lote).
        costosIndirectosProrrateados:
          costosDirectos > 0 ? costosIndirectos * (c.costosDirectos / costosDirectos) : 0,
      }))
      .map((c) => ({ ...c, utilidadNeta: c.utilidadBruta - c.costosIndirectosProrrateados }))
      .sort((a, b) => b.utilidadBruta - a.utilidadBruta);

    // ── Distribución a inversionistas (RF12 criterio 2) ─────────────────────
    const inversiones = await db.inversionCultivo.findMany({
      where: {
        cultivo: { lote: { fincaId: finca.id } },
        estado: "ACTIVA",
        ...(cultivoIdFiltro ? { cultivoId: cultivoIdFiltro } : {}),
      },
      select: {
        id: true,
        cultivoId: true,
        montoAportado: true,
        porcentajeParticipacion: true,
        inversionista: { select: { nombre: true } },
      },
    });

    const distribucionInversionistas = inversiones.map((inv) => {
      const cultivoData = porCultivo.find((c) => c.cultivoId === inv.cultivoId);
      const utilidadNetaCultivo = cultivoData?.utilidadNeta ?? 0;
      return {
        inversionId: inv.id,
        inversionistaNombre: inv.inversionista.nombre,
        cultivoId: inv.cultivoId,
        cultivoNombre: cultivoData?.nombre ?? "—",
        montoAportado: inv.montoAportado,
        porcentajeParticipacion: inv.porcentajeParticipacion,
        utilidadNetaCultivo,
        montoDistribuible: (utilidadNetaCultivo * inv.porcentajeParticipacion) / 100,
      };
    });

    return NextResponse.json({
      data: {
        fincaNombre: finca.nombre,
        periodo: { desde: desde.toISOString(), hasta: hasta.toISOString() },
        cultivoFiltroId: cultivoIdFiltro,
        ingresosOperativos,
        costosDirectos,
        costosIndirectos,
        utilidadBruta,
        utilidadNeta,
        margenBrutoPct,
        margenNetoPct,
        desgloseCostosDirectos: agrupar(gastosDirectos),
        desgloseCostosIndirectos: agrupar(gastosIndirectos),
        porCultivo,
        distribucionInversionistas,
      },
    });
  } catch (error) {
    console.error("[GET /api/finanzas/pyg]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
