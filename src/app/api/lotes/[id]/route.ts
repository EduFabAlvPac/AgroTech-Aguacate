import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { loteUpdateWithGeoSchema, geoJsonPolygonSchema } from "@/lib/validations";

// GET /api/lotes/[id] — obtener un lote con cultivos activos
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const lote = await db.lote.findUnique({
      where: { id },
      include: {
        finca: { select: { userId: true } },
        cultivos: {
          where: { estado: "ACTIVO" },
        },
      },
    });

    if (!lote) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    if (lote.finca.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json({ data: lote });
  } catch (error) {
    console.error("[GET /api/lotes/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/lotes/[id] — actualizar un lote
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();

    // Validate geoJson separately to provide descriptive error messages
    if ("geoJson" in body && body.geoJson !== null && body.geoJson !== undefined) {
      const geoJsonResult = geoJsonPolygonSchema.safeParse(body.geoJson);
      if (!geoJsonResult.success) {
        const geoError = geoJsonResult.error.errors[0]?.message ?? "GeoJSON inválido";
        return NextResponse.json({ error: `GeoJSON inválido: ${geoError}` }, { status: 400 });
      }
    }

    const parsed = loteUpdateWithGeoSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    // Verificar que el lote existe y pertenece al usuario
    const lote = await db.lote.findUnique({
      where: { id },
      include: { finca: { select: { userId: true } } },
    });

    if (!lote) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    if (lote.finca.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { nombre, areaHa, altitud, pendiente, notas } = parsed.data;

    // Build the update data object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      ...(nombre !== undefined && { nombre }),
      ...(areaHa !== undefined && { areaHa }),
      ...(altitud !== undefined && { altitud }),
      ...(pendiente !== undefined && { pendiente }),
      ...(notas !== undefined && { notas }),
    };

    // Handle geoJson field: only update if explicitly present in the body
    if ("geoJson" in body) {
      if (body.geoJson === null) {
        // Explicitly set to null — remove geometry
        updateData.geoJson = null;
      } else {
        // Valid GeoJSON object — store it
        updateData.geoJson = parsed.data.geoJson;
      }
    }

    const updated = await db.lote.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PUT /api/lotes/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/lotes/[id] — eliminar un lote
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que el lote existe y pertenece al usuario
    const lote = await db.lote.findUnique({
      where: { id },
      include: { finca: { select: { userId: true } } },
    });

    if (!lote) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    if (lote.finca.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Verificar que no existan cultivos activos en el lote
    const activeCultivos = await db.cultivo.count({
      where: { loteId: id, estado: "ACTIVO" },
    });

    if (activeCultivos > 0) {
      return NextResponse.json(
        {
          error:
            "Existen cultivos activos en este lote. Finaliza o pausa los cultivos antes de eliminar.",
        },
        { status: 409 }
      );
    }

    await db.lote.delete({ where: { id } });

    return NextResponse.json({ data: { message: "Lote eliminado" } });
  } catch (error) {
    console.error("[DELETE /api/lotes/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
