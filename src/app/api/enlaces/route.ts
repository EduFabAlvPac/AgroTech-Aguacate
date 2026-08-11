import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";

/**
 * Portal de Compradores (Fase 4) — enlaces de solo lectura sin cuenta, ver
 * CLAUDE.md §2 y prisma/schema.prisma (EnlaceCompartido). El token público
 * nunca es el `id` del registro — se genera aparte con alta entropía
 * (crypto.randomBytes) siguiendo el mismo criterio que un token de reseteo
 * de contraseña (ver .kiro/skills/architecture/agrotech-ciberseguridad).
 */

function generarToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

// GET /api/enlaces?cultivoId=xxx — lista los enlaces de un cultivo
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cultivoId = searchParams.get("cultivoId");
    if (!cultivoId) return NextResponse.json({ error: "cultivoId es requerido" }, { status: 400 });

    const cultivo = await db.cultivo.findUnique({ where: { id: cultivoId }, select: { lote: { select: { fincaId: true } } } });
    if (!cultivo) return NextResponse.json({ error: "Cultivo no encontrado" }, { status: 404 });
    await requireAccess(session, "enlaceCompartido", "read", { fincaId: cultivo.lote.fincaId });

    const enlaces = await db.enlaceCompartido.findMany({
      where: { cultivoId },
      include: { comprador: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: enlaces });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/enlaces]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/enlaces — crear un enlace de portal para un cultivo
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { cultivoId, compradorId, nota, expiraEn } = body;

    if (!cultivoId) return NextResponse.json({ error: "cultivoId es requerido" }, { status: 400 });

    const cultivo = await db.cultivo.findUnique({ where: { id: cultivoId }, select: { lote: { select: { fincaId: true } } } });
    if (!cultivo) return NextResponse.json({ error: "Cultivo no encontrado" }, { status: 404 });
    await requireAccess(session, "enlaceCompartido", "create", { fincaId: cultivo.lote.fincaId });

    // Si viene compradorId, verificar que pertenece a la misma finca (evita
    // asociar el enlace con un comprador de otra finca/organización).
    if (compradorId) {
      const comprador = await db.comprador.findUnique({ where: { id: compradorId }, select: { fincaId: true } });
      if (!comprador || comprador.fincaId !== cultivo.lote.fincaId) {
        return NextResponse.json({ error: "Comprador no encontrado en esta finca" }, { status: 400 });
      }
    }

    const enlace = await db.enlaceCompartido.create({
      data: {
        token: generarToken(),
        cultivoId,
        compradorId: compradorId || null,
        creadoPorId: session.user.id,
        nota: nota || null,
        expiraEn: expiraEn ? new Date(expiraEn) : null,
      },
      include: { comprador: { select: { nombre: true } } },
    });

    return NextResponse.json({ data: enlace }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/enlaces]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
