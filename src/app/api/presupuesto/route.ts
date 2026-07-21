import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/presupuesto — obtener presupuesto del año actual (o año indicado)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const anio = Number(searchParams.get("anio")) || new Date().getFullYear();

    const finca = await db.finca.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!finca) return NextResponse.json({ data: [] });

    const presupuestos = await db.presupuesto.findMany({
      where: { fincaId: finca.id, anio },
      orderBy: { categoria: "asc" },
    });

    return NextResponse.json({ data: presupuestos });
  } catch (error) {
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

    const finca = await db.finca.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!finca) {
      return NextResponse.json({ error: "No se encontró finca" }, { status: 404 });
    }

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
    console.error("[POST /api/presupuesto]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
