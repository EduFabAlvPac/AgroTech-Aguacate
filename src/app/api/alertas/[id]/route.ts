import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";

// Ya no filtra por userId — la autorización real la hace requireAccess()
// contra el fincaId de la alerta (Fase 2).
async function fetchAlertaConFinca(id: string) {
  return db.alertaClimatica.findUnique({ where: { id }, select: { id: true, fincaId: true } });
}

// GET /api/alertas/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchAlertaConFinca(id);
    if (!existente || !existente.fincaId) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    await requireAccess(session, "alerta", "read", { fincaId: existente.fincaId });

    const alerta = await db.alertaClimatica.findUnique({ where: { id } });
    return NextResponse.json({ data: alerta });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/alertas/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/alertas/[id] — mark as read, toggle active, update
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchAlertaConFinca(id);
    if (!existente || !existente.fincaId) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    await requireAccess(session, "alerta", "update", { fincaId: existente.fincaId });

    const body = await req.json();
    const alerta = await db.alertaClimatica.update({
      where: { id },
      data: {
        leida: body.leida !== undefined ? body.leida : undefined,
        activa: body.activa !== undefined ? body.activa : undefined,
        titulo: body.titulo,
        descripcion: body.descripcion,
      },
    });

    return NextResponse.json({ data: alerta });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[PUT /api/alertas/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/alertas/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchAlertaConFinca(id);
    if (!existente || !existente.fincaId) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    await requireAccess(session, "alerta", "delete", { fincaId: existente.fincaId });

    await db.alertaClimatica.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/alertas/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
