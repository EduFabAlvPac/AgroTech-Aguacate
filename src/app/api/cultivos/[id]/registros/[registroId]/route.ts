import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { registroFormSchema } from "@/lib/validations";
import { requireAccess, AuthzError } from "@/lib/authz";

// Schema parcial para actualización (todos opcionales, sin cultivoId)
const registroUpdateSchema = registroFormSchema.omit({ cultivoId: true }).partial();

// Ya no filtra por userId — la autorización real la hace requireAccess()
// contra el fincaId del lote (Fase 2).
async function fetchRegistroConFinca(registroId: string) {
  return db.registroCultivo.findUnique({
    where: { id: registroId },
    include: {
      cultivo: { include: { lote: { select: { fincaId: true } } } },
    },
  });
}

// PUT /api/cultivos/[id]/registros/[registroId] — actualizar un registro
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; registroId: string }> }
) {
  try {
    const { id, registroId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = registroUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const registro = await fetchRegistroConFinca(registroId);
    if (!registro) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }
    await requireAccess(session, "registroCultivo", "update", { fincaId: registro.cultivo.lote.fincaId });

    // Verificar que el registro pertenece al cultivo indicado en la URL
    if (registro.cultivoId !== id) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    const { tipo, descripcion, fecha, imagenes } = parsed.data;

    const updated = await db.registroCultivo.update({
      where: { id: registroId },
      data: {
        ...(tipo !== undefined && { tipo }),
        ...(descripcion !== undefined && { descripcion }),
        ...(fecha !== undefined && { fecha: new Date(fecha) }),
        ...(imagenes !== undefined && { imagenes }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[PUT /api/cultivos/[id]/registros/[registroId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/cultivos/[id]/registros/[registroId] — eliminar un registro
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; registroId: string }> }
) {
  try {
    const { id, registroId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const registro = await fetchRegistroConFinca(registroId);
    if (!registro) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }
    await requireAccess(session, "registroCultivo", "delete", { fincaId: registro.cultivo.lote.fincaId });

    // Verificar que el registro pertenece al cultivo indicado en la URL
    if (registro.cultivoId !== id) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    await db.registroCultivo.delete({ where: { id: registroId } });

    return NextResponse.json({ data: { message: "Registro eliminado" } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/cultivos/[id]/registros/[registroId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
