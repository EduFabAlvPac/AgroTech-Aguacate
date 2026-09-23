/**
 * Log de auditoría — acciones sensibles (eliminar/exportar cuenta, cambios de
 * equipo, bloqueos de login). Ver prisma/schema.prisma (AuditLog) y CLAUDE.md
 * §7 (OWASP, Ley 1581).
 *
 * ADR-011 Sprint 5 — encadenamiento hash SHA-256 (ISO 27001 A.8.15,
 * "AuditLog inmutable con encadenamiento hash, append-only"). El schema ya
 * traía `hashPrevio`/`hashActual` desde el PR #50, con el diseño de
 * concurrencia ya decidido en su propio comentario: una cadena GLOBAL se
 * rompe con escrituras concurrentes (serverless) → una cadena POR
 * organización, con transacción serializable.
 *
 * `ipAddress`/`userAgent` se capturan acá adentro con `headers()` de
 * "next/headers" — funciona igual en Route Handlers y Server Actions (ya
 * usado con ese mismo propósito universal en src/lib/finca-activa.ts /
 * modo-app.ts, aunque para otro header), así que ningún caller necesita
 * pasarlos ni cambiar su firma.
 */
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { db } from "./db";
import { obtenerIp, obtenerUserAgent } from "./auth";

export const GENESIS = "GENESIS";
const REINTENTOS_CONFLICTO = 3;

export interface ParametrosAuditoria {
  actorId?: string | null;
  actorEmail?: string | null;
  accion: string;
  detalle?: Record<string, unknown>;
  // ADR-011 Sprint 5 — antes no se escribían. Todos opcionales: un caller
  // que no los pase sigue funcionando exactamente igual que hoy (evento sin
  // encadenar, organizacionId null).
  organizacionId?: string | null;
  recurso?: string | null;
  recursoId?: string | null;
  resultado?: "EXITO" | "FALLIDO" | "DENEGADO";
}

/**
 * Serialización canónica (claves ordenadas) — encontrado en QA real de este
 * mismo sprint: Postgres `jsonb` NO conserva el orden de inserción de las
 * claves de un objeto (las reordena internamente al guardar). `detalle` es
 * justamente `Json?`/`jsonb` — si se hashea con `JSON.stringify` normal, el
 * hash calculado al escribir (sobre el objeto en memoria, con su orden
 * original) nunca vuelve a coincidir al verificar (sobre el objeto releído
 * de la BD, con las claves reordenadas), aunque nada haya cambiado —
 * `verificarCadena()` reportaría manipulación en filas intactas. Ordenar las
 * claves antes de hashear hace que el resultado no dependa de en qué orden
 * las devuelva Postgres. `undefined` se omite igual que `JSON.stringify`
 * (mismo criterio que ya aplica Prisma al guardar un campo `Json` — un valor
 * `undefined` nunca llega a persistirse, así que hashearlo como ausente en
 * ambos lados es lo consistente).
 */
function ordenarClaves(valor: unknown): unknown {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map(ordenarClaves);
  const entradas = Object.entries(valor as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(entradas.map(([k, v]) => [k, ordenarClaves(v)]));
}

/** Contenido inmutable de una fila — lo que entra al hash. `createdAt` se
 * genera acá (no @default(now()) de la BD) para que el hash sea exactamente
 * sobre el valor que termina guardado, no sobre uno que la BD podría
 * redondear/ajustar de otra forma.
 *
 * Puras (sin BD) — exportadas para que los tests puedan construir cadenas
 * sintéticas válidas y probar `verificarCadena()` sin duplicar esta lógica
 * (y sin necesidad de mockear next/headers ni Prisma.$transaction). */
export function contenidoParaHash(fila: {
  actorId: string | null;
  actorEmail: string | null;
  accion: string;
  detalle: Record<string, unknown> | null;
  organizacionId: string | null;
  recurso: string | null;
  recursoId: string | null;
  resultado: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}): string {
  return JSON.stringify(
    ordenarClaves({
      actorId: fila.actorId,
      actorEmail: fila.actorEmail,
      accion: fila.accion,
      detalle: fila.detalle,
      organizacionId: fila.organizacionId,
      recurso: fila.recurso,
      recursoId: fila.recursoId,
      resultado: fila.resultado,
      ipAddress: fila.ipAddress,
      userAgent: fila.userAgent,
      createdAt: fila.createdAt.toISOString(),
    })
  );
}

export function calcularHash(hashPrevio: string, contenido: string): string {
  return createHash("sha256").update(`${hashPrevio}:${contenido}`).digest("hex");
}

export async function registrarAuditoria(params: ParametrosAuditoria): Promise<void> {
  try {
    const hdrs = await headers();
    const ipAddress = obtenerIp(hdrs);
    const userAgent = obtenerUserAgent(hdrs) ?? null;

    const base = {
      actorId: params.actorId ?? null,
      actorEmail: params.actorEmail ?? null,
      accion: params.accion,
      detalle: (params.detalle as any) ?? null,
      organizacionId: params.organizacionId ?? null,
      recurso: params.recurso ?? null,
      recursoId: params.recursoId ?? null,
      resultado: params.resultado ?? "EXITO",
      ipAddress,
      userAgent,
      createdAt: new Date(),
    };

    // Sin organización: evento de una cuenta, no de un tenant — no hay
    // "cadena de quién" en la que encadenarlo (mismo estado que ya toleran
    // los registros previos al Sprint 5: hashPrevio/hashActual en null).
    if (!base.organizacionId) {
      await db.auditLog.create({ data: base });
      return;
    }

    for (let intento = 1; intento <= REINTENTOS_CONFLICTO; intento++) {
      try {
        await db.$transaction(
          async (tx) => {
            const ultima = await tx.auditLog.findFirst({
              where: { organizacionId: base.organizacionId },
              orderBy: { createdAt: "desc" },
              select: { hashActual: true },
            });
            const hashPrevio = ultima?.hashActual ?? GENESIS;
            const hashActual = calcularHash(hashPrevio, contenidoParaHash(base));
            await tx.auditLog.create({ data: { ...base, hashPrevio, hashActual } });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
        return;
      } catch (error) {
        const esConflicto = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (esConflicto && intento < REINTENTOS_CONFLICTO) continue; // dos escrituras casi simultáneas a la misma org — reintentar
        if (esConflicto) {
          // Se agotaron los reintentos — se escribe igual, sin encadenar.
          // El evento importa más que la cadena perfecta; queda en el mismo
          // estado "sin encadenar" que ya toleran los registros viejos.
          console.error("[registrarAuditoria] conflicto de serialización agotó reintentos, se escribe sin encadenar", error);
          await db.auditLog.create({ data: base });
          return;
        }
        throw error;
      }
    }
  } catch (error) {
    // Nunca debe tumbar la acción principal (eliminar cuenta, invitar
    // colaborador...) por un fallo al escribir el log — se reporta y sigue.
    console.error("[registrarAuditoria]", error);
  }
}

// ─── Verificación de la cadena ──────────────────────────────────────────────

export interface FilaCadena {
  id: string;
  hashPrevio: string | null;
  hashActual: string | null;
  actorId: string | null;
  actorEmail: string | null;
  accion: string;
  detalle: unknown;
  organizacionId: string | null;
  recurso: string | null;
  recursoId: string | null;
  resultado: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface ResultadoVerificacion {
  integra: boolean;
  /** id de la primera fila que no coincide, si alguna falla. */
  filaRota?: string;
}

/**
 * Núcleo puro (sin BD) — recorre `filas` EN ORDEN (más antigua primero) y
 * recalcula cada hash, comparando contra lo guardado. Separado de
 * `verificarCadenaAuditoria()` (que sí toca la BD) para poder testearlo sin
 * mocks, mismo patrón que `can()`/`membresiaPermite()` en
 * src/lib/authz/policies.ts.
 */
export function verificarCadena(filas: FilaCadena[]): ResultadoVerificacion {
  let hashPrevioEsperado = GENESIS;
  for (const fila of filas) {
    // Fila sin encadenar (organizacionId null en su momento, o conflicto
    // agotado) — no rompe la cadena, simplemente no aporta a ella; el
    // siguiente eslabón real sigue esperando el último hash conocido.
    if (fila.hashActual === null) continue;

    const contenido = contenidoParaHash({
      actorId: fila.actorId,
      actorEmail: fila.actorEmail,
      accion: fila.accion,
      detalle: fila.detalle as Record<string, unknown> | null,
      organizacionId: fila.organizacionId,
      recurso: fila.recurso,
      recursoId: fila.recursoId,
      resultado: fila.resultado,
      ipAddress: fila.ipAddress,
      userAgent: fila.userAgent,
      createdAt: fila.createdAt,
    });
    const hashEsperado = calcularHash(hashPrevioEsperado, contenido);

    if (fila.hashPrevio !== hashPrevioEsperado || fila.hashActual !== hashEsperado) {
      return { integra: false, filaRota: fila.id };
    }
    hashPrevioEsperado = fila.hashActual;
  }
  return { integra: true };
}

/** Trae las filas de `organizacionId` (más antigua primero) y delega en el
 * núcleo puro de arriba. */
export async function verificarCadenaAuditoria(organizacionId: string): Promise<ResultadoVerificacion> {
  const filas = await db.auditLog.findMany({
    where: { organizacionId },
    orderBy: { createdAt: "asc" },
  });
  return verificarCadena(filas as FilaCadena[]);
}
