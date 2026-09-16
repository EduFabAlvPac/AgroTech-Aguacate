"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { guardarUbicacionCampesino } from "@/app/(campesino)/campesino/clima/ubicacion-actions";

const CLAVE_SESSION_STORAGE = "germia-ubicacion-solicitada";

/**
 * Pide la ubicación real del navegador UNA vez por sesión de pestaña (no en
 * cada navegación — la ubicación de una finca no cambia día a día) y la
 * guarda para que Clima y consejos (y la franja del home) usen el clima de
 * donde el campesino de verdad está. Montado en el layout de /campesino
 * para que corra sin importar por qué pantalla entre primero.
 *
 * No renderiza nada — sin permiso, con error, o si el navegador no soporta
 * geolocalización, no pasa nada visible: se queda con el default de
 * src/lib/weather.ts, exactamente como funcionaba antes de esto.
 */
export function UbicacionCampesinoClient() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (sessionStorage.getItem(CLAVE_SESSION_STORAGE)) return;
    sessionStorage.setItem(CLAVE_SESSION_STORAGE, "1");

    navigator.geolocation.getCurrentPosition(
      async (posicion) => {
        const result = await guardarUbicacionCampesino(posicion.coords.latitude, posicion.coords.longitude);
        if (result.ok) router.refresh();
      },
      () => {
        // Permiso denegado o error — silencioso a propósito, no interrumpe
        // al usuario con un toast por algo que no le compete resolver.
      },
      { timeout: 8000, maximumAge: 60 * 60 * 1000 }
    );
  }, [router]);

  return null;
}
