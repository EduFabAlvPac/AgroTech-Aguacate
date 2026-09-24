/**
 * Texto corto y legible a partir de un User-Agent ("Chrome en Mac") para la
 * lista de sesiones de Configuración → Seguridad. Se guarda el User-Agent
 * tal cual (Sesion.userAgent, ADR-011 Sprint 1) sin parsearlo; esto solo lo
 * traduce al mostrarlo. Regex simples a propósito: alcanza para reconocer el
 * dispositivo propio, no es un parser exhaustivo.
 */
export function describirDispositivo(userAgent: string | null | undefined): string {
  if (!userAgent) return "Dispositivo desconocido";
  const ua = userAgent;

  // Orden importa: Edge/Opera incluyen "Chrome" en su UA; Chrome en iOS es "CriOS".
  const navegador =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Firefox\/|FxiOS/.test(ua) ? "Firefox"
    : /Chrome\/|CriOS/.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : null;

  // iPhone/iPad antes que Mac: el UA de iOS también dice "like Mac OS X".
  const sistema =
    /iPhone/.test(ua) ? "iPhone"
    : /iPad/.test(ua) ? "iPad"
    : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "Mac"
    : /Linux/.test(ua) ? "Linux"
    : null;

  if (navegador && sistema) return `${navegador} en ${sistema}`;
  return navegador ?? sistema ?? "Dispositivo desconocido";
}
