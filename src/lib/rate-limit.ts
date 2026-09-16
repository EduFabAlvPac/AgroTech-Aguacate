import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { MENSAJE_RATE_LIMIT } from "./rate-limit-shared";

export { MENSAJE_RATE_LIMIT };

/**
 * Rate limiting (Fase 1 del roadmap SaaS, "34 rutas sin defensa contra
 * ráfagas" del diagnóstico) — Upstash Redis vía su API REST (sin servidor
 * propio que mantener, free tier real). Dos frentes:
 *
 * 1. Login: el proveedor de contraseña YA tiene un lockout real por cuenta
 *    (`User.failedLoginAttempts`/`lockedUntil`, ver auth.ts) — esto lo
 *    complementa contra ataques distribuidos por IP probando muchos emails
 *    distintos, que el lockout por cuenta no frena. El proveedor de celular
 *    (modo Campesino) NO tiene ningún lockout equivalente — para ese, este
 *    módulo es la ÚNICA defensa contra fuerza bruta, no un complemento.
 * 2. Endpoints de IA: capa extra sobre la cuota diaria (`consumirCuotaIA`,
 *    ia-cuota.ts) — esa limita el total del día, esta frena una ráfaga
 *    concentrada en pocos minutos antes de llegar a ese techo.
 *
 * Diseño: si `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` no están
 * configuradas (cuenta Upstash aún no creada, o entorno de desarrollo local
 * sin ellas), `verificarLimite` deja pasar todo y avisa una sola vez por
 * consola — nunca bloquea el desarrollo por falta de credenciales de un
 * servicio de terceros. En producción, sin estas variables no hay rate
 * limiting real: confirmarlas en el checklist de deploy.
 */
export class RateLimitError extends Error {
  status = 429 as const;
  constructor(mensaje: string = MENSAJE_RATE_LIMIT) {
    super(mensaje);
    this.name = "RateLimitError";
  }
}

/**
 * Ventana/máximo por caso de uso — login más estricto que IA porque ahí el
 * costo de un falso negativo (dejar pasar fuerza bruta) es mayor que el de
 * frenar a un usuario legítimo que se equivocó de clave un par de veces; en
 * IA ya hay una cuota diaria detrás, así que esta capa solo necesita frenar
 * ráfagas cortas, no el uso total.
 */
export const CONFIGS_LIMITE = {
  loginPassword: { ventana: "15 m", maximo: 8 },
  loginTelefono: { ventana: "15 m", maximo: 8 },
  ia: { ventana: "1 m", maximo: 12 },
} as const;

export type CasoLimite = keyof typeof CONFIGS_LIMITE;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

let avisoEmitido = false;
const limitadores: Partial<Record<CasoLimite, Ratelimit>> = {};

function obtenerLimitador(caso: CasoLimite): Ratelimit | null {
  if (!redis) {
    if (!avisoEmitido) {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN no configuradas — rate limiting desactivado (dejando pasar todo)."
      );
      avisoEmitido = true;
    }
    return null;
  }
  if (!limitadores[caso]) {
    const { ventana, maximo } = CONFIGS_LIMITE[caso];
    limitadores[caso] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maximo, ventana),
      prefix: `germia:rl:${caso}`,
      analytics: false,
    });
  }
  return limitadores[caso]!;
}

/**
 * Verifica el límite de `caso` para `identificador` y lanza `RateLimitError`
 * si ya se excedió. `identificador` es responsabilidad del caller: IP+email
 * o IP+teléfono para los casos de login (frena por combinación, no solo por
 * IP, para no bloquear a otros usuarios detrás del mismo NAT/router
 * compartido — común en zonas rurales); `userId` para los casos de IA, ya
 * autenticados en ese punto. Llamar ANTES de la operación costosa/sensible,
 * mismo criterio que `consumirCuotaIA`.
 */
export async function verificarLimite(caso: CasoLimite, identificador: string): Promise<void> {
  const limitador = obtenerLimitador(caso);
  if (!limitador) return;

  const { success } = await limitador.limit(identificador);
  if (!success) {
    throw new RateLimitError();
  }
}
