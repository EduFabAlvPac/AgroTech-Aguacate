/**
 * Construcción del CSV de Auditoría (ADR-011 Sprint 5) — puro, sin BD.
 * Separado de auditoria-actions.ts a propósito: un archivo "use server" en
 * Next.js solo puede exportar funciones async (cada export se vuelve una
 * Server Action) — esta es una función síncrona, no puede vivir ahí.
 */
function celdaCSV(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : typeof valor === "object" ? JSON.stringify(valor) : String(valor);
  // Siempre entre comillas — más simple que decidir caso por caso si hace
  // falta, y sigue siendo un CSV válido (Excel/Sheets lo abren bien).
  return `"${texto.replace(/"/g, '""')}"`;
}

export interface FilaAuditoriaCSV {
  createdAt: Date;
  actorEmail: string | null;
  accion: string;
  resultado: string;
  detalle: unknown;
}

export function filasACSV(filas: FilaAuditoriaCSV[]): string {
  const encabezado = ["Fecha", "Quién", "Acción", "Resultado", "Detalle"].map(celdaCSV).join(",");
  const lineas = filas.map((f) =>
    [f.createdAt.toISOString(), f.actorEmail ?? "", f.accion, f.resultado, f.detalle].map(celdaCSV).join(",")
  );
  return [encabezado, ...lineas].join("\r\n");
}
