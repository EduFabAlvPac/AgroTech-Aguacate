/**
 * Contrato de mensajes de error entre auth.ts/rate-limit.ts (servidor) y los
 * formularios de login (cliente) — vive separado de esos archivos a
 * propósito: importan `@upstash/ratelimit`/`@upstash/redis`/Prisma (pensado
 * para el server), así que un componente de cliente que solo necesita estas
 * constantes no debe arrastrar esas dependencias a su bundle. Mismo criterio
 * ya usado en campesino-gradientes.ts para el caso inverso (constante de
 * cliente consumida desde un Server Component).
 *
 * `signIn()` de next-auth solo expone el `.message` de lo que `authorize()`
 * lanza, no un código de error propio — estos strings son el contrato para
 * que el formulario distinga "demasiados intentos"/"correo sin verificar"
 * del genérico "credenciales inválidas" (ver LoginEstandarForm.tsx).
 */
export const MENSAJE_RATE_LIMIT = "Demasiados intentos seguidos. Espera un momento y vuelve a intentar.";
export const MENSAJE_EMAIL_NO_VERIFICADO = "Verifica tu correo antes de entrar. Revisa tu bandeja de entrada.";
