/**
 * Contrato de mensaje entre rate-limit.ts (servidor) y los formularios de
 * login (cliente) — vive separado de rate-limit.ts a propósito: ese archivo
 * importa `@upstash/ratelimit`/`@upstash/redis` (pensado para el server),
 * así que un componente de cliente que solo necesita esta constante no debe
 * arrastrar esas dependencias a su bundle. Mismo criterio ya usado en
 * campesino-gradientes.ts para el caso inverso (constante de cliente
 * consumida desde un Server Component).
 */
export const MENSAJE_RATE_LIMIT = "Demasiados intentos seguidos. Espera un momento y vuelve a intentar.";
