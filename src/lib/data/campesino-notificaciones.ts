import { db } from "@/lib/db";
import { ESPECIES_CAMPESINO, ESPECIE_A_COMMODITY, esEspecieCampesinoValida } from "@/lib/campesino-especies";

// Días sin revisar un cultivo (foto de diagnóstico) antes de recordárselo.
const UMBRAL_DIAS_SIN_REVISAR = 15;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface NotificacionCampesino {
  id: string;
  tipo: "precio-subio" | "precio-bajo" | "recordatorio";
  titulo: string;
  subtitulo: string;
  href: string;
  fecha: Date;
}

/**
 * "Notificaciones" (/campesino/notificaciones) — NO es push real (el
 * service worker está desactivado a propósito en este proyecto, ver
 * CLAUDE.md). Es una lista que se arma en el momento, cada vez que el
 * usuario abre la pantalla, a partir de datos que YA existen: cambios de
 * precio en sus cultivos seleccionados (PrecioMercado) y recordatorios de
 * revisión si hace tiempo no diagnostica alguno (ConsultaDiagnosticoCampesino).
 * Igual que "Mis cultivos", depende de que haya seleccionado cultivos ahí
 * — sin selección, la lista queda vacía (mismo criterio en toda la app).
 */
export async function getNotificacionesCampesino(userId: string): Promise<NotificacionCampesino[]> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { cultivosSeleccionados: true } });
  const seleccionados = (user?.cultivosSeleccionados ?? []).filter(esEspecieCampesinoValida);
  if (seleccionados.length === 0) return [];

  const commodities = seleccionados.map((s) => ESPECIE_A_COMMODITY[s]);
  const [precios, consultas] = await Promise.all([
    db.precioMercado.findMany({ where: { commodity: { in: commodities }, activo: true }, orderBy: { fecha: "desc" } }),
    db.consultaDiagnosticoCampesino.findMany({ where: { userId, especieSlug: { in: seleccionados } }, orderBy: { createdAt: "desc" } }),
  ]);

  const notificaciones: NotificacionCampesino[] = [];
  const ahora = Date.now();

  for (const slug of seleccionados) {
    const especie = ESPECIES_CAMPESINO.find((e) => e.slug === slug)!;
    const commodity = ESPECIE_A_COMMODITY[slug];

    // 1) Cambio de precio — solo si de verdad subió o bajó (IGUAL no aporta nada).
    const precio = precios.find((p) => p.commodity === commodity);
    if (precio && precio.tendencia !== "IGUAL") {
      const subio = precio.tendencia === "SUBIO";
      notificaciones.push({
        id: `precio-${slug}`,
        tipo: subio ? "precio-subio" : "precio-bajo",
        titulo: `El precio del ${especie.nombre.toLowerCase()} ${subio ? "subió" : "bajó"} a $${precio.precioKg.toLocaleString("es-CO")}/${precio.unidad}`,
        subtitulo: "Toca para ver todos los precios",
        href: "/campesino/precios",
        fecha: precio.fecha,
      });
    }

    // 2) Recordatorio de revisión — nunca revisado, o hace más de N días.
    const ultimaConsulta = consultas.find((c) => c.especieSlug === slug);
    const diasSinRevisar = ultimaConsulta ? (ahora - ultimaConsulta.createdAt.getTime()) / MS_POR_DIA : Infinity;
    if (diasSinRevisar >= UMBRAL_DIAS_SIN_REVISAR) {
      notificaciones.push({
        id: `recordatorio-${slug}`,
        tipo: "recordatorio",
        titulo: ultimaConsulta ? `Hace tiempo no revisas tu ${especie.nombre.toLowerCase()}` : `Aún no has revisado tu ${especie.nombre.toLowerCase()}`,
        subtitulo: ultimaConsulta ? "Tócala para revisarla de nuevo" : "Tócala para hacer tu primer diagnóstico",
        href: `/campesino/diagnostico?especie=${slug}`,
        // Sin consulta previa: fecha "antigua" para que ordene después de
        // cualquier notificación con fecha real, pero siga apareciendo.
        fecha: ultimaConsulta?.createdAt ?? new Date(0),
      });
    }
  }

  return notificaciones.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}
