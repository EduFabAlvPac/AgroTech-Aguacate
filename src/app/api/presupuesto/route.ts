import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { fincaIdsAccesibles } from "@/lib/db/scoped";

// GET /api/presupuesto — obtener presupuesto del año actual (o año indicado)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const anio = Number(searchParams.get("anio")) || new Date().getFullYear();

    const fincaIds = await fincaIdsAccesibles(session);
    const finca =
      fincaIds === "ALL"
        ? await db.finca.findFirst({ select: { id: true } })
        : fincaIds.length > 0
          ? await db.finca.findFirst({ where: { id: { in: fincaIds } }, select: { id: true } })
          : null;

    if (!finca) return NextResponse.json({ data: [] });
    await requireAccess(session, "presupuesto", "read", { fincaId: finca.id });

    const presupuestos = await db.presupuesto.findMany({
      where: { fincaId: finca.id, anio },
      orderBy: { categoria: "asc" },
    });

    return NextResponse.json({ data: presupuestos });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/presupuesto]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/presupuesto — crear/actualizar ítem de presupuesto
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { anio, categoria, montoPlaneado } = body;

    if (!anio || !categoria || montoPlaneado == null) {
      return NextResponse.json(
        { error: "anio, categoria y montoPlaneado son requeridos" },
        { status: 400 }
      );
    }

    const fincaIds = await fincaIdsAccesibles(session);
    const finca =
      fincaIds === "ALL"
        ? await db.finca.findFirst({ select: { id: true } })
        : fincaIds.length > 0
          ? await db.finca.findFirst({ where: { id: { in: fincaIds } }, select: { id: true } })
          : null;

    if (!finca) {
      return NextResponse.json({ error: "No se encontró finca" }, { status: 404 });
    }
    await requireAccess(session, "presupuesto", "create", { fincaId: finca.id });

    const presupuesto = await db.presupuesto.upsert({
      where: {
        fincaId_anio_categoria: {
          fincaId: finca.id,
          anio: Number(anio),
          categoria,
        },
      },
      update: { montoPlaneado: Number(montoPlaneado) },
      create: {
        userId: session.user.id,
        fincaId: finca.id,
        anio: Number(anio),
        categoria,
        montoPlaneado: Number(montoPlaneado),
      },
    });

    return NextResponse.json({ data: presupuesto }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/presupuesto]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
