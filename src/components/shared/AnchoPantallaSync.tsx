"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ANCHO_PANTALLA_COOKIE, BREAKPOINT_MOVIL_PX, parsearAnchoCookie, type AnchoBucket } from "@/lib/vista-preferida";

function leerCookieActual(): AnchoBucket | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${ANCHO_PANTALLA_COOKIE}=([^;]*)`));
  return parsearAnchoCookie(match ? decodeURIComponent(match[1]) : undefined);
}

function escribirCookie(valor: AnchoBucket) {
  // 1 año — se corrige sola cuando cambie realmente (nuevo dispositivo,
  // rotación, etc.), no necesita expirar seguido.
  document.cookie = `${ANCHO_PANTALLA_COOKIE}=${valor}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * Monta una sola vez en el layout raíz (Fase 3, ADR-006). Al cargar
 * cualquier página, mide el ancho real del viewport y lo compara contra la
 * cookie que el servidor usó para decidir modo simple/completo en "Automático":
 *
 * - Si coinciden (el caso común, visitas recurrentes): no hace nada — cero
 *   parpadeo, el servidor ya acertó desde el primer byte.
 * - Si no coinciden (primera visita real de un dispositivo, o cambio de
 *   tamaño de pantalla desde la última visita): actualiza la cookie y pide
 *   UN router.refresh() para que el servidor vuelva a renderizar con el
 *   dato correcto. Es la única fuente de parpadeo posible, y es acotada
 *   (no se repite en visitas siguientes).
 *
 * Deliberadamente solo mide al montar, no en cada resize — "Automático"
 * decide al cargar la página, no reacciona en vivo a que alguien
 * redimensione la ventana a mitad de una tarea (evita remontar
 * componentes con estado a medio llenar un formulario, por ejemplo).
 */
export function AnchoPantallaSync() {
  const router = useRouter();

  useEffect(() => {
    const bucketReal: AnchoBucket = window.innerWidth < BREAKPOINT_MOVIL_PX ? "movil" : "escritorio";
    const bucketCookie = leerCookieActual();

    if (bucketCookie !== bucketReal) {
      escribirCookie(bucketReal);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
