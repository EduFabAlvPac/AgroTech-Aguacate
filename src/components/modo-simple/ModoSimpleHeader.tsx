"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Bell } from "lucide-react";

interface ModoSimpleHeaderProps {
  nombre: string;
  inicial: string;
  alertasNoLeidas: number;
  onAlertasClick: () => void;
}

// Fase 3 de ADR-006 — rutas reales (antes /modo-simple/*, ruta temporal ya
// retirada). Perfil ahora es lo que bifurca /dashboard/configuracion
// cuando la preferencia resuelve a "simple" — no existe /dashboard/perfil
// como ruta propia.
const RUTA_INICIO = "/dashboard";
const RUTA_PERFIL = "/dashboard/configuracion";

/**
 * Header compartido de modo simple — igual en las 6 pantallas del mockup:
 * logo + "GermIA" + "Hola, {nombre}" a la izquierda, avatar con inicial a
 * la derecha. En Inicio el logo se muestra tal cual; en el resto de
 * pantallas (llegadas desde Inicio vía la nav inferior) se reemplaza por
 * una flecha "volver" — mismo patrón visual que las 6 capturas de
 * referencia (todas menos Inicio muestran "<").
 */
export function ModoSimpleHeader({ nombre, inicial, alertasNoLeidas, onAlertasClick }: ModoSimpleHeaderProps) {
  const pathname = usePathname();
  const esInicio = pathname === RUTA_INICIO;

  return (
    <header
      className="flex items-center justify-between px-4 py-3 flex-shrink-0"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {esInicio ? (
          <img
            src="/icons/icon-96.png"
            alt="GermIA"
            className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <Link
            href={RUTA_INICIO as any}
            aria-label="Volver a Inicio"
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-[var(--surface-page)] transition-colors"
          >
            <ChevronLeft size={20} style={{ color: "var(--text-primary)" }} />
          </Link>
        )}
        <div className="min-w-0">
          <div className="text-[15px] font-bold leading-tight truncate" style={{ color: "var(--text-primary)" }}>
            GermIA
          </div>
          <div className="text-[12px] leading-tight truncate" style={{ color: "var(--text-muted)" }}>
            Hola, {nombre}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Campana de alertas — visible en las 6 pantallas de modo simple
            (ajuste pedido tras el checkpoint). Abre AlertasPanel (bottom-
            sheet dentro de modo simple) en vez de navegar a
            /dashboard/alertas — esa ruta es la interfaz de escritorio, el
            usuario la probó y no encajaba dentro del flujo móvil. */}
        <button
          type="button"
          onClick={onAlertasClick}
          aria-label={alertasNoLeidas > 0 ? `Alertas (${alertasNoLeidas} sin leer)` : "Alertas"}
          className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--surface-page)] transition-colors"
        >
          <Bell size={18} style={{ color: "var(--text-secondary)" }} />
          {alertasNoLeidas > 0 && (
            <span
              className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
              style={{ background: "var(--color-negative)" }}
            >
              {alertasNoLeidas > 9 ? "9+" : alertasNoLeidas}
            </span>
          )}
        </button>

        <Link
          href={RUTA_PERFIL as any}
          aria-label="Ver perfil"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-[14px]"
          style={{ background: "var(--color-brand-bg)", color: "var(--color-brand-dark)" }}
        >
          {inicial}
        </Link>
      </div>
    </header>
  );
}
