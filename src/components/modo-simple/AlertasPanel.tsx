"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle, Info, Check } from "lucide-react";
import toast from "react-hot-toast";
import type { AlertaClimatica } from "@prisma/client";
import { marcarLeida } from "@/app/(dashboard)/dashboard/alertas/alerta-actions";

interface AlertasPanelProps {
  alertas: AlertaClimatica[];
  onClose: () => void;
}

const SEVERIDAD_ICON: Record<string, { icon: typeof AlertTriangle; bg: string; color: string }> = {
  BAJA: { icon: Info, bg: "var(--color-info-bg)", color: "var(--color-info)" },
  MEDIA: { icon: AlertTriangle, bg: "var(--color-amber-bg)", color: "#8A5E20" },
  ALTA: { icon: AlertTriangle, bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
  CRITICA: { icon: AlertTriangle, bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
};

/**
 * Panel de alertas de modo simple — abierto desde la campana del header
 * (ModoSimpleShell). Reemplaza el enlace a /dashboard/alertas (modo
 * completo) tras feedback directo del usuario: esa vista de escritorio no
 * encajaba en el flujo móvil. Reutiliza marcarLeida (Fase 1,
 * alerta-actions.ts) — mismo patrón visual de tarjeta por severidad que ya
 * usa InicioSimpleClient.tsx (duplicado aquí, no importado, para no acoplar
 * un componente de pantalla con uno de shell).
 */
export function AlertasPanel({ alertas, onClose }: AlertasPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [marcandoId, setMarcandoId] = useState<string | null>(null);

  const activas = alertas.filter((a) => a.activa);

  const marcar = (id: string) => {
    setMarcandoId(id);
    startTransition(async () => {
      const result = await marcarLeida(id, {});
      setMarcandoId(null);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-5 space-y-3"
        style={{ maxWidth: 540, background: "white", maxHeight: "80vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>Alertas</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={20} style={{ color: "var(--text-muted)" }} /></button>
        </div>

        {activas.length === 0 ? (
          <div className="rounded-2xl px-4 py-8 text-center" style={{ background: "var(--surface-page)" }}>
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>✅ Sin alertas activas por ahora.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {activas.map((a) => {
              const cfg = SEVERIDAD_ICON[a.severidad] ?? SEVERIDAD_ICON.MEDIA;
              const Icon = cfg.icon;
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 px-3.5 py-3 rounded-xl"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }}
                >
                  <Icon size={16} style={{ color: cfg.color }} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{a.titulo}</div>
                    <div className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{a.descripcion}</div>
                    {!a.leida && (
                      <button
                        onClick={() => marcar(a.id)}
                        disabled={marcandoId === a.id}
                        className="text-[11px] font-semibold mt-1.5 flex items-center gap-1"
                        style={{ color: cfg.color }}
                      >
                        <Check size={12} /> {marcandoId === a.id ? "Marcando..." : "Marcar leída"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
