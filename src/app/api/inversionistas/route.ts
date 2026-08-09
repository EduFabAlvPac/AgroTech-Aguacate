import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/inversionistas — con sus inversiones por cultivo y retornos
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const inversionistas = await db.inversionista.findMany({
      where: { userId: session.user.id },
      include: {
        inversiones: {
          include: {
            cultivo: { select: { especie: true, variedad: true, lote: { select: { nombre: true } } } },
            retornos: { orderBy: { fecha: "desc" } },
          },
          orderBy: { fechaAporte: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: inversionistas });
  } catch (error) {
    console.error("[GET /api/inversionistas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/inversionistas — registrar un nuevo inversionista (contacto)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { nombre, email, telefono, notas } = body;

    if (!nombre) {
      return NextResponse.json({ error: "nombre es requerido" }, { status: 400 });
    }

    const inversionista = await db.inversionista.create({
      data: {
        userId: session.user.id,
        nombre,
        email: email || undefined,
        telefono: telefono || undefined,
        notas: notas || undefined,
      },
      include: { inversiones: true },
    });

    return NextResponse.json({ data: inversionista }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/inversionistas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
