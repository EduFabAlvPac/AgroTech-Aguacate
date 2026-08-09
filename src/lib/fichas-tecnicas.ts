/**
 * Helpers del motor de fichas técnicas — ver CLAUDE.md §2.2 y
 * docs/REQUERIMIENTOS.md §4.2 / ADR-002.
 */
import { db } from "@/lib/db";

export interface VariedadResuelta {
  especieId: string;
  variedadId: string;
  fichaTecnicaId: string | null;
  /** Nombre corto de la especie, ej. "Aguacate" (para el campo legacy Cultivo.especie) */
  especie: string;
  /** Nombre de la variedad, ej. "Hass" (para el campo legacy Cultivo.variedad) */
  variedad: string;
}

/**
 * Resuelve un variedadId del catálogo a su especie y a la versión PUBLICADA
 * más reciente de su ficha técnica. El servidor es quien resuelve esto
 * (nunca se confía en un fichaTecnicaId enviado por el cliente) para que un
 * cultivo siempre quede pinneado a una ficha real y vigente al crearse —
 * ver ADR-002. Devuelve `null` si el variedadId no existe.
 */
export async function resolverVariedad(variedadId: string): Promise<VariedadResuelta | null> {
  const variedad = await db.variedad.findUnique({
    where: { id: variedadId },
    include: {
      especie: { select: { id: true, nombre: true } },
      fichas: {
        where: { estado: "PUBLICADA" },
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!variedad) return null;

  return {
    especieId: variedad.especieId,
    variedadId: variedad.id,
    fichaTecnicaId: variedad.fichas[0]?.id ?? null,
    // EspecieCultivo.nombre hoy embebe especie+variedad (ej. "Aguacate Hass",
    // deuda documentada en ADR-002) — se toma solo la primera palabra como
    // nombre "limpio" de especie para los campos legacy de texto libre.
    especie: variedad.especie.nombre.split(" ")[0],
    variedad: variedad.nombre,
  };
}

export class FichaNoEditableError extends Error {
  status: 400 | 404;
  constructor(message: string, status: 400 | 404 = 400) {
    super(message);
    this.name = "FichaNoEditableError";
    this.status = status;
  }
}

/**
 * Verifica que una FichaTecnica exista y esté en BORRADOR antes de permitir
 * mutar sus subrecursos (etapas, plagas, costos, curva de producción) — una
 * ficha PUBLICADA o ARCHIVADA es inmutable, para no alterar retroactivamente
 * lo que ven los cultivos ya pinneados a esa versión (ADR-002).
 */
export async function assertFichaEditable(fichaId: string): Promise<void> {
  const ficha = await db.fichaTecnica.findUnique({ where: { id: fichaId }, select: { estado: true } });
  if (!ficha) throw new FichaNoEditableError("Ficha técnica no encontrada", 404);
  if (ficha.estado !== "BORRADOR") {
    throw new FichaNoEditableError("Solo se puede editar una ficha en BORRADOR — crea una nueva versión");
  }
}
