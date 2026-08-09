import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";

// GET /api/admin/fichas-tecnicas/[id] — detalle completo para el editor
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);

    const ficha = await db.fichaTecnica.findUnique({
      where: { id },
      include: {
        variedad: { include: { especie: true } },
        etapas: { orderBy: { orden: "asc" } },
        plagas: { orderBy: { nombre: "asc" } },
        costosRef: { orderBy: { categoria: "asc" } },
        curvaProduccion: { orderBy: { anioProduccion: "asc" } },
        _count: { select: { cultivos: true } },
      },
    });

    if (!ficha) return NextResponse.json({ error: "Ficha técnica no encontrada" }, { status: 404 });

    return NextResponse.json({ data: ficha });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/admin/fichas-tecnicas/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

const CAMPOS_EDITABLES = [
  "notasVersion",
  "altitudMinM", "altitudMaxM",
  "tempMinC", "tempMaxC",
  "humedadMinPct", "humedadMaxPct",
  "phMin", "phMax",
  "precipitacionAnualMinMm", "precipitacionAnualMaxMm",
  "densidadPlantasHaMin", "densidadPlantasHaMax",
  "distanciaSiembraM",
  "cicloProductivoMeses",
  "vidaUtilAnios",
] as const;

// PUT /api/admin/fichas-tecnicas/[id] — editar campos core (solo BORRADOR)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);

    const existente = await db.fichaTecnica.findUnique({ where: { id }, select: { estado: true } });
    if (!existente) return NextResponse.json({ error: "Ficha técnica no encontrada" }, { status: 404 });
    if (existente.estado !== "BORRADOR") {
      return NextResponse.json(
        { error: "Solo se pueden editar fichas en BORRADOR — crea una nueva versión" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (body[campo] !== undefined) data[campo] = body[campo] === "" ? null : body[campo];
    }

    const ficha = await db.fichaTecnica.update({ where: { id }, data });
    return NextResponse.json({ data: ficha });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[PUT /api/admin/fichas-tecnicas/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/admin/fichas-tecnicas/[id] — solo BORRADOR (nunca PUBLICADA/ARCHIVADA)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);

    const existente = await db.fichaTecnica.findUnique({ where: { id }, select: { estado: true } });
    if (!existente) return NextResponse.json({ error: "Ficha técnica no encontrada" }, { status: 404 });
    if (existente.estado !== "BORRADOR") {
      return NextResponse.json({ error: "Solo se pueden eliminar fichas en BORRADOR" }, { status: 400 });
    }

    await db.fichaTecnica.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/admin/fichas-tecnicas/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
