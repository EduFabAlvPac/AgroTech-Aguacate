import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import { assertFichaEditable, FichaNoEditableError } from "@/lib/fichas-tecnicas";

// POST /api/admin/fichas-tecnicas/[id]/curva — agregar punto de curva de producción
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: fichaId } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const body = await req.json();
    const { anioProduccion, kgPorPlantaEsperado, kgPorHaEsperado } = body;
    if (!anioProduccion) return NextResponse.json({ error: "anioProduccion es requerido" }, { status: 400 });

    const existente = await db.puntoCurvaProduccion.findUnique({
      where: { fichaId_anioProduccion: { fichaId, anioProduccion: Number(anioProduccion) } },
    });
    if (existente) {
      return NextResponse.json({ error: `Ya existe un punto para el año ${anioProduccion}` }, { status: 409 });
    }

    const punto = await db.puntoCurvaProduccion.create({
      data: {
        fichaId,
        anioProduccion: Number(anioProduccion),
        kgPorPlantaEsperado: kgPorPlantaEsperado ? Number(kgPorPlantaEsperado) : undefined,
        kgPorHaEsperado: kgPorHaEsperado ? Number(kgPorHaEsperado) : undefined,
      },
    });

    return NextResponse.json({ data: punto }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof FichaNoEditableError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/admin/fichas-tecnicas/[id]/curva]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
