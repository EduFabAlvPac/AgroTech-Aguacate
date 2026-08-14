/**
 * Capa de datos del panel Super Admin de Fichas Técnicas — Fase 1
 * (ADR-006). Reemplaza las queries que vivían inline en
 * admin/fichas-tecnicas/page.tsx y admin/fichas-tecnicas/[fichaId]/page.tsx.
 */
import { db } from "@/lib/db";

const especiesInclude = {
  variedades: {
    include: {
      fichas: {
        orderBy: { version: "desc" as const },
        select: { id: true, version: true, estado: true, publicadaEn: true },
      },
      _count: { select: { cultivos: true } },
    },
    orderBy: { nombre: "asc" as const },
  },
};

/** Catálogo completo especie → variedades → fichas (todas las versiones, no
 * solo PUBLICADA) para la lista del panel Super Admin. */
export async function getEspeciesConFichas() {
  return db.especieCultivo.findMany({
    include: especiesInclude,
    orderBy: { nombre: "asc" },
  });
}

const fichaInclude = {
  variedad: { include: { especie: true } },
  etapas: { orderBy: { orden: "asc" as const } },
  plagas: { orderBy: { nombre: "asc" as const } },
  costosRef: { orderBy: { categoria: "asc" as const } },
  curvaProduccion: { orderBy: { anioProduccion: "asc" as const } },
  _count: { select: { cultivos: true } },
};

/** Detalle completo de una ficha técnica para el editor. */
export async function getFichaCompleta(fichaId: string) {
  return db.fichaTecnica.findUnique({
    where: { id: fichaId },
    include: fichaInclude,
  });
}
