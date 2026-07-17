import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/alertas
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const soloActivas = searchParams.get("activas") === "true";
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const alertas = await db.alertaClimatica.findMany({
      where: soloActivas ? { activa: true } : undefined,
      orderBy: [{ activa: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    const noLeidas = await db.alertaClimatica.count({
      where: { activa: true, leida: false },
    });

    return NextResponse.json({ data: alertas, meta: { noLeidas } });
  } catch (error) {
    console.error("[GET /api/alertas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/alertas — create manual alert
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { tipo, titulo, descripcion, severidad, fechaInicio, municipio } = body;

    if (!tipo || !titulo || !descripcion) {
      return NextResponse.json(
        { error: "tipo, titulo y descripcion son requeridos" },
        { status: 400 }
      );
    }

    const alerta = await db.alertaClimatica.create({
      data: {
        tipo,
        titulo,
        descripcion,
        severidad: severidad ?? "MEDIA",
        fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
        activa: true,
        leida: false,
        municipio: municipio ?? "Norte de Santander",
      },
    });

    return NextResponse.json({ data: alerta }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/alertas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
