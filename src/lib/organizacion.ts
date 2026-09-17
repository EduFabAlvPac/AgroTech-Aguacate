import { db } from "./db";
import { slugify } from "./utils";

/**
 * Slug único para una Organizacion nueva — mismo patrón (raíz + sufijo
 * incremental en colisión) que ya usaba `prisma/backfill-organizaciones.ts`
 * para el backfill de Fase 0, ahora como función reusable en vez de vivir
 * duplicada dentro de ese script de una sola vez. Reusa `slugify()` de
 * utils.ts en vez de reimplementar la normalización de acentos/ñ.
 */
export async function slugUnico(base: string): Promise<string> {
  const raiz = slugify(base).slice(0, 48) || "org";
  let slug = raiz;
  let intento = 1;
  // Colisiones son un caso borde a este volumen de usuarios, no un cuello
  // de botella — mismo criterio que el script de backfill.
  while (await db.organizacion.findUnique({ where: { slug } })) {
    intento += 1;
    slug = `${raiz}-${intento}`;
  }
  return slug;
}
