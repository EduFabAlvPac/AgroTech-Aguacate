import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { diagnosticarImagen, DiagnosticoError } from "@/lib/diagnostico-ia";
import { consumirCuotaIA, CuotaExcedidaError } from "@/lib/ia-cuota";
import { verificarLimite, RateLimitError } from "@/lib/rate-limit";
import { esEspecieCampesinoValida } from "@/lib/campesino-especies";

export const maxDuration = 45;

// Mismo límite defensivo que /api/cultivos/[id]/diagnostico.
const MAX_IMAGEN_BASE64_CHARS = 6_000_000;

/**
 * Diagnóstico del modo Campesino — reutiliza diagnosticarImagen() de
 * src/lib/diagnostico-ia.ts SIN MODIFICARLA, pero es un endpoint nuevo y
 * desacoplado de /api/cultivos/[id]/diagnostico: por decisión de producto,
 * el Campesino no tiene Finca/Lote/Cultivo, así que el catálogo de plagas se
 * resuelve directamente por especieSlug (Variedad→FichaTecnica publicada),
 * no a través de un Cultivo real. No crea RegistroCultivo ni
 * AlertaClimatica (no hay Finca a la que asociarlos) — en su lugar persiste
 * en ConsultaDiagnosticoCampesino, que alimenta "Mis consultas" en
 * /campesino/perfil.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { imagen, especieSlug, descripcion } = body;

    if (!imagen || typeof imagen !== "string" || !imagen.startsWith("data:image/")) {
      return NextResponse.json({ error: "Se requiere una imagen válida (data URI)" }, { status: 400 });
    }
    if (imagen.length > MAX_IMAGEN_BASE64_CHARS) {
      return NextResponse.json({ error: "La imagen es demasiado grande" }, { status: 413 });
    }
    if (typeof especieSlug !== "string" || !esEspecieCampesinoValida(especieSlug)) {
      return NextResponse.json({ error: "Cultivo no reconocido" }, { status: 400 });
    }

    const especieCultivo = await db.especieCultivo.findUnique({
      where: { slug: especieSlug },
      include: {
        variedades: {
          include: {
            fichas: {
              where: { estado: "PUBLICADA" },
              orderBy: { version: "desc" },
              take: 1,
              include: { plagas: true },
            },
          },
        },
      },
    });

    if (!especieCultivo) {
      return NextResponse.json({ error: "Cultivo no reconocido" }, { status: 400 });
    }

    await verificarLimite("ia", session.user.id);
    await consumirCuotaIA(session.user.id, "IMAGEN");

    const ficha = especieCultivo.variedades[0]?.fichas[0];
    const especie = especieCultivo.nombre;
    const variedad = especieCultivo.variedades[0]?.nombre ?? "";
    const catalogo = (ficha?.plagas ?? []).map((p) => ({
      nombre: p.nombre,
      tipo: p.tipo,
      sintomas: p.sintomas,
      manejoRecomendado: p.manejoRecomendado,
    }));

    const resultado = await diagnosticarImagen(imagen, especie, variedad, catalogo, descripcion);

    // Igual que el endpoint de Cultivo: solo se guarda el resultado textual,
    // la imagen no se persiste (costo en Neon, sin Vercel Blob por ahora), y
    // un intento no válido (foto borrosa/irrelevante) no ensucia el
    // historial de "Mis consultas".
    if (resultado.imagenValida) {
      await db.consultaDiagnosticoCampesino.create({
        data: {
          userId: session.user.id,
          especieSlug,
          especieNombre: especie,
          imagenValida: true,
          diagnostico: resultado.diagnostico,
          confianza: resultado.confianza,
          recomendacion: resultado.recomendacion,
        },
      });
    }

    return NextResponse.json({ data: { diagnostico: resultado } }, { status: 201 });
  } catch (error) {
    if (error instanceof DiagnosticoError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof CuotaExcedidaError || error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/campesino/diagnostico]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
