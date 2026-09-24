"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Building2 } from "lucide-react";
import toast from "react-hot-toast";

export interface OrganizacionOption {
  id: string;
  nombre: string;
  tipo: string;
  esTrial: boolean;
  rol: string;
}

interface OrganizacionSelectorProps {
  organizaciones: OrganizacionOption[];
  organizacionActivaId: string | null;
  collapsed: boolean;
}

const ROL_LABELS: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN_FINCA: "Administrador",
  COLABORADOR: "Colaborador",
  INVERSIONISTA: "Inversionista",
  COMPRADOR: "Comprador",
};

/**
 * Selector de organización activa (multi-organización, mismo patrón que
 * FincaSelector). Solo se monta con 2 o más organizaciones (lo decide el
 * Sidebar): con una sola no hay nada que elegir y la barra lateral queda
 * exactamente como antes.
 */
export function OrganizacionSelector({ organizaciones, organizacionActivaId, collapsed }: OrganizacionSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const activa = organizaciones.find((o) => o.id === organizacionActivaId) ?? organizaciones[0];

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const cambiar = async (organizacionId: string) => {
    if (organizacionId === organizacionActivaId) {
      setOpen(false);
      return;
    }
    setCambiando(organizacionId);
    try {
      const res = await fetch("/api/organizaciones/activa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizacionId }),
      });
      if (!res.ok) throw new Error();
      setOpen(false);
      // Recarga completa de la ruta: el contexto (fincas, Equipo, permisos) cambia.
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("No se pudo cambiar de organización");
    } finally {
      setCambiando(null);
    }
  };

  if (!activa) return null;

  return (
    <div className="relative mx-3 mt-3" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left px-3 py-2.5 bg-[var(--surface-page)] rounded-[var(--radius-md)] border border-[var(--border-default)] hover:bg-agro-50 transition-colors ${collapsed ? "flex justify-center" : ""}`}
        title={collapsed ? activa.nombre : undefined}
        aria-label="Cambiar de organización"
      >
        {collapsed ? (
          <Building2 size={16} className="text-agro-600" />
        ) : (
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <div className="text-[11px] text-[var(--text-muted)] font-medium mb-0.5">Organización</div>
              <div className="text-[12px] text-[var(--text-primary)] font-semibold leading-tight truncate">{activa.nombre}</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                {ROL_LABELS[activa.rol] ?? activa.rol}
                {activa.esTrial ? " · Prueba" : ""}
              </div>
            </div>
            <ChevronDown size={14} className={`text-[var(--text-muted)] flex-shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        )}
      </button>

      {open && !collapsed && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-lg z-50 py-1 max-h-[320px] overflow-y-auto">
          {organizaciones.map((o) => (
            <button
              key={o.id}
              onClick={() => cambiar(o.id)}
              disabled={cambiando === o.id}
              className="w-full px-3 py-2 hover:bg-agro-50 transition-colors flex items-center justify-between gap-2 text-left disabled:opacity-50"
            >
              <div className="min-w-0">
                <div className="text-[12px] text-[var(--text-primary)] font-medium truncate">{o.nombre}</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">
                  {o.tipo === "INDIVIDUAL" ? "Individual" : o.tipo === "COOPERATIVA" ? "Cooperativa" : o.tipo} · {ROL_LABELS[o.rol] ?? o.rol}
                  {o.esTrial ? " · Prueba" : ""}
                </div>
              </div>
              {o.id === activa.id && <Check size={14} className="text-agro-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
