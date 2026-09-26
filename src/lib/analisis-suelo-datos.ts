/**
 * Arma los datos de un AnalisisSuelo a partir del formulario validado y
 * resuelve a qué cultivo se atribuye. Una sola fuente para POST (crear) y PUT
 * (editar): antes cada ruta copiaba campo por campo y un valor borrado en el
 * formulario nunca se limpiaba (undefined = «no tocar»).
 */
import type { EtapaCultivo, Prisma } from "@prisma/client";
import { db } from "./db";
import type { AnalisisSueloFormData } from "./validations";

export class AnalisisSueloError extends Error {}

const CAMPOS_NUMERICOS = [
  "ph", "materiaOrganica", "nitrogeno", "fosforo", "potasio", "conductividad",
  "calcio", "magnesio", "sodio", "aluminio", "cic", "azufre", "boro", "hierro", "manganeso", "zinc", "cobre", "profundidadCm",
] as const;

/**
 * El cultivo debe pertenecer al MISMO lote del análisis (y por tanto a la
 * misma finca). Devuelve `{ cultivoId, etapa }` a guardar: la etapa es una foto
 * del momento del muestreo, así que solo se toma del cultivo cuando el vínculo
 * es nuevo; si el vínculo no cambia se conserva la etapa ya guardada.
 */
export async function resolverAtribucion(
  loteId: string,
  cultivoId: string | null | undefined,
  previo?: { cultivoId: string | null; etapa: EtapaCultivo | null }
): Promise<{ cultivoId: string | null; etapa: EtapaCultivo | null }> {
  if (!cultivoId) return { cultivoId: null, etapa: null };
  const cultivo = await db.cultivo.findUnique({ where: { id: cultivoId }, select: { loteId: true, etapa: true } });
  if (!cultivo || cultivo.loteId !== loteId) throw new AnalisisSueloError("El cultivo elegido no pertenece a este lote.");
  if (previo && previo.cultivoId === cultivoId) return { cultivoId, etapa: previo.etapa ?? cultivo.etapa };
  return { cultivoId, etapa: cultivo.etapa };
}

export function datosAnalisis(d: AnalisisSueloFormData): Omit<Prisma.AnalisisSueloUncheckedCreateInput, "loteId" | "cultivoId" | "etapa"> {
  const numeros = Object.fromEntries(CAMPOS_NUMERICOS.map((k) => [k, d[k] ?? null])) as Record<(typeof CAMPOS_NUMERICOS)[number], number | null>;
  return {
    fechaMuestreo: new Date(d.fechaMuestreo),
    ...numeros,
    textura: d.textura ? (d.textura as Prisma.AnalisisSueloUncheckedCreateInput["textura"]) : null,
    laboratorio: d.laboratorio || null,
    notas: d.notas || null,
    imagenes: d.imagenes ?? [],
  };
}
