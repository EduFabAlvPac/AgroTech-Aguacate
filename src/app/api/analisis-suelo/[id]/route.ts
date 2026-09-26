import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { analisisSueloFormSchema } from "@/lib/validations";
import { datosAnalisis, resolverAtribucion, AnalisisSueloError } from "@/lib/analisis-suelo-datos";
import { auditarBorrado } from "@/lib/borrado-guardas";

async function fetchAnalisisConFinca(id: string) {
  return db.analisisSuelo.findUnique({
    where: { id },
    select: { id: true, loteId: true, cultivoId: true, etapa: true, lote: { select: { fincaId: true } } },
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

    const atribucion = await resolverAtribucion(existente.loteId, parsed.data.cultivoId, { cultivoId: existente.cultivoId, etapa: existente.etapa });
    const analisis = await db.analisisSuelo.update({
      where: { id },
      data: { ...datosAnalisis(parsed.data), ...atribucion },
    });

    return NextResponse.json({ data: analisis });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof AnalisisSueloError) return NextResponse.json({ error: error.message }, { status: 400 });
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
    await auditarBorrado({ actorId: session.user.id, actorEmail: session.user.email, accion: "analisis_suelo.eliminar", recurso: "AnalisisSuelo", recursoId: id, fincaId: existente.lote.fincaId });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/analisis-suelo/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
