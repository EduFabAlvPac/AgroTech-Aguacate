"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, ChevronLeft } from "lucide-react";

interface ModoSimpleHeaderProps {
  nombre: string;
  inicial: string;
}

const RUTA_INICIO = "/modo-simple/inicio";

/**
 * Header compartido de modo simple — igual en las 6 pantallas del mockup:
 * logo + "AgroTech" + "Hola, {nombre}" a la izquierda, avatar con inicial a
 * la derecha. En Inicio el logo se muestra tal cual; en el resto de
 * pantallas (llegadas desde Inicio vía la nav inferior) se reemplaza por
 * una flecha "volver" — mismo patrón visual que las 6 capturas de
 * referencia (todas menos Inicio muestran "<").
 */
export function ModoSimpleHeader({ nombre, inicial }: ModoSimpleHeaderProps) {
  const pathname = usePathname();
  const esInicio = pathname === RUTA_INICIO;

  return (
    <header
      className="flex items-center justify-between px-4 py-3 flex-shrink-0"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {esInicio ? (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-brand)" }}
          >
            <Leaf size={16} color="white" />
          </div>
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
            AgroTech
          </div>
          <div className="text-[12px] leading-tight truncate" style={{ color: "var(--text-muted)" }}>
            Hola, {nombre}
          </div>
        </div>
      </div>

      <Link
        href={"/modo-simple/perfil" as any}
        aria-label="Ver perfil"
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-[14px]"
        style={{ background: "var(--color-brand-bg)", color: "var(--color-brand-dark)" }}
      >
        {inicial}
      </Link>
    </header>
  );
}
