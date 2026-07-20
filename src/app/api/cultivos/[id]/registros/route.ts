import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/cultivos/[id]/registros
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const registros = await db.registroCultivo.findMany({
      where: {
        cultivoId: id,
        cultivo: { lote: { finca: { userId: session.user.id } } },
      },
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json({ data: registros });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/cultivos/[id]/registros
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { tipo, descripcion, fecha } = body;

    if (!tipo || !descripcion) {
      return NextResponse.json({ error: "tipo y descripcion son requeridos" }, { status: 400 });
    }

    const registro = await db.registroCultivo.create({
      data: {
        cultivoId: id,
        tipo,
        descripcion,
        fecha: fecha ? new Date(fecha) : new Date(),
        imagenes: body.imagenes ?? [],
        datos: body.datos,
      },
    });

    // ── Sync: Auto-create gasto for cost-bearing activities ─────────────────
    const TIPO_TO_CATEGORIA: Record<string, string> = {
      FERTILIZACION: "INSUMOS",
      TRATAMIENTO_PLAGAS: "INSUMOS",
      RIEGO: "AGUA_RIEGO",
      PODA: "MANO_OBRA",
    };

    if (body.costo && Number(body.costo) > 0 && TIPO_TO_CATEGORIA[tipo]) {
      const gasto = await db.gasto.create({
        data: {
          cultivoId: id,
          concepto: `${tipo.replace(/_/g, " ")} — ${descripcion.slice(0, 50)}`,
          categoria: TIPO_TO_CATEGORIA[tipo] as any,
          monto: Number(body.costo),
          fecha: fecha ? new Date(fecha) : new Date(),
          notas: "Generado automáticamente desde registro de actividad",
        },
      });
      // Link the registro to the gasto
      await db.registroCultivo.update({
        where: { id: registro.id },
        data: { gastoId: gasto.id },
      }).catch(() => {});
    }

    // Sync: Auto-create ingreso for COSECHA type with income
    if (tipo === "COSECHA" && body.ingreso && Number(body.ingreso) > 0) {
      const ingreso = await db.ingreso.create({
        data: {
          cultivoId: id,
          concepto: `Cosecha — ${descripcion.slice(0, 50)}`,
          monto: Number(body.ingreso),
          cantidadKg: body.cantidadKg ? Number(body.cantidadKg) : null,
          fecha: fecha ? new Date(fecha) : new Date(),
          notas: "Generado automáticamente desde registro de cosecha",
        },
      });
      await db.registroCultivo.update({
        where: { id: registro.id },
        data: { ingresoId: ingreso.id },
      }).catch(() => {});
    }

    return NextResponse.json({ data: registro }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cultivos/[id]/registros]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
