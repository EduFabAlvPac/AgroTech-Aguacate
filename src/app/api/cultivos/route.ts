import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/cultivos — list all cultivos for the user's fincas
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const cultivos = await db.cultivo.findMany({
      where: {
        lote: { finca: { userId: session.user.id } },
      },
      include: {
        lote: { include: { finca: true } },
        registros: { orderBy: { fecha: "desc" }, take: 5 },
        _count: { select: { registros: true, gastos: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: cultivos });
  } catch (error) {
    console.error("[GET /api/cultivos]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST /api/cultivos — create a new cultivo
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { loteId, especie, variedad, fechaSiembra, cantidadPlantas, densidadHa, etapa, estado, notas, portainjerto, proveedorMaterial, sistemaSiembra, distanciaSiembra, observaciones } = body;

    if (!loteId || !especie) {
      return NextResponse.json({ error: "loteId y especie son requeridos" }, { status: 400 });
    }

    // Verify ownership
    const lote = await db.lote.findFirst({
      where: { id: loteId, finca: { userId: session.user.id } },
    });
    if (!lote) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    // Check if lote already has an active cultivo
    const existingActive = await db.cultivo.findFirst({
      where: { loteId, estado: "ACTIVO" },
    });
    if (existingActive) {
      return NextResponse.json({ error: "Este lote ya tiene un cultivo activo" }, { status: 400 });
    }

    const cultivo = await db.cultivo.create({
      data: {
        loteId,
        especie,
        variedad: variedad || undefined,
        fechaSiembra: fechaSiembra ? new Date(fechaSiembra) : undefined,
        cantidadPlantas: cantidadPlantas ? Number(cantidadPlantas) : undefined,
        densidadHa: densidadHa ? Number(densidadHa) : undefined,
        etapa: etapa ?? "PREPARACION",
        estado: estado ?? "ACTIVO",
        notas: notas || undefined,
        portainjerto: portainjerto || undefined,
        proveedorMaterial: proveedorMaterial || undefined,
        sistemaSiembra: sistemaSiembra || undefined,
        distanciaSiembra: distanciaSiembra || undefined,
        observaciones: observaciones || undefined,
      },
      include: {
        lote: { include: { finca: true } },
        registros: { orderBy: { fecha: "desc" }, take: 5 },
        _count: { select: { registros: true, gastos: true } },
      },
    });

    return NextResponse.json({ data: cultivo }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cultivos]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
