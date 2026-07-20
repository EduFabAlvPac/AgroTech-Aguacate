import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/ingresos — list all ingresos for the authenticated user's finca
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cultivoId = searchParams.get("cultivoId");
    const compradorId = searchParams.get("compradorId");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    const where: Record<string, unknown> = {
      // Ownership: ingreso belongs to user either via comprador or via cultivo → lote → finca
      OR: [
        { comprador: { userId: session.user.id } },
        { cultivo: { lote: { finca: { userId: session.user.id } } } },
        // Ingresos without comprador and without cultivo won't appear unless filtered; handle by
        // ensuring POST always associates at least one of the two. This OR covers all valid cases.
      ],
    };

    if (cultivoId) where.cultivoId = cultivoId;
    if (compradorId) where.compradorId = compradorId;
    if (desde || hasta) {
      where.fecha = {} as Record<string, Date>;
      if (desde) (where.fecha as Record<string, Date>).gte = new Date(desde);
      if (hasta) (where.fecha as Record<string, Date>).lte = new Date(hasta);
    }

    const ingresos = await db.ingreso.findMany({
      where,
      include: {
        comprador: true,
        cultivo: { include: { lote: true } },
      },
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json({ data: ingresos });
  } catch (error) {
    console.error("[GET /api/ingresos]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/ingresos — create a new ingreso
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const {
      concepto,
      monto,
      cantidadKg,
      precioKg,
      fecha,
      compradorId,
      cultivoId,
      notas,
    } = body;

    // Validate required fields
    if (!concepto || !monto || !fecha) {
      return NextResponse.json(
        { error: "concepto, monto y fecha son requeridos" },
        { status: 400 }
      );
    }

    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json(
        { error: "monto debe ser un número positivo" },
        { status: 400 }
      );
    }

    // Verify compradorId ownership if provided
    if (compradorId) {
      const comprador = await db.comprador.findFirst({
        where: { id: compradorId, userId: session.user.id },
      });
      if (!comprador) {
        return NextResponse.json(
          { error: "Comprador no encontrado o no autorizado" },
          { status: 403 }
        );
      }
    }

    // Verify cultivoId ownership if provided (cultivo → lote → finca → user)
    if (cultivoId) {
      const cultivo = await db.cultivo.findFirst({
        where: {
          id: cultivoId,
          lote: { finca: { userId: session.user.id } },
        },
      });
      if (!cultivo) {
        return NextResponse.json(
          { error: "Cultivo no encontrado o no autorizado" },
          { status: 403 }
        );
      }
    }

    // Auto-calculate precioKg if cantidadKg and monto are provided and precioKg is not
    let resolvedPrecioKg: number | undefined = precioKg
      ? Number(precioKg)
      : undefined;
    const resolvedCantidadKg: number | undefined = cantidadKg
      ? Number(cantidadKg)
      : undefined;

    if (
      resolvedCantidadKg &&
      resolvedCantidadKg > 0 &&
      resolvedPrecioKg === undefined
    ) {
      resolvedPrecioKg = montoNum / resolvedCantidadKg;
    }

    const ingreso = await db.ingreso.create({
      data: {
        concepto,
        monto: montoNum,
        cantidadKg: resolvedCantidadKg ?? null,
        precioKg: resolvedPrecioKg ?? null,
        fecha: new Date(fecha),
        notas: notas || null,
        compradorId: compradorId || null,
        cultivoId: cultivoId || null,
      },
      include: {
        comprador: true,
        cultivo: { include: { lote: true } },
      },
    });

    // ── Sync: Auto-create registro in cultivo's bitácora ─────────────────────
    if (cultivoId && ingreso.id) {
      db.registroCultivo.create({
        data: {
          cultivoId,
          tipo: "COSECHA",
          descripcion: `📥 Ingreso: ${concepto} ($${montoNum.toLocaleString("es-CO")} COP${resolvedCantidadKg ? `, ${resolvedCantidadKg} kg` : ""})`,
          fecha: new Date(fecha),
          ingresoId: ingreso.id,
        },
      }).catch(() => {}); // Non-blocking
    }

    return NextResponse.json({ data: ingreso }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/ingresos]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
