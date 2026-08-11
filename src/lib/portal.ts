import { db } from "./db";

/**
 * Portal de Compradores (Fase 4) — resuelve un token público a los datos
 * acotados de solo lectura que puede ver un comprador sin cuenta. Compartido
 * entre la API pública (/api/public/portal/[token]) y la página pública
 * (/portal/[token]) para no duplicar la lista de campos expuestos — ver
 * .kiro/skills/architecture/agrotech-ciberseguridad: cualquier cambio a lo
 * que se expone se hace en un solo lugar.
 */

export type PortalData = {
  finca: { nombre: string; municipio: string; departamento: string; altitud: number | null };
  cultivo: {
    especie: string;
    variedad: string;
    etapa: string;
    fechaSiembra: Date | null;
    cantidadPlantas: number | null;
    densidadHa: number | null;
    lote: string;
  };
  proyeccion: { fechaEstimada: string; volumenEstimadoKg: number | null } | null;
  fotos: string[];
  nota: string | null;
  precioAcordadoKg: number | null;
};

export async function getPortalData(token: string): Promise<PortalData | null> {
  const enlace = await db.enlaceCompartido.findUnique({
    where: { token },
    select: {
      id: true,
      revocado: true,
      expiraEn: true,
      nota: true,
      comprador: { select: { precioKg: true } },
      cultivo: {
        select: {
          especie: true,
          variedad: true,
          etapa: true,
          fechaSiembra: true,
          cantidadPlantas: true,
          densidadHa: true,
          especieCultivo: { select: { cicloMesesPrimeraCosecha: true, produccionKgArbolAnual: true } },
          lote: {
            select: {
              nombre: true,
              altitud: true,
              finca: { select: { nombre: true, municipio: true, departamento: true } },
            },
          },
          registros: {
            where: { imagenes: { isEmpty: false } },
            select: { imagenes: true },
            orderBy: { fecha: "desc" },
            take: 4,
          },
        },
      },
    },
  });

  if (!enlace) return null;
  if (enlace.revocado) return null;
  if (enlace.expiraEn && enlace.expiraEn < new Date()) return null;

  // Registro de vista — no bloqueante.
  db.enlaceCompartido
    .update({ where: { id: enlace.id }, data: { vistas: { increment: 1 }, ultimaVistaEn: new Date() } })
    .catch(() => {});

  const { cultivo } = enlace;
  const cicloMeses = cultivo.especieCultivo?.cicloMesesPrimeraCosecha;
  let proyeccion: PortalData["proyeccion"] = null;
  if (cultivo.fechaSiembra && cicloMeses) {
    const fechaEst = new Date(cultivo.fechaSiembra);
    fechaEst.setMonth(fechaEst.getMonth() + cicloMeses);
    const produccionPorArbol = cultivo.especieCultivo?.produccionKgArbolAnual;
    proyeccion = {
      fechaEstimada: fechaEst.toISOString(),
      volumenEstimadoKg: produccionPorArbol && cultivo.cantidadPlantas
        ? Math.round(cultivo.cantidadPlantas * produccionPorArbol)
        : null,
    };
  }

  return {
    finca: {
      nombre: cultivo.lote.finca.nombre,
      municipio: cultivo.lote.finca.municipio,
      departamento: cultivo.lote.finca.departamento,
      altitud: cultivo.lote.altitud,
    },
    cultivo: {
      especie: cultivo.especie,
      variedad: cultivo.variedad,
      etapa: cultivo.etapa,
      fechaSiembra: cultivo.fechaSiembra,
      cantidadPlantas: cultivo.cantidadPlantas,
      densidadHa: cultivo.densidadHa,
      lote: cultivo.lote.nombre,
    },
    proyeccion,
    fotos: cultivo.registros.flatMap((r) => r.imagenes).slice(0, 6),
    nota: enlace.nota,
    precioAcordadoKg: enlace.comprador?.precioKg ?? null,
  };
}
