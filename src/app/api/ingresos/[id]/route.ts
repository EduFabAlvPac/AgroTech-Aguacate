import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";

// Trae el ingreso con el contexto necesario para autorizar: ligado a un
// cultivo o a un comprador, ambos scopeados por finca/organización (RBAC
// real, Fase 2 — Comprador.fincaId se agregó junto con esta migración).
async function fetchIngresoConContexto(id: string) {
  return db.ingreso.findUnique({
    where: { id },
    include: {
      comprador: { select: { fincaId: true } },
      cultivo: { include: { lote: { select: { fincaId: true } } } },
    },
  });
}

async function verificarAcceso(
  session: { user: { id: string } },
  existing: NonNullable<Awaited<ReturnType<typeof fetchIngresoConContexto>>>,
  accion: "update" | "delete"
) {
  const fincaId = existing.cultivo?.lote.fincaId ?? existing.comprador?.fincaId;
  // Registro huérfano (sin cultivo ni comprador, o comprador sin fincaId
  // pre-backfill) — sin señal de pertenencia, se niega por defecto salvo
  // Super Admin (requireAccess lo maneja).
  await requireAccess(session, "ingreso", accion, fincaId ? { fincaId } : {});
}

// PUT /api/ingresos/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existing = await fetchIngresoConContexto(id);
    if (!existing)
      return NextResponse.json(
        { error: "Ingreso no encontrado o no autorizado" },
        { status: 404 }
      );
    await verificarAcceso(session as { user: { id: string } }, existing, "update");

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

    // Verify compradorId access if being changed (comprador → finca — RBAC real)
    if (compradorId) {
      const comprador = await db.comprador.findUnique({
        where: { id: compradorId },
        select: { fincaId: true },
      });
      if (!comprador || !comprador.fincaId)
        return NextResponse.json(
          { error: "Comprador no encontrado" },
          { status: 404 }
        );
      await requireAccess(session, "ingreso", "update", { fincaId: comprador.fincaId });
    }

    // Verify cultivoId access if being changed (RBAC real)
    if (cultivoId) {
      const cultivo = await db.cultivo.findUnique({
        where: { id: cultivoId },
        select: { lote: { select: { fincaId: true } } },
      });
      if (!cultivo)
        return NextResponse.json(
          { error: "Cultivo no encontrado" },
          { status: 404 }
        );
      await requireAccess(session, "ingreso", "update", { fincaId: cultivo.lote.fincaId });
    }

    const montoNum = monto !== undefined ? Number(monto) : undefined;
    const cantidadKgNum =
      cantidadKg !== undefined
        ? cantidadKg === null
          ? null
          : Number(cantidadKg)
        : undefined;
    const precioKgNum =
      precioKg !== undefined
        ? precioKg === null
          ? null
          : Number(precioKg)
        : undefined;

    const ingreso = await db.ingreso.update({
      where: { id },
      data: {
        ...(concepto !== undefined && { concepto }),
        ...(montoNum !== undefined && { monto: montoNum }),
        ...(cantidadKgNum !== undefined && { cantidadKg: cantidadKgNum }),
        ...(precioKgNum !== undefined && { precioKg: precioKgNum }),
        ...(fecha !== undefined && { fecha: new Date(fecha) }),
        ...(notas !== undefined && { notas: notas ?? null }),
        ...(compradorId !== undefined && { compradorId: compradorId ?? null }),
        ...(cultivoId !== undefined && { cultivoId: cultivoId ?? null }),
      },
      include: {
        comprador: true,
        cultivo: { include: { lote: true } },
      },
    });

    return NextResponse.json({ data: ingreso });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[PUT /api/ingresos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/ingresos/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existing = await fetchIngresoConContexto(id);
    if (!existing)
      return NextResponse.json(
        { error: "Ingreso no encontrado o no autorizado" },
        { status: 404 }
      );
    await verificarAcceso(session as { user: { id: string } }, existing, "delete");

    await db.ingreso.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/ingresos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
