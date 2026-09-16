/**
 * Las 4 especies del selector de Diagnóstico en el modo Campesino (mockup
 * validado 2026-08-26) — comparte el mismo slug tanto en el cliente
 * (src/app/(campesino)/campesino/diagnostico/*) como en el endpoint
 * (src/app/api/campesino/diagnostico/route.ts), para no duplicar la lista.
 * Los slugs son los de EspecieCultivo ya sembrados — ver prisma/seed-
 * especies.ts (café/cacao/aguacate) y prisma/seed-citricos-campesino.ts
 * (cítricos, especie nueva y propia — no reusa Limón Tahití).
 */
export const ESPECIES_CAMPESINO = [
  { slug: "cafe-caturra", nombre: "Café" },
  { slug: "cacao-ccu51", nombre: "Cacao" },
  { slug: "aguacate-hass", nombre: "Aguacate" },
  { slug: "citricos-generico", nombre: "Cítricos" },
] as const;

export type EspecieCampesinoSlug = (typeof ESPECIES_CAMPESINO)[number]["slug"];

export function esEspecieCampesinoValida(slug: string): slug is EspecieCampesinoSlug {
  return ESPECIES_CAMPESINO.some((e) => e.slug === slug);
}

/** Fotos reales ya existentes en el repo (public/images/cultivos/, ver
 * CREDITOS.md ahí) — mismo mapeo usado en DiagnosticoCampesinoClient.tsx y
 * ahora también en /campesino/cultivos. "limon.jpg" es el más cercano a
 * Cítricos — no hay foto propia de "cítricos genérico" todavía. */
export const FOTO_ESPECIE_CAMPESINO: Record<EspecieCampesinoSlug, string> = {
  "cafe-caturra": "/images/cultivos/cafe.jpg",
  "cacao-ccu51": "/images/cultivos/cacao.jpg",
  "aguacate-hass": "/images/cultivos/aguacate.jpg",
  "citricos-generico": "/images/cultivos/limon.jpg",
};

/** Puente entre el slug de especie (Diagnóstico) y el commodity de Precios
 * de Mercado — son dos enums paralelos por diseño (ver PrecioMercado en
 * schema.prisma: commodity es un enum propio, no una FK a EspecieCultivo,
 * precisamente para no acoplar comercialización con agronomía), así que
 * "Mis cultivos" necesita este mapeo para mostrar el precio de cada
 * especie que el usuario seleccionó. */
export const ESPECIE_A_COMMODITY: Record<EspecieCampesinoSlug, "CAFE" | "CACAO" | "AGUACATE" | "CITRICOS"> = {
  "cafe-caturra": "CAFE",
  "cacao-ccu51": "CACAO",
  "aguacate-hass": "AGUACATE",
  "citricos-generico": "CITRICOS",
};
