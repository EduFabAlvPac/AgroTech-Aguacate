import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";

// Ya no filtra por userId — la autorización real la hace requireAccess()
// contra el fincaId del comprador (Fase 2).
async function fetchCompradorConFinca(id: string) {
  return db.comprador.findUnique({ where: { id }, select: { id: true, fincaId: true } });
}

// GET /api/compradores/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchCompradorConFinca(id);
    if (!existente || !existente.fincaId) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireAccess(session, "comprador", "read", { fincaId: existente.fincaId });

    const comprador = await db.comprador.findUnique({
      where: { id },
      include: {
        ingresos: {
          include: { cultivo: { include: { lote: true } } },
          orderBy: { fecha: "desc" },
        },
      },
    });

    return NextResponse.json({ data: comprador });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/compradores/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/compradores/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchCompradorConFinca(id);
    if (!existente || !existente.fincaId) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireAccess(session, "comprador", "update", { fincaId: existente.fincaId });

    const body = await req.json();
    const comprador = await db.comprador.update({
      where: { id },
      data: {
        nombre: body.nombre,
        tipo: body.tipo,
        ciudad: body.ciudad,
        departamento: body.departamento,
        contacto: body.contacto,
        email: body.email,
        telefono: body.telefono,
        capacidadTon: body.capacidadTon ? Number(body.capacidadTon) : undefined,
        precioKg: body.precioKg ? Number(body.precioKg) : undefined,
        notas: body.notas,
        estado: body.estado,
      },
    });

    return NextResponse.json({ data: comprador });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[PUT /api/compradores/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/compradores/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchCompradorConFinca(id);
    if (!existente || !existente.fincaId) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireAccess(session, "comprador", "delete", { fincaId: existente.fincaId });

    await db.comprador.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/compradores/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
