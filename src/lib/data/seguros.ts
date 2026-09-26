/**
 * Capa de datos de Seguros — lecturas para /dashboard/seguros, el detalle de
 * cultivo y el expediente. El acceso a la finca ya viene decidido por quien
 * llama (finca activa validada, o `requireAccess` en el expediente).
 */
import { db } from "@/lib/db";
import { ventanaEvidencia } from "@/lib/seguros";
import type { RiesgoAsegurado, EstadoPoliza, EstadoSiniestro, EstadoCultivo } from "@prisma/client";

export interface CultivoOpcion {
  id: string;
  nombre: string; // "Aguacate Hass · Lote Norte"
  estado: EstadoCultivo;
}

export interface PolizaVista {
  id: string;
  aseguradora: string;
  numeroPoliza: string | null;
  riesgos: RiesgoAsegurado[];
  sumaAsegurada: number | null;
  prima: number | null;
  deduciblePct: number | null;
  fechaInicio: Date;
  fechaFin: Date;
  estado: EstadoPoliza;
  contacto: string | null;
  notas: string | null;
  cultivos: { id: string; nombre: string }[];
  totalSiniestros: number;
}

export interface SiniestroVista {
  id: string;
  cultivoId: string;
  cultivoNombre: string;
  polizaId: string | null;
  polizaNombre: string | null;
  tipo: RiesgoAsegurado;
  fechaEvento: Date;
  descripcion: string;
  areaAfectadaHa: number | null;
  porcentajeDanio: number | null;
  perdidaEstimada: number | null;
  estado: EstadoSiniestro;
  numeroReclamo: string | null;
  fechaReporteAseguradora: Date | null;
  montoIndemnizado: number | null;
  notas: string | null;
  totalFotos: number;
}

export interface SegurosResumen {
  polizas: PolizaVista[];
  siniestros: SiniestroVista[];
  cultivos: CultivoOpcion[];
}

const nombreCultivo = (c: { especie: string; variedad: string; lote: { nombre: string } }) => `${c.especie} ${c.variedad} · ${c.lote.nombre}`;

export async function getSegurosResumen(fincaActivaId: string | null, sinFincaSentinel: string): Promise<SegurosResumen> {
  const fincaId = fincaActivaId ?? sinFincaSentinel;

  const [polizas, siniestros, cultivos] = await Promise.all([
    db.polizaSeguro.findMany({
      where: { fincaId },
      orderBy: { fechaFin: "desc" },
      include: {
        cultivos: { select: { cultivo: { select: { id: true, especie: true, variedad: true, lote: { select: { nombre: true } } } } } },
        _count: { select: { siniestros: true } },
      },
    }),
    db.siniestro.findMany({
      where: { fincaId },
      orderBy: { fechaEvento: "desc" },
      include: {
        cultivo: { select: { especie: true, variedad: true, lote: { select: { nombre: true } } } },
        poliza: { select: { aseguradora: true, numeroPoliza: true } },
      },
      omit: { imagenes: true },
    }),
    db.cultivo.findMany({
      where: { lote: { fincaId } },
      select: { id: true, especie: true, variedad: true, estado: true, lote: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Cantidad de fotos sin traer los base64 (pesados) a la lista.
  const fotos = siniestros.length
    ? await db.$queryRaw<{ id: string; n: number }[]>`SELECT id, COALESCE(array_length(imagenes, 1), 0)::int AS n FROM siniestros WHERE "fincaId" = ${fincaId}`
    : [];
  const nFotos = new Map(fotos.map((f) => [f.id, f.n]));

  return {
    polizas: polizas.map((p) => ({
      id: p.id,
      aseguradora: p.aseguradora,
      numeroPoliza: p.numeroPoliza,
      riesgos: p.riesgos,
      sumaAsegurada: p.sumaAsegurada,
      prima: p.prima,
      deduciblePct: p.deduciblePct,
      fechaInicio: p.fechaInicio,
      fechaFin: p.fechaFin,
      estado: p.estado,
      contacto: p.contacto,
      notas: p.notas,
      cultivos: p.cultivos.map((pc) => ({ id: pc.cultivo.id, nombre: nombreCultivo(pc.cultivo) })),
      totalSiniestros: p._count.siniestros,
    })),
    siniestros: siniestros.map((s) => ({
      id: s.id,
      cultivoId: s.cultivoId,
      cultivoNombre: nombreCultivo(s.cultivo),
      polizaId: s.polizaId,
      polizaNombre: s.poliza ? `${s.poliza.aseguradora}${s.poliza.numeroPoliza ? ` · ${s.poliza.numeroPoliza}` : ""}` : null,
      tipo: s.tipo,
      fechaEvento: s.fechaEvento,
      descripcion: s.descripcion,
      areaAfectadaHa: s.areaAfectadaHa,
      porcentajeDanio: s.porcentajeDanio,
      perdidaEstimada: s.perdidaEstimada,
      estado: s.estado,
      numeroReclamo: s.numeroReclamo,
      fechaReporteAseguradora: s.fechaReporteAseguradora,
      montoIndemnizado: s.montoIndemnizado,
      notas: s.notas,
      totalFotos: nFotos.get(s.id) ?? 0,
    })),
    cultivos: cultivos.map((c) => ({ id: c.id, nombre: nombreCultivo(c), estado: c.estado })),
  };
}

/** Pólizas y siniestros de UN cultivo (tarjeta en el detalle del cultivo). */
export async function getSegurosDeCultivo(cultivoId: string) {
  const [polizas, siniestros] = await Promise.all([
    db.polizaSeguro.findMany({
      where: { cultivos: { some: { cultivoId } } },
      orderBy: { fechaFin: "desc" },
      select: { id: true, aseguradora: true, numeroPoliza: true, riesgos: true, fechaInicio: true, fechaFin: true, estado: true },
    }),
    db.siniestro.findMany({
      where: { cultivoId },
      orderBy: { fechaEvento: "desc" },
      select: { id: true, tipo: true, fechaEvento: true, estado: true, porcentajeDanio: true },
    }),
  ]);
  return { polizas, siniestros };
}

/** Todo lo que necesita el expediente de un siniestro (clima, actividad, fotos). */
export async function getExpediente(siniestroId: string) {
  const s = await db.siniestro.findUnique({
    where: { id: siniestroId },
    include: {
      finca: { select: { id: true, nombre: true, municipio: true, departamento: true, altitud: true, lat: true, lng: true, organizacion: { select: { nombre: true } } } },
      cultivo: { include: { lote: { select: { nombre: true, areaHa: true } } } },
      poliza: true,
    },
  });
  if (!s) return null;

  const { desde, hasta } = ventanaEvidencia(s.fechaEvento);
  const [alertas, registros] = await Promise.all([
    db.alertaClimatica.findMany({
      where: { fincaId: s.fincaId, fechaInicio: { gte: desde, lte: hasta } },
      orderBy: { fechaInicio: "asc" },
      select: { id: true, tipo: true, titulo: true, descripcion: true, severidad: true, fechaInicio: true, datos: true },
    }),
    db.registroCultivo.findMany({
      where: { cultivoId: s.cultivoId, fecha: { gte: new Date(s.fechaEvento.getTime() - 30 * 86_400_000), lte: hasta } },
      orderBy: { fecha: "asc" },
      select: { id: true, tipo: true, descripcion: true, fecha: true },
    }),
  ]);

  return { siniestro: s, alertas, registros, ventana: { desde, hasta } };
}
