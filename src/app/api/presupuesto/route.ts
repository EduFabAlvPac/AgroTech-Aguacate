import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverFincaActiva } from "@/lib/finca-activa";

// GET /api/presupuesto — obtener presupuesto del año actual (o año indicado) de la finca activa
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const anio = Number(searchParams.get("anio")) || new Date().getFullYear();

    const { fincaActivaId } = await resolverFincaActiva(session);
    if (!fincaActivaId) return NextResponse.json({ data: [] });
    await requireAccess(session, "presupuesto", "read", { fincaId: fincaActivaId });

    const presupuestos = await db.presupuesto.findMany({
      where: { fincaId: fincaActivaId, anio },
      orderBy: { categoria: "asc" },
    });

    return NextResponse.json({ data: presupuestos });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/presupuesto]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/presupuesto — crear/actualizar ítem de presupuesto (finca activa)
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

    const { fincaActivaId } = await resolverFincaActiva(session);
    if (!fincaActivaId) {
      return NextResponse.json({ error: "No se encontró finca" }, { status: 404 });
    }
    await requireAccess(session, "presupuesto", "create", { fincaId: fincaActivaId });

    const presupuesto = await db.presupuesto.upsert({
      where: {
        fincaId_anio_categoria: {
          fincaId: fincaActivaId,
          anio: Number(anio),
          categoria,
        },
      },
      update: { montoPlaneado: Number(montoPlaneado) },
      create: {
        userId: session.user.id,
        fincaId: fincaActivaId,
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
