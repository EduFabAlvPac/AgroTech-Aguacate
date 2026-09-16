/**
 * Gradientes de encabezado por sección — el mismo color que la tarjeta de
 * cada función en el home (ver COMPANERAS en campesino/page.tsx), para que
 * "el encabezado de cada sección tenga el color de la tarjeta que lo
 * representa" (hallazgo del usuario, 2026-08-29).
 *
 * Vive en un archivo plano (sin "use client") a propósito: estaba antes
 * exportado desde HeaderSeccion.tsx ("use client"), y una constante
 * importada desde un módulo de cliente hacia un Server Component (las
 * páginas de Tienda/Precios/Clima) llegaba como `undefined` en tiempo de
 * render — el header se veía en blanco (texto blanco sobre fondo blanco,
 * invisible). Bug real encontrado en el primer QA de esta pantalla.
 */
export const GRADIENTE_SECCION = {
  tienda: "linear-gradient(135deg, #F0932B 0%, #D97706 100%)",
  precios: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
  clima: "linear-gradient(135deg, #3B82C4 0%, #1D5A96 100%)",
  // Verde de marca — mismo gradiente que ya usaba el header propio de
  // Diagnóstico (VERDE_HEADER en DiagnosticoCampesinoClient.tsx). Se repite
  // aquí (no se importa de allá) porque ese archivo es "use client" y no
  // debe ser el origen de una constante consumida desde Server Components
  // — ver comentario de arriba sobre el bug real que causó justo eso.
  marca: "linear-gradient(135deg, #4FA987 0%, #2F6E52 100%)",
} as const;
