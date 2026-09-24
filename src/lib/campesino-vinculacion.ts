/**
 * Login Campesino seguro — núcleo puro (sin BD, sin sesión). El dueño genera
 * un código de 6 dígitos de un solo uso para que un campesino vincule su
 * celular; ese celular queda como "dispositivo de confianza" (cookie
 * httpOnly). Ver prisma/schema.prisma (CodigoVinculacion/DispositivoConfianza)
 * y docs/ADR-011-notas-de-implementacion.md.
 *
 * El código es corto a propósito (lo dicta el dueño por WhatsApp o llamada y
 * lo teclea un campesino): 6 dígitos = 1.000.000 combinaciones. La defensa
 * real contra fuerza bruta NO es el hash sino el tope de intentos fallidos por
 * código (MAX_INTENTOS) + el rate limit por IP+teléfono; el HMAC con el
 * secreto del servidor solo evita que alguien con una copia de la BD pueda
 * recuperar un código vigente sin conocer ese secreto.
 */
import crypto from "node:crypto";

export const COOKIE_DISPOSITIVO = "germia_dispositivo";
export const CODIGO_VIGENCIA_HORAS = 24;
export const DISPOSITIVO_VIGENCIA_DIAS = 180;
export const MAX_INTENTOS = 5;

/** 6 dígitos con ceros a la izquierda ("004821"). `randomInt` es uniforme
 * (sin sesgo de módulo). */
export function generarCodigoVinculacion(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Quita lo que un campesino teclea "de más" (espacios, guiones) — el código
 * a veces llega escrito "004 821" en un mensaje. */
export function normalizarCodigo(codigo: string): string {
  return codigo.replace(/\D/g, "");
}

function secreto(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET no está configurada — no se pueden verificar códigos de vinculación.");
  return s;
}

/** HMAC-SHA256(NEXTAUTH_SECRET, userId:codigo) en hex. Ligado al `userId`: el
 * mismo código "123456" produce hashes distintos en dos cuentas. */
export function hashCodigoVinculacion(userId: string, codigo: string): string {
  return crypto.createHmac("sha256", secreto()).update(`${userId}:${normalizarCodigo(codigo)}`).digest("hex");
}

/** Comparación en tiempo constante de dos hashes hex. */
export function codigoCoincide(hashGuardado: string, hashCalculado: string): boolean {
  const a = Buffer.from(hashGuardado, "hex");
  const b = Buffer.from(hashCalculado, "hex");
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

/** Valor de la cookie `germia_dispositivo` dentro de un header `Cookie:`
 * completo (`a=1; germia_dispositivo=xyz; b=2`), o null si no viene. */
export function leerCookieDispositivo(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const parte of cookieHeader.split(";")) {
    const i = parte.indexOf("=");
    if (i === -1) continue;
    if (parte.slice(0, i).trim() === COOKIE_DISPOSITIVO) {
      const valor = parte.slice(i + 1).trim();
      return valor || null;
    }
  }
  return null;
}
