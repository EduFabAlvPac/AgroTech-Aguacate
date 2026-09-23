/**
 * MFA por TOTP (ADR-011 Sprint 6) — núcleo puro (sin BD, sin sesión). El
 * schema ya traía `User.mfaHabilitado`/`mfaSecret`/`mfaBackupCodes` desde el
 * PR #50, sin usar; este archivo es la primera pieza real que los llena.
 *
 * Encriptación de `mfaSecret`: AES-256-GCM con el `crypto` nativo de Node
 * (mismo módulo que ya usa audit.ts/tokens.ts, sin dependencia nueva para
 * esto) — a diferencia de un token de un solo uso (hasheado, nunca se
 * necesita recuperar el valor original), el secreto TOTP hay que poder
 * LEERLO de vuelta en cada login para generar el código esperado y
 * compararlo, así que no puede guardarse hasheado. `MFA_ENCRYPTION_KEY` es
 * tan crítica como `NEXTAUTH_SECRET`: perderla o rotarla deja sin poder
 * validar el login de cualquier cuenta que ya tenga MFA activo.
 *
 * Códigos de respaldo: sí se guardan hasheados (mismo patrón sha256 que
 * `hashToken()` en tokens.ts) — son de un solo uso, nunca hace falta
 * recuperarlos, solo compararlos.
 */
import crypto from "node:crypto";
import { generateSecret, generateURI, verify as verificarTOTP } from "otplib";

const ALGORITMO = "aes-256-gcm";
const IV_BYTES = 12; // recomendado para GCM

function claveEncriptacion(): Buffer {
  const b64 = process.env.MFA_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error(
      "MFA_ENCRYPTION_KEY no está configurada — no se puede activar/verificar MFA en este entorno."
    );
  }
  const clave = Buffer.from(b64, "base64");
  if (clave.length !== 32) {
    throw new Error("MFA_ENCRYPTION_KEY debe decodificar a 32 bytes (generar con `openssl rand -base64 32`).");
  }
  return clave;
}

/** `iv:authTag:ciphertext`, todo en hex — formato guardado tal cual en
 * `User.mfaSecret`. */
export function encriptarSecreto(secreto: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITMO, claveEncriptacion(), iv);
  const cifrado = Buffer.concat([cipher.update(secreto, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${cifrado.toString("hex")}`;
}

export function desencriptarSecreto(valor: string): string {
  const partes = valor.split(":");
  if (partes.length !== 3) throw new Error("Formato de mfaSecret inválido");
  const [ivHex, authTagHex, cifradoHex] = partes;
  const decipher = crypto.createDecipheriv(ALGORITMO, claveEncriptacion(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plano = Buffer.concat([decipher.update(Buffer.from(cifradoHex, "hex")), decipher.final()]);
  return plano.toString("utf8");
}

// ─── TOTP ────────────────────────────────────────────────────────────────
// otplib 13 reescribió la librería: ya no existe el singleton clásico
// `authenticator` de las versiones 10-12 (lo que sugería la documentación
// vieja) — la API actual es un set de funciones (`generateSecret`,
// `generateURI`, `verify`), esta última async. Confirmado leyendo los
// `.d.ts` instalados, no la memoria de una versión anterior.

export function generarSecretoTOTP(): string {
  return generateSecret();
}

/** URI `otpauth://` para el QR — "GermIA" como emisor, el correo del usuario
 * como cuenta (así el authenticator del usuario lo etiqueta reconocible si
 * ya tiene otras cuentas ahí). */
export function generarUriQR(secreto: string, email: string): string {
  return generateURI({ issuer: "GermIA", label: email, secret: secreto });
}

export async function verificarCodigoTOTP(secreto: string, codigo: string): Promise<boolean> {
  try {
    const resultado = await verificarTOTP({ secret: secreto, token: codigo.trim() });
    return resultado.valid;
  } catch {
    return false; // código con formato inválido (ej. no numérico) — no es un código válido, no una excepción real
  }
}

// ─── Códigos de respaldo ─────────────────────────────────────────────────

/** Formato `XXXX-XXXX` (8 caracteres alfanuméricos en mayúscula, sin 0/O/1/I
 * para evitar confusión al transcribirlos a mano) — legible y suficiente
 * entropía para un código de un solo uso protegido además por el límite de
 * intentos del login. */
const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generarUnCodigo(): string {
  const bytes = crypto.randomBytes(8);
  const chars = Array.from(bytes, (b) => ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

export function generarCodigosRespaldo(cantidad = 10): string[] {
  return Array.from({ length: cantidad }, generarUnCodigo);
}

function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

export function hashCodigoRespaldo(codigo: string): string {
  return crypto.createHash("sha256").update(normalizarCodigo(codigo)).digest("hex");
}

/**
 * Función pura: compara `codigoIngresado` contra los hashes guardados: si
 * coincide con alguno, devuelve `valido: true` y el array SIN ese hash (uso
 * único — el caller debe persistir `codigosRestantes` para que no vuelva a
 * servir). Si no coincide con ninguno, devuelve el array intacto.
 */
export function verificarYConsumirCodigoRespaldo(
  codigosHasheados: string[],
  codigoIngresado: string
): { valido: boolean; codigosRestantes: string[] } {
  const hash = hashCodigoRespaldo(codigoIngresado);
  const index = codigosHasheados.indexOf(hash);
  if (index === -1) return { valido: false, codigosRestantes: codigosHasheados };
  const codigosRestantes = [...codigosHasheados.slice(0, index), ...codigosHasheados.slice(index + 1)];
  return { valido: true, codigosRestantes };
}
