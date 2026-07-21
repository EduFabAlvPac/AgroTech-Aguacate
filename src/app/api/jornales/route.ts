import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// ── Vocabulario local para actividades de campo ────────────────────────────────
const ACTIVIDADES_VALIDAS = [
  "Fumigada",
  "Abonada",
  "Limpia",
  "Riego manual",
  "Poda",
  "Cosecha",
  "Siembra",
  "Ojeada",
  "Tutorado",
  "Aplicación foliar",
  "Transporte",
  "Mantenimiento",
  "Otro",
];

// GET /api/jornales — list jornales for the authenticated user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const loteId = searchParams.get("loteId");
    const cultivoId = searchParams.get("cultivoId");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    const where: any = {
      OR: [
        { lote: { finca: { userId: session.user.id } } },
        { cultivo: { lote: { finca: { userId: session.user.id } } } },
      ],
    };

    if (loteId) where.loteId = loteId;
    if (cultivoId) where.cultivoId = cultivoId;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde);
      if (hasta) where.fecha.lte = new Date(hasta);
    }

    const jornales = await db.jornal.findMany({
      where,
      include: {
        lote: { select: { nombre: true } },
        cultivo: { select: { especie: true, variedad: true } },
      },
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json({ data: jornales });
  } catch (error) {
    console.error("[GET /api/jornales]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/jornales — create a new jornal + auto-create gasto MANO_OBRA
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { operario, fecha, horasTrabajadas, valorDia, actividad, descripcion, cultivoId, loteId, imagen } = body;

    // Validaciones
    if (!operario?.trim()) {
      return NextResponse.json({ error: "El nombre del operario es requerido" }, { status: 400 });
    }
    if (!valorDia || Number(valorDia) <= 0) {
      return NextResponse.json({ error: "El valor del día debe ser mayor a 0" }, { status: 400 });
    }
    if (!actividad?.trim()) {
      return NextResponse.json({ error: "La actividad es requerida" }, { status: 400 });
    }

    // Verify ownership of lote or cultivo
    if (loteId) {
      const lote = await db.lote.findFirst({
        where: { id: loteId, finca: { userId: session.user.id } },
      });
      if (!lote) {
        return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
      }
    }

    if (cultivoId) {
      const cultivo = await db.cultivo.findFirst({
        where: { id: cultivoId, lote: { finca: { userId: session.user.id } } },
      });
      if (!cultivo) {
        return NextResponse.json({ error: "Cultivo no encontrado" }, { status: 404 });
      }
    }

    const valorDiaNum = Number(valorDia);
    const horasNum = Number(horasTrabajadas) || 8;

    // Create jornal
    const jornal = await db.jornal.create({
      data: {
        operario: operario.trim(),
        fecha: fecha ? new Date(fecha) : new Date(),
        horasTrabajadas: horasNum,
        valorDia: valorDiaNum,
        actividad: actividad.trim(),
        descripcion: descripcion?.trim() || null,
        imagen: imagen || null,
        cultivoId: cultivoId || null,
        loteId: loteId || null,
      },
      include: {
        lote: { select: { nombre: true } },
        cultivo: { select: { especie: true, variedad: true } },
      },
    });

    // ── Efecto colateral: crear gasto automático MANO_OBRA ──────────────────────
    const finca = await db.finca.findFirst({ where: { userId: session.user.id }, select: { id: true } });
    await db.gasto.create({
      data: {
        userId: session.user.id,
        fincaId: finca?.id ?? "",
        concepto: `Jornal ${operario.trim()} — ${actividad.trim()}`,
        categoria: "MANO_OBRA",
        monto: valorDiaNum,
        fecha: fecha ? new Date(fecha) : new Date(),
        notas: `Registrado automáticamente desde módulo de Jornales. ${horasNum}h trabajadas.`,
        cultivoId: cultivoId || null,
        loteId: loteId || null,
      },
    });

    return NextResponse.json({ data: jornal }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/jornales]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
