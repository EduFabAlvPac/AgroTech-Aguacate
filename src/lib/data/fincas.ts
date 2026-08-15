/**
 * Capa de datos de Finca — Fase 2 (ADR-006, "modo simple"). No existía en
 * Fase 1: esa fase solo tocó Lote (dentro de una finca ya activa); listar
 * TODAS las fincas accesibles al usuario (para la pantalla "Mis fincas")
 * vivía únicamente como query inline en GET /api/fincas y en el layout del
 * sidebar. Se extrae aquí con el mismo criterio que el resto de
 * lib/data/*.ts de Fase 1.
 */
import { db } from "@/lib/db";
import { fincaIdsAccesibles } from "@/lib/db/scoped";
import type { AuthzSession } from "@/lib/authz";

export interface FincaResumen {
  id: string;
  nombre: string;
  municipio: string;
  departamento: string;
  areaTotal: number | null;
  lat: number | null;
  lng: number | null;
  altitud: number | null;
}

/** Todas las fincas accesibles al usuario (para el selector del sidebar y
 * la pantalla "Mis fincas") — misma query que ya tenía GET /api/fincas. */
export async function getFincas(session: AuthzSession | null | undefined): Promise<FincaResumen[]> {
  const fincaIds = await fincaIdsAccesibles(session);
  return db.finca.findMany({
    where: fincaIds === "ALL" ? undefined : { id: { in: fincaIds } },
    select: { id: true, nombre: true, municipio: true, departamento: true, areaTotal: true, lat: true, lng: true, altitud: true },
    orderBy: { createdAt: "asc" },
  });
}
