"use server";

/**
 * Server Actions — Fichas Técnicas Admin (Fase 1, ADR-006). Misma lógica
 * exacta que ya tenían las rutas /api/admin/especies,
 * /api/admin/especies/[id]/variedades y las diez rutas bajo
 * /api/admin/fichas-tecnicas/[id]/* — misma autorización (requireSuperAdmin
 * + assertFichaEditable para subrecursos). Las rutas API se mantienen,
 * esto es una segunda entrada. Módulo Super Admin únicamente.
 *
 * Qué revalida:
 * - crearEspecie / crearVariedad → revalidatePath("/dashboard/admin/fichas-tecnicas")
 * - crearFicha → no revalida (hace window.location.href al redirect, el
 *   cliente navega a la ficha nueva directamente)
 * - actualizarFichaCore / publicarFicha / eliminarFicha → revalidatePath
 *   ("/dashboard/admin/fichas-tecnicas/[id]") y, para publicar/eliminar
 *   (afectan el estado visible en la lista), también
 *   "/dashboard/admin/fichas-tecnicas"
 * - agregarEtapa/eliminarEtapa, agregarPlaga/eliminarPlaga,
 *   agregarCosto/eliminarCosto, agregarPuntoCurva/eliminarPuntoCurva →
 *   revalidatePath("/dashboard/admin/fichas-tecnicas/[id]")
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import { assertFichaEditable, FichaNoEditableError, type UmbralAlertaPlaga } from "@/lib/fichas-tecnicas";
import type {
  EspecieCultivo, Variedad, FichaTecnica, EtapaFenologica, PlagaEnfermedad,
  CostoReferencia, PuntoCurvaProduccion, Prisma,
} from "@prisma/client";

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// ── Especies y variedades ────────────────────────────────────────────────

export interface EspecieActionState {
  error?: string;
  especie?: EspecieCultivo;
}

export async function crearEspecie(_prev: EspecieActionState, formData: FormData): Promise<EspecieActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);

    const slug = str(formData, "slug");
    const nombre = str(formData, "nombre");
    if (!slug || !nombre) return { error: "slug y nombre son requeridos" };

    const existente = await db.especieCultivo.findUnique({ where: { slug } });
    if (existente) return { error: `Ya existe una especie con slug '${slug}'` };

    const especie = await db.especieCultivo.create({
      data: {
        slug,
        nombre,
        familia: str(formData, "familia"),
        // Campos legacy requeridos por EspecieCultivo (Json) — sin uso desde
        // el motor de fichas técnicas nuevo, se dejan vacíos a propósito.
        etapas: [],
        tiposRegistro: [],
      },
    });

    revalidatePath("/dashboard/admin/fichas-tecnicas");
    return { especie };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearEspecie]", error);
    return { error: "Error al crear especie" };
  }
}

export interface VariedadActionState {
  error?: string;
  variedad?: Variedad;
}

export async function crearVariedad(especieId: string, _prev: VariedadActionState, formData: FormData): Promise<VariedadActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);

    const especie = await db.especieCultivo.findUnique({ where: { id: especieId } });
    if (!especie) return { error: "Especie no encontrada" };

    const nombre = str(formData, "nombre");
    const slug = str(formData, "slug");
    if (!nombre || !slug) return { error: "nombre y slug son requeridos" };

    const existente = await db.variedad.findUnique({ where: { especieId_slug: { especieId, slug } } });
    if (existente) return { error: `Ya existe una variedad con slug '${slug}' en esta especie` };

    const variedad = await db.variedad.create({ data: { especieId, nombre, slug } });

    revalidatePath("/dashboard/admin/fichas-tecnicas");
    return { variedad };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearVariedad]", error);
    return { error: "Error al crear variedad" };
  }
}

// ── Ficha técnica (versión) ──────────────────────────────────────────────

export interface FichaActionState {
  error?: string;
  ficha?: FichaTecnica;
}

/** Crea una nueva versión de ficha (BORRADOR) — opcionalmente clonando las
 * etapas de una versión anterior. Usado tanto para "Crear ficha técnica"
 * (primera versión) como "Nueva versión editable" (clonar). */
export async function crearFicha(variedadId: string, clonarEtapasDeVersionId?: string): Promise<FichaActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);

    const variedad = await db.variedad.findUnique({ where: { id: variedadId } });
    if (!variedad) return { error: "Variedad no encontrada" };

    const ultima = await db.fichaTecnica.findFirst({
      where: { variedadId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const siguienteVersion = (ultima?.version ?? 0) + 1;

    let etapasClonadas: { orden: number; nombre: string; duracionDiasMin: number | null; duracionDiasMax: number | null; descripcion: string | null }[] = [];
    if (clonarEtapasDeVersionId) {
      etapasClonadas = await db.etapaFenologica.findMany({
        where: { fichaId: clonarEtapasDeVersionId },
        orderBy: { orden: "asc" },
        select: { orden: true, nombre: true, duracionDiasMin: true, duracionDiasMax: true, descripcion: true },
      });
    }

    const ficha = await db.fichaTecnica.create({
      data: {
        variedadId,
        version: siguienteVersion,
        estado: "BORRADOR",
        creadoPorId: session!.user.id,
        etapas: etapasClonadas.length > 0 ? { create: etapasClonadas } : undefined,
      },
    });

    revalidatePath("/dashboard/admin/fichas-tecnicas");
    return { ficha };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearFicha]", error);
    return { error: "Error al crear ficha técnica" };
  }
}

const CAMPOS_EDITABLES = [
  "notasVersion",
  "altitudMinM", "altitudMaxM",
  "tempMinC", "tempMaxC",
  "humedadMinPct", "humedadMaxPct",
  "phMin", "phMax",
  "precipitacionAnualMinMm", "precipitacionAnualMaxMm",
  "densidadPlantasHaMin", "densidadPlantasHaMax",
  "distanciaSiembraM",
  "cicloProductivoMeses",
  "vidaUtilAnios",
] as const;

// Únicos campos String de FichaTecnica entre CAMPOS_EDITABLES — el resto
// son Int?/Float? en el schema (ver prisma/schema.prisma) y deben llegar a
// Prisma como number, no como string, o el update falla en runtime.
const CAMPOS_TEXTO = new Set<(typeof CAMPOS_EDITABLES)[number]>(["notasVersion", "distanciaSiembraM"]);

export async function actualizarFichaCore(fichaId: string, _prev: FichaActionState, formData: FormData): Promise<FichaActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);

    const existente = await db.fichaTecnica.findUnique({ where: { id: fichaId }, select: { estado: true } });
    if (!existente) return { error: "Ficha técnica no encontrada" };
    if (existente.estado !== "BORRADOR") {
      return { error: "Solo se pueden editar fichas en BORRADOR — crea una nueva versión" };
    }

    const data: Record<string, unknown> = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (formData.has(campo)) {
        const v = formData.get(campo) as string;
        if (v === "") { data[campo] = null; continue; }
        data[campo] = CAMPOS_TEXTO.has(campo) ? v : Number(v);
      }
    }

    const ficha = await db.fichaTecnica.update({ where: { id: fichaId }, data });
    revalidatePath(`/dashboard/admin/fichas-tecnicas/${fichaId}`);
    return { ficha };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[actualizarFichaCore]", error);
    return { error: "Error al guardar" };
  }
}

export async function publicarFicha(fichaId: string): Promise<FichaActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);

    const ficha = await db.fichaTecnica.findUnique({ where: { id: fichaId } });
    if (!ficha) return { error: "Ficha técnica no encontrada" };
    if (ficha.estado !== "BORRADOR") return { error: "Solo se puede publicar una ficha en BORRADOR" };

    const publicada = await db.$transaction(async (tx) => {
      await tx.fichaTecnica.updateMany({
        where: { variedadId: ficha.variedadId, estado: "PUBLICADA" },
        data: { estado: "ARCHIVADA" },
      });
      return tx.fichaTecnica.update({
        where: { id: fichaId },
        data: { estado: "PUBLICADA", publicadaEn: new Date() },
      });
    });

    revalidatePath(`/dashboard/admin/fichas-tecnicas/${fichaId}`);
    revalidatePath("/dashboard/admin/fichas-tecnicas");
    return { ficha: publicada };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[publicarFicha]", error);
    return { error: "Error al publicar" };
  }
}

export interface EliminarFichaState {
  error?: string;
  ok?: boolean;
}

export async function eliminarFicha(fichaId: string): Promise<EliminarFichaState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);

    const existente = await db.fichaTecnica.findUnique({ where: { id: fichaId }, select: { estado: true } });
    if (!existente) return { error: "Ficha técnica no encontrada" };
    if (existente.estado !== "BORRADOR") return { error: "Solo se pueden eliminar fichas en BORRADOR" };

    await db.fichaTecnica.delete({ where: { id: fichaId } });
    revalidatePath("/dashboard/admin/fichas-tecnicas");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarFicha]", error);
    return { error: "Error al eliminar" };
  }
}

// ── Etapas fenológicas ───────────────────────────────────────────────────

export interface EtapaActionState {
  error?: string;
  etapa?: EtapaFenologica;
}

export async function agregarEtapa(fichaId: string, formData: FormData): Promise<EtapaActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const nombre = str(formData, "nombre");
    if (!nombre) return { error: "nombre es requerido" };

    const ultima = await db.etapaFenologica.findFirst({
      where: { fichaId },
      orderBy: { orden: "desc" },
      select: { orden: true },
    });

    const duracionDiasMin = str(formData, "duracionDiasMin");
    const duracionDiasMax = str(formData, "duracionDiasMax");

    const etapa = await db.etapaFenologica.create({
      data: {
        fichaId,
        orden: (ultima?.orden ?? 0) + 1,
        nombre,
        duracionDiasMin: duracionDiasMin ? Number(duracionDiasMin) : undefined,
        duracionDiasMax: duracionDiasMax ? Number(duracionDiasMax) : undefined,
        descripcion: str(formData, "descripcion"),
      },
    });

    revalidatePath(`/dashboard/admin/fichas-tecnicas/${fichaId}`);
    return { etapa };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    if (error instanceof FichaNoEditableError) return { error: error.message };
    console.error("[agregarEtapa]", error);
    return { error: "Error al agregar etapa" };
  }
}

export async function eliminarEtapa(fichaId: string, etapaId: string): Promise<{ error?: string; ok?: boolean }> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const etapa = await db.etapaFenologica.findUnique({ where: { id: etapaId }, select: { fichaId: true } });
    if (!etapa || etapa.fichaId !== fichaId) return { error: "Etapa no encontrada" };

    await db.etapaFenologica.delete({ where: { id: etapaId } });
    revalidatePath(`/dashboard/admin/fichas-tecnicas/${fichaId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    if (error instanceof FichaNoEditableError) return { error: error.message };
    console.error("[eliminarEtapa]", error);
    return { error: "Error al eliminar etapa" };
  }
}

// ── Plagas y enfermedades ────────────────────────────────────────────────

export interface PlagaActionState {
  error?: string;
  plaga?: PlagaEnfermedad;
}

export async function agregarPlaga(fichaId: string, formData: FormData): Promise<PlagaActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const nombre = str(formData, "nombre");
    const tipo = str(formData, "tipo");
    if (!nombre || !tipo) return { error: "nombre y tipo son requeridos" };

    // Solo se guardan los campos de umbral con valor real — un umbral vacío
    // en todos sus campos equivale a "sin condición de alerta configurada".
    const limpio: UmbralAlertaPlaga = {};
    const humedadMinPct = str(formData, "humedadMinPct");
    const tempMinC = str(formData, "tempMinC");
    const tempMaxC = str(formData, "tempMaxC");
    const lluviaMinMm = str(formData, "lluviaMinMm");
    if (humedadMinPct) limpio.humedadMinPct = Number(humedadMinPct);
    if (tempMinC) limpio.tempMinC = Number(tempMinC);
    if (tempMaxC) limpio.tempMaxC = Number(tempMaxC);
    if (lluviaMinMm) limpio.lluviaMinMm = Number(lluviaMinMm);
    const umbral = Object.keys(limpio).length > 0 ? limpio : undefined;

    const plaga = await db.plagaEnfermedad.create({
      data: {
        fichaId,
        nombre,
        tipo: tipo as Prisma.PlagaEnfermedadCreateInput["tipo"],
        sintomas: str(formData, "sintomas"),
        manejoRecomendado: str(formData, "manejoRecomendado"),
        imagenesRef: [],
        etapasSusceptibles: [],
        umbralAlerta: umbral as unknown as Prisma.InputJsonValue | undefined,
      },
    });

    revalidatePath(`/dashboard/admin/fichas-tecnicas/${fichaId}`);
    return { plaga };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    if (error instanceof FichaNoEditableError) return { error: error.message };
    console.error("[agregarPlaga]", error);
    return { error: "Error al agregar plaga/enfermedad" };
  }
}

export async function eliminarPlaga(fichaId: string, plagaId: string): Promise<{ error?: string; ok?: boolean }> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    await db.plagaEnfermedad.delete({ where: { id: plagaId } });
    revalidatePath(`/dashboard/admin/fichas-tecnicas/${fichaId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    if (error instanceof FichaNoEditableError) return { error: error.message };
    console.error("[eliminarPlaga]", error);
    return { error: "Error al eliminar plaga/enfermedad" };
  }
}

// ── Costos de referencia ─────────────────────────────────────────────────

export interface CostoActionState {
  error?: string;
  costo?: CostoReferencia;
}

export async function agregarCosto(fichaId: string, formData: FormData): Promise<CostoActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const categoria = str(formData, "categoria");
    if (!categoria) return { error: "categoria es requerida" };

    const montoPorHa = str(formData, "montoPorHa");
    const montoPorPlanta = str(formData, "montoPorPlanta");

    const costo = await db.costoReferencia.create({
      data: {
        fichaId,
        categoria: categoria as Prisma.CostoReferenciaCreateInput["categoria"],
        montoPorHa: montoPorHa ? Number(montoPorHa) : undefined,
        montoPorPlanta: montoPorPlanta ? Number(montoPorPlanta) : undefined,
        frecuencia: str(formData, "frecuencia"),
        descripcion: str(formData, "descripcion"),
      },
    });

    revalidatePath(`/dashboard/admin/fichas-tecnicas/${fichaId}`);
    return { costo };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    if (error instanceof FichaNoEditableError) return { error: error.message };
    console.error("[agregarCosto]", error);
    return { error: "Error al agregar costo" };
  }
}

export async function eliminarCosto(fichaId: string, costoId: string): Promise<{ error?: string; ok?: boolean }> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    await db.costoReferencia.delete({ where: { id: costoId } });
    revalidatePath(`/dashboard/admin/fichas-tecnicas/${fichaId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    if (error instanceof FichaNoEditableError) return { error: error.message };
    console.error("[eliminarCosto]", error);
    return { error: "Error al eliminar costo" };
  }
}

// ── Curva de producción ──────────────────────────────────────────────────

export interface CurvaActionState {
  error?: string;
  punto?: PuntoCurvaProduccion;
}

export async function agregarPuntoCurva(fichaId: string, formData: FormData): Promise<CurvaActionState> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const anioProduccion = str(formData, "anioProduccion");
    if (!anioProduccion) return { error: "anioProduccion es requerido" };

    const existente = await db.puntoCurvaProduccion.findUnique({
      where: { fichaId_anioProduccion: { fichaId, anioProduccion: Number(anioProduccion) } },
    });
    if (existente) return { error: `Ya existe un punto para el año ${anioProduccion}` };

    const kgPorPlantaEsperado = str(formData, "kgPorPlantaEsperado");
    const kgPorHaEsperado = str(formData, "kgPorHaEsperado");

    const punto = await db.puntoCurvaProduccion.create({
      data: {
        fichaId,
        anioProduccion: Number(anioProduccion),
        kgPorPlantaEsperado: kgPorPlantaEsperado ? Number(kgPorPlantaEsperado) : undefined,
        kgPorHaEsperado: kgPorHaEsperado ? Number(kgPorHaEsperado) : undefined,
      },
    });

    revalidatePath(`/dashboard/admin/fichas-tecnicas/${fichaId}`);
    return { punto };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    if (error instanceof FichaNoEditableError) return { error: error.message };
    console.error("[agregarPuntoCurva]", error);
    return { error: "Error al agregar punto de curva" };
  }
}

export async function eliminarPuntoCurva(fichaId: string, puntoId: string): Promise<{ error?: string; ok?: boolean }> {
  const session = await getServerSession(authOptions);
  try {
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    await db.puntoCurvaProduccion.delete({ where: { id: puntoId } });
    revalidatePath(`/dashboard/admin/fichas-tecnicas/${fichaId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    if (error instanceof FichaNoEditableError) return { error: error.message };
    console.error("[eliminarPuntoCurva]", error);
    return { error: "Error al eliminar punto de curva" };
  }
}
