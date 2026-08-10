import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { fincaIdsAccesibles } from "@/lib/db/scoped";

// GET /api/gastos — list + optional summary, scoped a las fincas accesibles (Fase 2)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const categoria = searchParams.get("categoria");
    const cultivoId = searchParams.get("cultivoId");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const summary = searchParams.get("summary") === "true";

    const fincaIds = await fincaIdsAccesibles(session);

    const where: any = {};
    if (fincaIds !== "ALL") where.fincaId = { in: fincaIds };
    if (categoria) where.categoria = categoria;
    if (cultivoId) where.cultivoId = cultivoId;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde);
      if (hasta) where.fecha.lte = new Date(hasta);
    }

    if (summary) {
      const [gastos, byCategory] = await Promise.all([
        db.gasto.aggregate({
          where,
          _sum: { monto: true },
          _count: true,
        }),
        db.gasto.groupBy({
          by: ["categoria"],
          where,
          _sum: { monto: true },
          orderBy: { _sum: { monto: "desc" } },
        }),
      ]);

      return NextResponse.json({
        data: {
          total: gastos._sum.monto ?? 0,
          count: gastos._count,
          byCategory: byCategory.map((g) => ({
            categoria: g.categoria,
            total: g._sum.monto ?? 0,
          })),
        },
      });
    }

    const gastos = await db.gasto.findMany({
      where,
      include: { cultivo: { include: { lote: true } }, lote: true },
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json({ data: gastos });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/gastos]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/gastos — create a new expense
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const {
      concepto, categoria, monto, fecha, proveedor, notas, cultivoId,
      loteId, subcategoria, cantidad, unidad, precioUnitario, numeroFactura, tipoGasto,
    } = body;

    if (!concepto || !categoria || !monto) {
      return NextResponse.json(
        { error: "concepto, categoria y monto son requeridos" },
        { status: 400 }
      );
    }

    // Resolver la finca del gasto: si viene ligado a un cultivo o lote, se usa
    // la finca de ese cultivo/lote (defensa: nunca se confía en un fincaId que
    // mande el cliente sin relación real); si no, se usa la primera finca
    // accesible al usuario (dueño o vía FincaAcceso — Fase 2).
    let fincaId: string | undefined;
    if (cultivoId) {
      const cultivo = await db.cultivo.findUnique({ where: { id: cultivoId }, select: { lote: { select: { fincaId: true } } } });
      if (!cultivo) return NextResponse.json({ error: "Cultivo no encontrado" }, { status: 404 });
      fincaId = cultivo.lote.fincaId;
    } else if (loteId) {
      const lote = await db.lote.findUnique({ where: { id: loteId }, select: { fincaId: true } });
      if (!lote) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
      fincaId = lote.fincaId;
    } else {
      const fincaIds = await fincaIdsAccesibles(session);
      const finca =
        fincaIds === "ALL"
          ? await db.finca.findFirst({ select: { id: true } })
          : fincaIds.length > 0
            ? await db.finca.findFirst({ where: { id: { in: fincaIds } }, select: { id: true } })
            : null;
      if (!finca) return NextResponse.json({ error: "No se encontró finca" }, { status: 404 });
      fincaId = finca.id;
    }

    await requireAccess(session, "gasto", "create", { fincaId });

    const gasto = await db.gasto.create({
      data: {
        userId: session.user.id,
        fincaId,
        concepto,
        categoria,
        monto: Number(monto),
        fecha: fecha ? new Date(fecha) : new Date(),
        proveedor: proveedor || undefined,
        notas: notas || undefined,
        cultivoId: cultivoId || undefined,
        loteId: loteId || undefined,
        subcategoria: subcategoria || undefined,
        cantidad: cantidad ? Number(cantidad) : undefined,
        unidad: unidad || undefined,
        precioUnitario: precioUnitario ? Number(precioUnitario) : undefined,
        numeroFactura: numeroFactura || undefined,
        tipoGasto: tipoGasto || "VARIABLE",
      },
      include: { cultivo: { include: { lote: true } }, lote: true },
    });

    // ── Sync: Auto-create registro in cultivo's bitácora ─────────────────────
    if (cultivoId && gasto.id) {
      const CATEGORIA_TO_TIPO: Record<string, string> = {
        INSUMOS: "FERTILIZACION",
        MANO_OBRA: "OBSERVACION",
        SEMILLAS_PLANTULAS: "SIEMBRA",
        AGUA_RIEGO: "RIEGO",
        TRATAMIENTO_PLAGAS: "TRATAMIENTO_PLAGAS",
      };
      const tipoRegistro = CATEGORIA_TO_TIPO[categoria] || "OBSERVACION";

      db.registroCultivo.create({
        data: {
          cultivoId,
          tipo: tipoRegistro as any,
          descripcion: `💰 Gasto: ${concepto} ($${Number(monto).toLocaleString("es-CO")} COP)`,
          fecha: fecha ? new Date(fecha) : new Date(),
          gastoId: gasto.id,
        },
      }).catch(() => {}); // Non-blocking — don't fail the main request
    }

    return NextResponse.json({ data: gasto }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/gastos]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
