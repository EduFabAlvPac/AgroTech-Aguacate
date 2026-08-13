import type { TipoUsoIa } from "@prisma/client";
import { db } from "./db";

/**
 * Límite diario de uso de IA (chat/voz/imagen) — segunda capa de defensa tras
 * la autenticación. Ver CLAUDE.md §3 (rate limiting pendiente en el gap
 * analysis) y prisma/schema.prisma (modelo UsoIaDiario).
 *
 * Valores generosos para uso legítimo real (un productor conversando o
 * registrando bitácora) pero acotados frente a abuso/loop de UI:
 * - CHAT: conversación de texto, es lo que más se usa en un día normal.
 * - VOZ: notas de bitácora por voz, uso puntual en campo.
 * - IMAGEN: diagnóstico por foto (modelo de visión, el más caro por token).
 */
const LIMITES_DIARIOS: Record<TipoUsoIa, number> = {
  CHAT: 100,
  VOZ: 30,
  IMAGEN: 20,
};

export class CuotaExcedidaError extends Error {
  status = 429 as const;
  constructor(tipo: TipoUsoIa) {
    super(
      `Alcanzaste el límite diario de uso (${LIMITES_DIARIOS[tipo]}) para esta función de IA. Vuelve a intentar mañana.`
    );
    this.name = "CuotaExcedidaError";
  }
}

function hoyUtc(): Date {
  const ahora = new Date();
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
}

/**
 * Incrementa el contador de uso de IA del usuario para hoy y lanza
 * `CuotaExcedidaError` si ya alcanzó el límite diario de `tipo`. Se debe
 * llamar ANTES de golpear el proveedor de IA (Groq), no después — así una
 * ráfaga de requests concurrentes no se cuela mientras se resuelve la
 * primera.
 */
export async function consumirCuotaIA(userId: string, tipo: TipoUsoIa): Promise<void> {
  const fecha = hoyUtc();
  const registro = await db.usoIaDiario.upsert({
    where: { userId_tipo_fecha: { userId, tipo, fecha } },
    create: { userId, tipo, fecha, contador: 1 },
    update: { contador: { increment: 1 } },
    select: { contador: true },
  });

  if (registro.contador > LIMITES_DIARIOS[tipo]) {
    throw new CuotaExcedidaError(tipo);
  }
}
