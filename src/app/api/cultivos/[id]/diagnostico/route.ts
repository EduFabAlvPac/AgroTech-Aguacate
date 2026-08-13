import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { diagnosticarImagen, DiagnosticoError } from "@/lib/diagnostico-ia";
import { requireAccess, AuthzError } from "@/lib/authz";
import { consumirCuotaIA, CuotaExcedidaError } from "@/lib/ia-cuota";

export const maxDuration = 45;

// Límite defensivo — Vercel limita el body de Edge/Serverless Functions a
// ~4.5MB; PhotoCapture ya comprime a ~800px/70% (normalmente <500KB), esto
// solo evita un 413/500 confuso si alguien sube algo sin pasar por ahí.
const MAX_IMAGEN_BASE64_CHARS = 6_000_000;

// POST /api/cultivos/[id]/diagnostico — diagnóstico de plagas/enfermedades
// por imagen (RF15), específico al cultivo/variedad activo.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { imagen, descripcion } = body;

    if (!imagen || typeof imagen !== "string" || !imagen.startsWith("data:image/")) {
      return NextResponse.json({ error: "Se requiere una imagen válida (data URI)" }, { status: 400 });
    }
    if (imagen.length > MAX_IMAGEN_BASE64_CHARS) {
      return NextResponse.json({ error: "La imagen es demasiado grande" }, { status: 413 });
    }

    const cultivo = await db.cultivo.findUnique({
      where: { id },
      include: {
        lote: { select: { fincaId: true } },
        fichaTecnica: {
          include: {
            variedad: { include: { especie: true } },
            plagas: true,
          },
        },
      },
    });

    if (!cultivo) {
      return NextResponse.json({ error: "Cultivo no encontrado" }, { status: 404 });
    }
    // El diagnóstico crea un RegistroCultivo (bitácora) y, si hay hallazgo,
    // una AlertaClimatica — el permiso relevante es "crear registro", no
    // "editar cultivo" (así lo puede usar un COLABORADOR de campo, no solo
    // ADMIN_FINCA).
    await requireAccess(session, "registroCultivo", "create", { fincaId: cultivo.lote.fincaId });
    await consumirCuotaIA(session.user.id, "IMAGEN");

    const especie = cultivo.fichaTecnica?.variedad.especie.nombre ?? cultivo.especie;
    const variedad = cultivo.fichaTecnica?.variedad.nombre ?? cultivo.variedad ?? "";
    const catalogo = (cultivo.fichaTecnica?.plagas ?? []).map((p) => ({
      nombre: p.nombre,
      tipo: p.tipo,
      sintomas: p.sintomas,
      manejoRecomendado: p.manejoRecomendado,
    }));

    const resultado = await diagnosticarImagen(imagen, especie, variedad, catalogo, descripcion);

    const registro = await db.registroCultivo.create({
      data: {
        cultivoId: id,
        tipo: "INSPECCION",
        descripcion: `🤖 Diagnóstico IA: ${resultado.diagnostico}${descripcion ? ` — ${descripcion}` : ""}`,
        imagenes: [imagen],
        datos: { diagnosticoIA: resultado } as unknown as Prisma.InputJsonValue,
      },
    });

    // Genera una alerta (además de la bitácora) cuando el diagnóstico
    // encuentra un problema real con confianza suficiente — "sin evidencia
    // de daño" o confianza baja no generan alerta, para no meter ruido.
    const sinDano = /sin evidencia de daño/i.test(resultado.diagnostico);
    let alertaCreada = null;
    if (!sinDano && (resultado.confianza === "alta" || resultado.confianza === "media")) {
      alertaCreada = await db.alertaClimatica.create({
        data: {
          tipo: "PLAGA",
          titulo: `Diagnóstico IA: ${resultado.diagnostico} en ${especie} ${variedad}`.trim(),
          descripcion: `${resultado.sintomasObservados ? `${resultado.sintomasObservados} ` : ""}${resultado.recomendacion}`,
          severidad: resultado.confianza === "alta" ? "ALTA" : "MEDIA",
          fechaInicio: new Date(),
          activa: true,
          leida: false,
          datos: { diagnosticoIA: resultado, registroCultivoId: registro.id } as unknown as Prisma.InputJsonValue,
          municipio: null,
          fincaId: cultivo.lote.fincaId,
          cultivoId: id,
        },
      });
    }

    return NextResponse.json({ data: { diagnostico: resultado, registro, alerta: alertaCreada } }, { status: 201 });
  } catch (error) {
    if (error instanceof DiagnosticoError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof CuotaExcedidaError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/cultivos/[id]/diagnostico]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
