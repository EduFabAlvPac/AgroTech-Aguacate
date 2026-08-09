import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import { assertFichaEditable, FichaNoEditableError, type UmbralAlertaPlaga } from "@/lib/fichas-tecnicas";

// POST /api/admin/fichas-tecnicas/[id]/plagas — agregar plaga/enfermedad
// Catálogo base para el diagnóstico IA por imagen (RF15) y para las alertas
// de plaga del motor de alertas (RF17, ver src/lib/alert-engine.ts).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: fichaId } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const body = await req.json();
    const { nombre, tipo, sintomas, manejoRecomendado, umbralAlerta } = body;
    if (!nombre || !tipo) {
      return NextResponse.json({ error: "nombre y tipo son requeridos" }, { status: 400 });
    }

    // Solo se guardan los campos de umbral con valor real — un umbral vacío
    // en todos sus campos equivale a "sin condición de alerta configurada".
    let umbral: UmbralAlertaPlaga | undefined;
    if (umbralAlerta && typeof umbralAlerta === "object") {
      const limpio: UmbralAlertaPlaga = {};
      if (umbralAlerta.humedadMinPct !== undefined && umbralAlerta.humedadMinPct !== "") limpio.humedadMinPct = Number(umbralAlerta.humedadMinPct);
      if (umbralAlerta.tempMinC !== undefined && umbralAlerta.tempMinC !== "") limpio.tempMinC = Number(umbralAlerta.tempMinC);
      if (umbralAlerta.tempMaxC !== undefined && umbralAlerta.tempMaxC !== "") limpio.tempMaxC = Number(umbralAlerta.tempMaxC);
      if (umbralAlerta.lluviaMinMm !== undefined && umbralAlerta.lluviaMinMm !== "") limpio.lluviaMinMm = Number(umbralAlerta.lluviaMinMm);
      if (Object.keys(limpio).length > 0) umbral = limpio;
    }

    const plaga = await db.plagaEnfermedad.create({
      data: {
        fichaId,
        nombre,
        tipo,
        sintomas: sintomas || undefined,
        manejoRecomendado: manejoRecomendado || undefined,
        imagenesRef: [],
        etapasSusceptibles: [],
        umbralAlerta: umbral as unknown as Prisma.InputJsonValue | undefined,
      },
    });

    return NextResponse.json({ data: plaga }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof FichaNoEditableError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/admin/fichas-tecnicas/[id]/plagas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
