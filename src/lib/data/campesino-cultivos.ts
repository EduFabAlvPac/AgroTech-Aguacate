import { db } from "@/lib/db";
import {
  ESPECIES_CAMPESINO,
  FOTO_ESPECIE_CAMPESINO,
  ESPECIE_A_COMMODITY,
  esEspecieCampesinoValida,
  type EspecieCampesinoSlug,
} from "@/lib/campesino-especies";
import type { TendenciaPrecio } from "@prisma/client";

export interface CultivoResumen {
  slug: EspecieCampesinoSlug;
  nombre: string;
  foto: string;
  precio: { precioKg: number; unidad: string; tendencia: TendenciaPrecio } | null;
  ultimaConsulta: { diagnostico: string; createdAt: Date; imagenValida: boolean } | null;
}

/**
 * "Mis cultivos" (/campesino/cultivos) — arma un resumen por cada especie
 * que el usuario seleccionó, reusando datos que YA existen (Precios de
 * mercado, Mis consultas) — no hay Finca/Lote/Cultivo detrás, decisión de
 * producto ya tomada. Ver también toggleCultivoSeleccionado() en
 * cultivos-actions.ts, que escribe User.cultivosSeleccionados.
 */
export async function getCultivosSeleccionados(userId: string): Promise<{ seleccionados: EspecieCampesinoSlug[]; cultivos: CultivoResumen[] }> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { cultivosSeleccionados: true } });
  const seleccionados = (user?.cultivosSeleccionados ?? []).filter(esEspecieCampesinoValida);
  if (seleccionados.length === 0) return { seleccionados: [], cultivos: [] };

  const commodities = seleccionados.map((s) => ESPECIE_A_COMMODITY[s]);
  const [precios, consultas] = await Promise.all([
    db.precioMercado.findMany({
      where: { commodity: { in: commodities }, activo: true },
      orderBy: { fecha: "desc" },
    }),
    db.consultaDiagnosticoCampesino.findMany({
      where: { userId, especieSlug: { in: seleccionados } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const cultivos: CultivoResumen[] = seleccionados.map((slug) => {
    const especie = ESPECIES_CAMPESINO.find((e) => e.slug === slug)!;
    const commodity = ESPECIE_A_COMMODITY[slug];
    // precios ya viene ordenado desc por fecha — el primero que calce es el más reciente.
    const precio = precios.find((p) => p.commodity === commodity) ?? null;
    const ultimaConsulta = consultas.find((c) => c.especieSlug === slug) ?? null;

    return {
      slug,
      nombre: especie.nombre,
      foto: FOTO_ESPECIE_CAMPESINO[slug],
      precio: precio ? { precioKg: precio.precioKg, unidad: precio.unidad, tendencia: precio.tendencia } : null,
      ultimaConsulta: ultimaConsulta
        ? { diagnostico: ultimaConsulta.diagnostico, createdAt: ultimaConsulta.createdAt, imagenValida: ultimaConsulta.imagenValida }
        : null,
    };
  });

  return { seleccionados, cultivos };
}
