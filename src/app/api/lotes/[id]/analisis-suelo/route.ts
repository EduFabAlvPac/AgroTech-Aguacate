import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { analisisSueloFormSchema } from "@/lib/validations";

// GET /api/lotes/[id]/analisis-suelo — historial de análisis de suelo del lote (RF3)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: loteId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const lote = await db.lote.findUnique({ where: { id: loteId }, select: { id: true, fincaId: true } });
    if (!lote) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    await requireAccess(session, "analisisSuelo", "read", { fincaId: lote.fincaId });

    const analisis = await db.analisisSuelo.findMany({
      where: { loteId },
      orderBy: { fechaMuestreo: "desc" },
    });

    return NextResponse.json({ data: analisis });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/lotes/[id]/analisis-suelo]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/lotes/[id]/analisis-suelo — registrar un nuevo análisis de suelo
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: loteId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const lote = await db.lote.findUnique({ where: { id: loteId }, select: { id: true, fincaId: true } });
    if (!lote) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    await requireAccess(session, "analisisSuelo", "create", { fincaId: lote.fincaId });

    const body = await req.json();
    const parsed = analisisSueloFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }

    const analisis = await db.analisisSuelo.create({
      data: {
        loteId,
        fechaMuestreo: new Date(parsed.data.fechaMuestreo),
        ph: parsed.data.ph,
        materiaOrganica: parsed.data.materiaOrganica,
        nitrogeno: parsed.data.nitrogeno,
        fosforo: parsed.data.fosforo,
        potasio: parsed.data.potasio,
        textura: parsed.data.textura || undefined,
        conductividad: parsed.data.conductividad,
        laboratorio: parsed.data.laboratorio || undefined,
        notas: parsed.data.notas || undefined,
      },
    });

    return NextResponse.json({ data: analisis }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/lotes/[id]/analisis-suelo]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
