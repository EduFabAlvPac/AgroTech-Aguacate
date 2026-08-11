import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";

async function fetchEnlaceConFinca(id: string) {
  return db.enlaceCompartido.findUnique({
    where: { id },
    select: { id: true, cultivo: { select: { lote: { select: { fincaId: true } } } } },
  });
}

// PATCH /api/enlaces/[id] — revocar o reactivar (body: { revocado: boolean })
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchEnlaceConFinca(id);
    if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireAccess(session, "enlaceCompartido", "update", { fincaId: existente.cultivo.lote.fincaId });

    const body = await req.json();
    if (typeof body.revocado !== "boolean") {
      return NextResponse.json({ error: "revocado (boolean) es requerido" }, { status: 400 });
    }

    const enlace = await db.enlaceCompartido.update({
      where: { id },
      data: { revocado: body.revocado },
    });

    return NextResponse.json({ data: enlace });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[PATCH /api/enlaces/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/enlaces/[id] — eliminar definitivamente
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchEnlaceConFinca(id);
    if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireAccess(session, "enlaceCompartido", "delete", { fincaId: existente.cultivo.lote.fincaId });

    await db.enlaceCompartido.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/enlaces/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
