"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GRADIENTE_SECCION } from "@/lib/campesino-gradientes";

interface ModoCampesinoHeaderProps {
  nombre: string;
}

/**
 * Header del modo Campesino — más simple que ModoSimpleHeader a propósito
 * (sin campana de alertas: el cierre de producto es "solo 4 funciones +
 * perfil", ver plan). En /campesino muestra logo+saludo; en cualquier otra
 * pantalla, flecha para volver — mismo patrón que ModoSimpleHeader.
 *
 * En la práctica hoy solo lo montan Mis cultivos, Notificaciones y Mi
 * perfil (el resto tiene header propio, ver PANTALLAS_HEADER_PROPIO en
 * ModoCampesinoShell.tsx) — por pedido del usuario (2026-08-30) lleva el
 * verde de marca de fondo, igual que el resto de encabezados de sección.
 */
export function ModoCampesinoHeader({ nombre }: ModoCampesinoHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const enInicio = pathname === "/campesino";

  return (
    <header
      className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
      style={{ background: GRADIENTE_SECCION.marca }}
    >
      {enInicio ? (
        <>
          <img src="/images/logos/germia-lockup-login.png" alt="GermIA" style={{ height: 24 }} />
          <span className="text-[13px] text-white/90">Hola, {nombre}</span>
        </>
      ) : (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Volver"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors -ml-1"
        >
          <ArrowLeft size={19} className="text-white" />
        </button>
      )}
      <Link href="/campesino" className="ml-auto text-[13px] font-medium text-white">
        Inicio
      </Link>
    </header>
  );
}
