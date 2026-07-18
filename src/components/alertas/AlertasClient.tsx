"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CloudRain, Thermometer, Wind, Eye, Cloud, CloudLightning, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { AlertaClimatica, TipoAlerta, Severidad } from "@prisma/client";
import Link from "next/link";

const TIPO_ICONS: Record<TipoAlerta, React.ElementType> = {
  HELADA: Thermometer,
  LLUVIA_EXCESIVA: CloudRain,
  SEQUIA: Cloud,
  VIENTO_FUERTE: Wind,
  TEMPERATURA_ALTA: Thermometer,
  GRANIZO: CloudLightning,
  PLAGA: AlertTriangle,
  OTRO: AlertTriangle,
};

const SEVERIDAD_STYLES: Record<Severidad, { badge: string; card: string }> = {
  BAJA: { badge: "badge-neutral", card: "border-[var(--border-subtle)]" },
  MEDIA: { badge: "badge-warning", card: "border-harvest-100 bg-harvest-50" },
  ALTA: { badge: "badge-danger", card: "border-red-200 bg-red-50" },
  CRITICA: { badge: "bg-red-600 text-white", card: "border-red-400 bg-red-50" },
};

const TIPO_LABELS: Record<TipoAlerta, string> = {
  HELADA: "Helada",
  LLUVIA_EXCESIVA: "Lluvia excesiva",
  SEQUIA: "Sequía",
  VIENTO_FUERTE: "Viento fuerte",
  TEMPERATURA_ALTA: "Temperatura alta",
  GRANIZO: "Granizo",
  PLAGA: "Alerta de plaga",
  OTRO: "Otro",
};

interface AlertasClientProps {
  alertas: AlertaClimatica[];
}

export function AlertasClient({ alertas: initial }: AlertasClientProps) {
  const [alertas, setAlertas] = useState(initial);
  const [filter, setFilter] = useState<"todas" | "activas" | "leidas">("todas");

  // Auto-expire alerts where fechaFin < now and still active
  useEffect(() => {
    const now = new Date();
    const expired = alertas.filter(
      (a) => a.activa && a.fechaFin && new Date(a.fechaFin) < now
    );
    if (expired.length === 0) return;

    // Update local state immediately
    setAlertas((prev) =>
      prev.map((a) =>
        expired.some((e) => e.id === a.id) ? { ...a, activa: false } : a
      )
    );

    // Persist to server silently
    expired.forEach((a) => {
      fetch(`/api/alertas/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: false }),
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = alertas.filter((a) => {
    if (filter === "activas") return a.activa && !a.leida;
    if (filter === "leidas") return a.leida;
    return true;
  });

  const noLeidas = alertas.filter((a) => a.activa && !a.leida).length;

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/alertas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leida: true }),
      });
      setAlertas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, leida: true } : a))
      );
    } catch {}
  };

  const markAllRead = async () => {
    setAlertas((prev) => prev.map((a) => ({ ...a, leida: true })));
  };

  const [generating, setGenerating] = useState(false);

  const handleGenerarAlertas = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/alertas/generate", { method: "POST" });
      const { data } = await res.json();
      toast.success(data?.message ?? "Alertas actualizadas");
      // Reload alertas
      const alertasRes = await fetch("/api/alertas");
      const alertasData = await alertasRes.json();
      if (alertasData.data) setAlertas(alertasData.data);
    } catch {
      toast.error("Error al generar alertas");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {["todas", "activas", "leidas"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border ${
                filter === f
                  ? "bg-agro-400 text-white border-agro-400"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-page)]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "activas" && noLeidas > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {noLeidas}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleGenerarAlertas} loading={generating}>
            <RefreshCw size={14} />
            {generating ? "Generando..." : "Generar alertas"}
          </Button>
          {noLeidas > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllRead}>
              <Eye size={14} />
              Marcar todas como leídas
            </Button>
          )}
        </div>
      </div>

      {/* Alert cards */}
      {filtered.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          textAlign: "center",
          gap: 12
        }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: "50%",
            background: "#EAF3DE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28
          }}>
            ✅
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Todo va bien
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, maxWidth: 280, lineHeight: 1.6 }}>
            No hay alertas climáticas activas. Las condiciones son favorables para tu cultivo.
          </p>
          <button
            onClick={handleGenerarAlertas}
            disabled={generating}
            style={{
              marginTop: 8,
              padding: "8px 16px",
              background: "#EAF3DE",
              border: "1px solid #C0DD97",
              borderRadius: 8,
              fontSize: 13,
              color: "#3B6D11",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            Verificar condiciones climáticas
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alerta) => {
            const Icon = TIPO_ICONS[alerta.tipo];
            const styles = SEVERIDAD_STYLES[alerta.severidad];
            const datos = alerta.datos as any;
            const isExpired = !alerta.activa && alerta.fechaFin && new Date(alerta.fechaFin) < new Date();

            return (
              <div
                key={alerta.id}
                className={`card p-5 border ${styles.card} ${alerta.leida ? "opacity-60" : ""} transition-opacity`}
                style={isExpired ? { opacity: 0.5 } : undefined}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 ${
                    alerta.severidad === "ALTA" || alerta.severidad === "CRITICA"
                      ? "bg-red-100"
                      : "bg-harvest-50"
                  }`}>
                    <Icon
                      size={20}
                      className={
                        alerta.severidad === "ALTA" || alerta.severidad === "CRITICA"
                          ? "text-red-500"
                          : "text-harvest-400"
                      }
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                          {alerta.titulo}
                        </span>
                        <span className={`badge text-[10px] ${styles.badge}`}>
                          {alerta.severidad}
                        </span>
                        <span className="badge badge-neutral text-[10px]">
                          {TIPO_LABELS[alerta.tipo]}
                        </span>
                        {isExpired && (
                          <span className="badge text-[10px]" style={{ background: "#F1EFE8", color: "#5F5E5A" }}>
                            Expirada
                          </span>
                        )}
                        {!alerta.leida && alerta.activa && (
                          <span className="badge badge-danger text-[10px]">No leída</span>
                        )}
                      </div>
                    </div>

                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-3">
                      {alerta.descripcion}
                    </p>

                    {/* Weather data */}
                    {datos && (
                      <div className="flex gap-4 text-[12px] text-[var(--text-muted)] mb-3">
                        {datos.tempMin !== undefined && (
                          <span>🌡️ Mín: <strong>{datos.tempMin}°C</strong></span>
                        )}
                        {datos.tempMax !== undefined && (
                          <span>Máx: <strong>{datos.tempMax}°C</strong></span>
                        )}
                        {datos.humedad !== undefined && (
                          <span>💧 Hum: <strong>{datos.humedad}%</strong></span>
                        )}
                        {datos.fuente && (
                          <span className="ml-auto">Fuente: {datos.fuente}</span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {formatDate(alerta.fechaInicio, true)}
                        {alerta.municipio && ` · ${alerta.municipio}`}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/asistente?q=${encodeURIComponent(`Hay una alerta de ${TIPO_LABELS[alerta.tipo]}: ${alerta.titulo}. ¿Qué debo hacer para proteger mis plántulas de aguacate Hass?`)}`}
                          className="text-[12px] text-agro-400 hover:text-agro-600 font-medium"
                        >
                          Consultar al asistente →
                        </Link>
                        {!alerta.leida && (
                          <button
                            onClick={() => markAsRead(alerta.id)}
                            className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            Marcar leída
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info banner */}
      <div className="card p-4 bg-agro-50 border-agro-100">
        <div className="text-[13px] font-medium text-agro-600 mb-1">
          ℹ️ Fuentes de datos climáticos
        </div>
        <p className="text-[12px] text-agro-400 leading-relaxed">
          Las alertas se generan a partir de datos de <strong>IDEAM</strong> (datos.gov.co)
          y <strong>OpenWeather API</strong>. Las notificaciones se actualizan cada 6 horas.
          Puedes configurar los umbrales personalizados en Configuración.
        </p>
      </div>
    </div>
  );
}
