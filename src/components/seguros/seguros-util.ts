/**
 * Las fechas de póliza y de evento se guardan como día calendario (UTC
 * medianoche, lo que envía <input type="date">). Se formatean SIEMPRE en UTC:
 * en hora de Colombia (UTC-5) un 1 de enero a las 00:00Z se vería "31 dic", y
 * servidor y navegador mostrarían textos distintos (error de hidratación).
 */
export function fmtFecha(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function isoDia(d: Date | string | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export function numOrNull(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
