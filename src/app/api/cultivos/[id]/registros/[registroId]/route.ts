import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { registroFormSchema } from "@/lib/validations";

// Schema parcial para actualización (todos opcionales, sin cultivoId)
const registroUpdateSchema = registroFormSchema.omit({ cultivoId: true }).partial();

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

    // Verificar que el registro existe y pertenece al usuario (ownership chain)
    const registro = await db.registroCultivo.findUnique({
      where: { id: registroId },
      include: {
        cultivo: {
          include: {
            lote: {
              include: {
                finca: { select: { userId: true } },
              },
            },
          },
        },
      },
    });

    if (!registro) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    if (registro.cultivo.lote.finca.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Verificar que el registro pertenece al cultivo indicado en la URL
    if (registro.cultivoId !== id) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    const { tipo, descripcion, fecha } = parsed.data;

    const updated = await db.registroCultivo.update({
      where: { id: registroId },
      data: {
        ...(tipo !== undefined && { tipo }),
        ...(descripcion !== undefined && { descripcion }),
        ...(fecha !== undefined && { fecha: new Date(fecha) }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
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

    // Verificar que el registro existe y pertenece al usuario (ownership chain)
    const registro = await db.registroCultivo.findUnique({
      where: { id: registroId },
      include: {
        cultivo: {
          include: {
            lote: {
              include: {
                finca: { select: { userId: true } },
              },
            },
          },
        },
      },
    });

    if (!registro) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    if (registro.cultivo.lote.finca.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Verificar que el registro pertenece al cultivo indicado en la URL
    if (registro.cultivoId !== id) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    await db.registroCultivo.delete({ where: { id: registroId } });

    return NextResponse.json({ data: { message: "Registro eliminado" } });
  } catch (error) {
    console.error("[DELETE /api/cultivos/[id]/registros/[registroId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
