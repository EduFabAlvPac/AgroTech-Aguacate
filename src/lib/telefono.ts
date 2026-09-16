/**
 * Normaliza un número de celular a solo dígitos — usado en los DOS puntos
 * donde el login "modo Campesino" compara un teléfono: al crear la cuenta
 * (campesino-actions.ts) y al hacer login (provider "telefono-campesino" en
 * auth.ts). Sin esto, "300 123 4567" (como lo escribe un asesor, con
 * espacios) y "3001234567" (como lo escribe el campesino, sin espacios) no
 * coinciden en un `findUnique` exacto y el login falla con 401 aunque la
 * cuenta exista — bug real encontrado por el usuario, 2026-08-26.
 */
export function normalizarTelefono(valor: string): string {
  return valor.replace(/\D/g, "");
}
