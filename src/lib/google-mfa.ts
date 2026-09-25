/**
 * MFA en el login con Google (ADR-011 Sprint 6, hueco que dejó la 1.ª entrega).
 *
 * El flujo OAuth de Google no puede pedir un código a mitad de camino, así
 * que, si la cuenta tiene MFA activo, el callback `signIn` de NextAuth NO deja
 * entrar: redirige a `/login?mfa=google&p=<prueba>`. La "prueba" es un token
 * firmado, de vida corta, que solo demuestra "Google acaba de autenticar a
 * ESTE usuario" — no da acceso por sí sola. La pantalla pide el código de
 * verificación y se canjea, junto con la prueba, en el provider de
 * credenciales `google-mfa` (src/lib/auth.ts), que verifica el código y recién
 * ahí crea la sesión. Sin cookies (no hay que confiar en que el callback pueda
 * fijarlas): la prueba viaja en la URL y solo sirve junto con el código.
 *
 * Firma HMAC-SHA256 con NEXTAUTH_SECRET, comparación en tiempo constante.
 */
import crypto from "node:crypto";

export const PRUEBA_GOOGLE_VIGENCIA_MS = 5 * 60 * 1000;

function secreto(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET no está configurada");
  return s;
}

function firma(payload: string): string {
  return crypto.createHmac("sha256", secreto()).update(`google-mfa:${payload}`).digest("base64url");
}

/** `<base64url({u, exp})>.<firma>` */
export function firmarPruebaGoogle(userId: string, ahora: number = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, exp: ahora + PRUEBA_GOOGLE_VIGENCIA_MS })).toString("base64url");
  return `${payload}.${firma(payload)}`;
}

/** userId si la prueba es auténtica y sigue vigente; null en cualquier otro caso. */
export function verificarPruebaGoogle(prueba: string | null | undefined, ahora: number = Date.now()): string | null {
  if (!prueba) return null;
  const [payload, sig] = prueba.split(".");
  if (!payload || !sig) return null;
  const esperada = Buffer.from(firma(payload));
  const recibida = Buffer.from(sig);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof u !== "string" || typeof exp !== "number" || exp < ahora) return null;
    return u;
  } catch {
    return null;
  }
}
