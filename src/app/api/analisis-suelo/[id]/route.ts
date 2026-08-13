import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { analisisSueloFormSchema } from "@/lib/validations";

async function fetchAnalisisConFinca(id: string) {
  return db.analisisSuelo.findUnique({
    where: { id },
    select: { id: true, lote: { select: { fincaId: true } } },
  });
}

// PUT /api/analisis-suelo/[id] — editar un análisis de suelo
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchAnalisisConFinca(id);
    if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireAccess(session, "analisisSuelo", "update", { fincaId: existente.lote.fincaId });

    const body = await req.json();
    const parsed = analisisSueloFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }

    const analisis = await db.analisisSuelo.update({
      where: { id },
      data: {
        fechaMuestreo: new Date(parsed.data.fechaMuestreo),
        ph: parsed.data.ph,
        materiaOrganica: parsed.data.materiaOrganica,
        nitrogeno: parsed.data.nitrogeno,
        fosforo: parsed.data.fosforo,
        potasio: parsed.data.potasio,
        textura: parsed.data.textura || null,
        conductividad: parsed.data.conductividad,
        laboratorio: parsed.data.laboratorio || null,
        notas: parsed.data.notas || null,
      },
    });

    return NextResponse.json({ data: analisis });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[PUT /api/analisis-suelo/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/analisis-suelo/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchAnalisisConFinca(id);
    if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireAccess(session, "analisisSuelo", "delete", { fincaId: existente.lote.fincaId });

    await db.analisisSuelo.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/analisis-suelo/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
