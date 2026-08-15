"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, ChevronRight, Bell, Check, AlertTriangle, Info, CloudSun } from "lucide-react";
import toast from "react-hot-toast";
import { formatCOPFull } from "@/lib/utils";
import type { FincaResumen } from "@/lib/data/fincas";
import type { DashboardKpis } from "@/lib/data/dashboard";
import type { AlertaClimatica } from "@prisma/client";

interface InicioSimpleClientProps {
  fincas: FincaResumen[];
  fincaActivaId: string | null;
  fincaSinUbicacion: boolean;
  totalCultivos: number;
  kpis: DashboardKpis;
  alertas: AlertaClimatica[];
}

interface WeatherCurrent {
  temp: number;
  description: string;
  icon: string;
}

// Cartas de referencia — contenido informativo estático (no viene de datos
// del usuario ni de ningún lib/data; son solo tarjetas ilustrativas del
// mockup). Fotos reales (Wikimedia Commons, CC0/dominio público/CC BY-SA —
// ver public/images/cultivos/CREDITOS.md), autoalojadas en /public — sin
// llamadas a servicios externos en producción. Reemplaza el degradado+emoji
// que tenía la primera versión, por pedido explícito del usuario.
const CULTIVOS_REFERENCIA = [
  { nombre: "Café", hint: "Sombra · 1000–2000 m", foto: "/images/cultivos/cafe.jpg", creditoVisible: false },
  { nombre: "Cacao", hint: "Agroforestal · sombra", foto: "/images/cultivos/cacao.jpg", creditoVisible: true },
  { nombre: "Aguacate", hint: "1500–2200 msnm", foto: "/images/cultivos/aguacate.jpg", creditoVisible: false },
  { nombre: "Limón", hint: "Cítrico · clima cálido", foto: "/images/cultivos/limon.jpg", creditoVisible: false },
  { nombre: "Banano", hint: "Tropical · húmedo", foto: "/images/cultivos/banano.jpg", creditoVisible: true },
];

const SEVERIDAD_ICON: Record<string, { icon: typeof AlertTriangle; bg: string; color: string }> = {
  BAJA: { icon: Info, bg: "var(--color-info-bg)", color: "var(--color-info)" },
  MEDIA: { icon: AlertTriangle, bg: "var(--color-amber-bg)", color: "#8A5E20" },
  ALTA: { icon: AlertTriangle, bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
  CRITICA: { icon: AlertTriangle, bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
};

export function InicioSimpleClient({
  fincas,
  fincaActivaId,
  fincaSinUbicacion,
  totalCultivos,
  kpis,
  alertas,
}: InicioSimpleClientProps) {
  const router = useRouter();
  const [cambiandoFinca, setCambiandoFinca] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherCurrent | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Mismo fetch de clima que ya usa el dashboard de modo completo
  // (/api/weather?type=current) — decisión confirmada con el usuario:
  // reutilizar, no dejar un estado de error fijo.
  useEffect(() => {
    let cancelado = false;
    fetch("/api/weather?type=current")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(({ data }) => { if (!cancelado) setWeather(data); })
      .catch(() => { if (!cancelado) setWeatherError(true); })
      .finally(() => { if (!cancelado) setWeatherLoading(false); });
    return () => { cancelado = true; };
  }, []);

  // Mismo endpoint que ya usa FincaSelector.tsx (sidebar de escritorio) —
  // ruta API existente, no una nueva.
  const cambiarFinca = async (fincaId: string) => {
    if (fincaId === fincaActivaId) return;
    setCambiandoFinca(fincaId);
    try {
      const res = await fetch("/api/fincas/activa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fincaId }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("No se pudo cambiar de finca");
    } finally {
      setCambiandoFinca(null);
    }
  };

  const [alertasVistas, setAlertasVistas] = useState<Set<string>>(new Set());
  const alertasVisibles = alertas.filter((a) => !alertasVistas.has(a.id)).slice(0, 5);

  return (
    <div className="px-4 py-4 space-y-5">
      {/* ── Selector de finca (pills) ── */}
      {fincas.length === 0 ? (
        <Link
          href={"/dashboard/fincas" as any}
          className="block px-4 py-3 rounded-full text-center text-[13px] font-semibold"
          style={{ background: "var(--color-brand)", color: "white" }}
        >
          + Registra tu primera finca
        </Link>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {fincas.map((f) => {
            const activa = f.id === fincaActivaId;
            return (
              <button
                key={f.id}
                onClick={() => cambiarFinca(f.id)}
                disabled={cambiandoFinca === f.id}
                className="px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap flex-shrink-0 transition-colors disabled:opacity-60"
                style={
                  activa
                    ? { background: "var(--color-brand)", color: "white" }
                    : { background: "white", color: "var(--text-primary)", border: "1px solid var(--border-default)" }
                }
              >
                {f.nombre}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Clima ── */}
      <div className="rounded-2xl px-4 py-3.5 text-center" style={{ background: "var(--surface-page)" }}>
        {weatherLoading ? (
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>Cargando clima...</span>
        ) : weatherError || !weather ? (
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            No se pudo cargar el clima ahora. Revisa tu conexión e intenta más tarde.
          </span>
        ) : (
          <div className="flex items-center justify-center gap-2.5">
            <CloudSun size={22} style={{ color: "var(--color-brand)" }} />
            <span className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{weather.temp}°C</span>
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>{weather.description}</span>
          </div>
        )}
      </div>

      {/* ── CTA revisar planta ── */}
      <Link
        href={"/dashboard/asistente" as any}
        className="flex items-center gap-4 px-4 py-4 rounded-2xl"
        style={{ background: "linear-gradient(135deg, #E0A94E, #D6A159)" }}
      >
        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.25)" }}>
          <Camera size={20} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-white">Revisar una planta</div>
          <div className="text-[12px] text-white" style={{ opacity: 0.9 }}>Toma una foto y detecta plagas o enfermedades</div>
        </div>
        <ChevronRight size={18} color="white" />
      </Link>

      {/* ── Cultivos de referencia ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Cultivos de referencia</h2>
          <span className="text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>Desliza →</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {CULTIVOS_REFERENCIA.map((c) => (
            <div key={c.nombre} className="flex-shrink-0 rounded-2xl overflow-hidden" style={{ width: 150, border: "1px solid var(--border-subtle)" }}>
              <div className="h-24" style={{ background: "var(--surface-page)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- mismo patrón que el resto de modo simple (sin next/image en el proyecto) */}
                <img src={c.foto} alt={c.nombre} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="px-3 py-2.5">
                <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{c.nombre}</div>
                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{c.hint}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Crédito visible — Cacao y Banano son CC BY-SA (Wikimedia Commons),
            requieren atribución (ver public/images/cultivos/CREDITOS.md).
            Café/Aguacate/Limón son CC0/dominio público, no la necesitan. */}
        {CULTIVOS_REFERENCIA.some((c) => c.creditoVisible) && (
          <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>
            Fotos: Wikimedia Commons — cacao (ChiK, CC BY-SA 4.0), banano (Evan-Amos, CC BY-SA 3.0)
          </p>
        )}
      </div>

      {/* ── Alertas ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Bell size={16} style={{ color: "var(--text-primary)" }} />
            <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Alertas</h2>
          </div>
          <span className="text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
            {alertasVisibles.length} activa{alertasVisibles.length !== 1 ? "s" : ""}
          </span>
        </div>

        {alertasVisibles.length === 0 && !fincaSinUbicacion ? (
          <div className="rounded-2xl px-4 py-6 text-center" style={{ background: "var(--surface-page)" }}>
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>✅ Sin alertas activas por ahora.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {alertasVisibles.map((a) => {
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
                  </div>
                  <button
                    onClick={() => setAlertasVistas((prev) => new Set(prev).add(a.id))}
                    aria-label="Ocultar"
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: cfg.color }}
                  >
                    <Check size={16} />
                  </button>
                </div>
              );
            })}

            {/* Alerta sintética de bienvenida — condicional a datos ya
                cargados (finca sin lat/lng), no es una fila de la BD. */}
            {fincaSinUbicacion && (
              <div
                className="flex items-start gap-3 px-3.5 py-3 rounded-xl"
                style={{ background: "var(--color-info-bg)", border: "1px solid var(--color-info)33" }}
              >
                <Info size={16} style={{ color: "var(--color-info)" }} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>Bienvenida</div>
                  <div className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    Registra tu finca con ubicación para activar las alertas de clima automáticas.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { valor: totalCultivos, label: "Cultivos", color: "var(--color-brand)" },
          { valor: formatCOPFull(kpis.ingresosTotal), label: "Ingresos", color: "var(--color-positive)" },
          { valor: formatCOPFull(kpis.gastosMes), label: "Gastos", color: "var(--color-negative)" },
        ].map(({ valor, label, color }) => (
          <div key={label} className="rounded-2xl px-2 py-4 text-center" style={{ border: "1px solid var(--border-subtle)" }}>
            <div className="text-[16px] font-extrabold" style={{ color }}>{valor}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Accesos rápidos ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={"/dashboard/fincas" as any}
          className="flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold"
          style={{ background: "var(--color-brand)", color: "white" }}
        >
          Mis fincas
        </Link>
        <Link
          href={"/dashboard/cultivos" as any}
          className="flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold"
          style={{ background: "var(--color-brand)", color: "white" }}
        >
          Cultivos
        </Link>
      </div>
    </div>
  );
}
