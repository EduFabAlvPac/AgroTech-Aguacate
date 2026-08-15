/**
 * Capa de datos de Cultivos — Fase 1 (ADR-006). Lectura primero; las
 * mutaciones (crear/editar/eliminar Lote/Cultivo/Registro, cambiar Etapa)
 * se extraen aparte como Server Actions, un commit por entidad — ver
 * src/app/(dashboard)/dashboard/cultivos/actions.ts.
 */
import { db } from "@/lib/db";
import type { Finca, Lote, Cultivo, RegistroCultivo, EspecieCultivo } from "@prisma/client";

export type CultivoConDatos = Cultivo & {
  registros: RegistroCultivo[];
  _count: { registros: number; gastos: number };
  // Agregado en Fase 2 (ADR-006, "modo simple") — Cultivos simple necesita
  // cicloMesesPrimeraCosecha/produccionKgArbolAnual para
  // computeCultivoTimeline (progreso de ciclo, cosecha estimada). Extensión
  // aditiva del include de Prisma: los consumidores existentes de
  // getCultivos (CultivosList.tsx, modo completo) ignoran el campo extra,
  // cero cambio de comportamiento para ellos.
  especieCultivo: Pick<EspecieCultivo, "cicloMesesPrimeraCosecha" | "produccionKgArbolAnual"> | null;
};
export type LoteConCultivos = Lote & { cultivos: CultivoConDatos[] };
export type FincaConLotes = (Finca & { lotes: LoteConCultivos[] }) | null;

// ── Estado de salud (Fase 2, ADR-006 "modo simple") ──────────────────────

export type EstadoSalud = "saludable" | "requiere_atencion";

const DIAS_SIN_REGISTRO_ALERTA = 21;

/**
 * Señal de SEGUIMIENTO (actividad de bitácora reciente), no un diagnóstico
 * agronómico real — no hay datos de plagas/clima por cultivo todavía para
 * eso. "Requiere atención" si: (a) no tiene ningún registro de bitácora en
 * los últimos 21 días, o (b) sigue en PREPARACION sin fecha de siembra.
 * Regla confirmada explícitamente con el usuario antes de aplicarla.
 * Pura — recibe el cultivo ya cargado (con sus últimos registros), no hace
 * I/O.
 */
export function calcularEstadoSalud(cultivo: Pick<Cultivo, "etapa" | "fechaSiembra"> & { registros: Pick<RegistroCultivo, "fecha">[] }): EstadoSalud {
  if (cultivo.etapa === "PREPARACION" && !cultivo.fechaSiembra) return "requiere_atencion";

  const ultimoRegistro = cultivo.registros[0]?.fecha;
  if (!ultimoRegistro) return "requiere_atencion";

  const diasDesdeUltimoRegistro = Math.floor((Date.now() - new Date(ultimoRegistro).getTime()) / (1000 * 60 * 60 * 24));
  if (diasDesdeUltimoRegistro > DIAS_SIN_REGISTRO_ALERTA) return "requiere_atencion";

  return "saludable";
}

/**
 * Lotes + cultivos (con últimos 3 registros y conteos) de la finca activa.
 * Misma query que antes vivía inline en cultivos/page.tsx.
 */
export async function getCultivos(fincaActivaId: string | null): Promise<FincaConLotes> {
  if (!fincaActivaId) return null;
  return db.finca.findUnique({
    where: { id: fincaActivaId },
    include: {
      lotes: {
        include: {
          cultivos: {
            include: {
              registros: { orderBy: { fecha: "desc" }, take: 3 },
              _count: { select: { registros: true, gastos: true } },
              especieCultivo: { select: { cicloMesesPrimeraCosecha: true, produccionKgArbolAnual: true } },
            },
          },
        },
      },
    },
  });
}

/**
 * Detalle completo de un cultivo (lote, finca, análisis de suelo,
 * registros de bitácora, gastos/ingresos, rango altitudinal RF3) —
 * extraída tal cual (Fase 5, ADR-006, QA de paridad) de donde vivía
 * inline en dashboard/cultivos/[id]/page.tsx, sin cambiar la consulta, para
 * que la nueva ruta bifurcada de modo simple (detalle/bitácora, gap #2 del
 * checkpoint de Fase 5) pueda reutilizarla exacta en vez de duplicarla.
 * Scoped por userId (misma condición que ya tenía la página).
 */
export async function getCultivoDetalle(id: string, userId: string) {
  return db.cultivo.findFirst({
    where: {
      id,
      lote: { finca: { userId } },
    },
    include: {
      lote: {
        include: {
          finca: true,
          analisisSuelo: { orderBy: { fechaMuestreo: "desc" } },
        },
      },
      registros: { orderBy: { fecha: "desc" } },
      gastos: { orderBy: { fecha: "desc" }, take: 10 },
      ingresos: { include: { comprador: true }, orderBy: { fecha: "desc" } },
      // cicloMesesPrimeraCosecha/produccionKgArbolAnual agregados (Fase 5,
      // ADR-006) — la rama simple los necesita para computeCultivoTimeline
      // (mismo cálculo de progreso/cosecha estimada que ya usa la lista de
      // Cultivos). Extensión aditiva: CultivoDetail.tsx (modo completo) no
      // los usa, los ignora — cero cambio de comportamiento para él, mismo
      // patrón ya aplicado a getCultivos en Fase 2.
      especieCultivo: { select: { nombre: true, altitudMin: true, altitudMax: true, cicloMesesPrimeraCosecha: true, produccionKgArbolAnual: true } },
    },
  });
}
