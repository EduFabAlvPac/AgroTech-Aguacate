"use client";

import { useEffect, useState } from "react";
import { Cloud, Droplets, Wind, Thermometer, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { CurrentWeather, DailyForecast } from "@/lib/weather";
import { iconToEmoji } from "@/lib/weather";
import { Skeleton } from "@/components/ui/Skeleton";

interface WeatherWidgetProps {
  municipio: string;
}

export function WeatherWidget({ municipio }: WeatherWidgetProps) {
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [daily, setDaily] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertCount, setAlertCount] = useState(0);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const [currentRes, dailyRes, alertsRes] = await Promise.all([
        fetch("/api/weather?type=current"),
        fetch("/api/weather?type=daily"),
        fetch("/api/alertas?activas=true&limit=10"),
      ]);

      const [{ data: cur }, { data: day }, { meta }] = await Promise.all([
        currentRes.json(),
        dailyRes.json(),
        alertsRes.json(),
      ]);

      if (cur) setCurrent(cur);
      if (day) setDaily(day.slice(0, 3));
      if (meta?.noLeidas !== undefined) setAlertCount(meta.noLeidas);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 h-full">
        {/* Current weather skeleton */}
        <div className="card p-5 flex-1">
          {/* Header: title + source label */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="text" className="w-24 h-3.5" />
            <Skeleton variant="text" className="w-32 h-3" />
          </div>

          {/* Temperature + condition */}
          <div className="flex items-center gap-4 mb-4">
            <Skeleton variant="text" className="w-20 h-10 rounded-[var(--radius-md)] shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton variant="text" className="w-3/4 h-3.5" />
              <Skeleton variant="text" className="w-1/2 h-3" />
              <Skeleton variant="text" className="w-2/5 h-3" />
            </div>
          </div>

          {/* 3 stat tiles: Humidity / Wind / Rain */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-[var(--surface-page)] rounded-[var(--radius-md)] p-2 flex flex-col items-center gap-1"
              >
                <Skeleton variant="avatar" className="w-4 h-4 rounded-full" />
                <Skeleton variant="text" className="w-10 h-2.5" />
                <Skeleton variant="text" className="w-8 h-3.5" />
              </div>
            ))}
          </div>

          {/* 3-day forecast */}
          <div className="border-t border-[var(--border-subtle)] pt-3">
            <Skeleton variant="text" className="w-20 h-3 mb-2" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Skeleton variant="text" className="w-8 h-2.5" />
                  <Skeleton variant="avatar" className="w-7 h-7 rounded-full" />
                  <Skeleton variant="text" className="w-14 h-3" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alert card skeleton */}
        <div className="card p-4">
          <div className="flex gap-3">
            <Skeleton variant="avatar" className="w-5 h-5 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton variant="text" className="w-3/5 h-3.5" />
              <Skeleton variant="text" className="w-full h-3" />
              <Skeleton variant="text" className="w-4/5 h-3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Current weather */}
      <div className="card p-5 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Clima actual
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--text-muted)]">
              {current ? "IDEAM + OpenWeather" : "Datos de muestra"}
            </span>
            <button
              onClick={fetchWeather}
              className="p-1 hover:bg-[var(--surface-page)] rounded text-[var(--text-muted)] transition-colors"
              aria-label="Actualizar clima"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl font-light text-[var(--text-primary)] leading-none">
            {current?.temp ?? 21}°C
          </div>
          <div>
            <div className="text-[13px] text-[var(--text-secondary)] font-medium">
              {current?.description ?? "Parcialmente nublado"}
            </div>
            <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
              {municipio}
            </div>
            {current?.feelsLike && (
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Sensación: {current.feelsLike}°C
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: Droplets, label: "Humedad", value: `${current?.humidity ?? 68}%` },
            { icon: Wind, label: "Viento", value: `${current?.windSpeed ?? 12} km/h` },
            { icon: Thermometer, label: "Lluvia", value: current?.rain1h ? `${current.rain1h} mm` : `${Math.round((current?.clouds ?? 30) / 3)}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[var(--surface-page)] rounded-[var(--radius-md)] p-2 text-center">
              <Icon size={14} className="text-[var(--text-muted)] mx-auto mb-1" />
              <div className="text-[11px] text-[var(--text-muted)]">{label}</div>
              <div className="text-[13px] font-semibold text-[var(--text-primary)] mt-0.5">
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* 3-day forecast */}
        {daily.length > 0 && (
          <div className="border-t border-[var(--border-subtle)] pt-3">
            <div className="text-[11px] text-[var(--text-muted)] mb-2">Próximos días</div>
            <div className="grid grid-cols-3 gap-2">
              {daily.map((d) => (
                <div key={d.date} className="text-center">
                  <div className="text-[11px] text-[var(--text-muted)]">{d.dayLabel}</div>
                  <div className="text-lg my-1">{iconToEmoji(d.icon)}</div>
                  <div className="text-[12px] font-medium text-[var(--text-primary)]">
                    {d.tempMax}° / {d.tempMin}°
                  </div>
                  {d.rainMm > 0 && (
                    <div className="text-[10px] text-blue-500">💧 {d.rainMm}mm</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alert card */}
      {alertCount > 0 ? (
        <div className="card p-4 border-harvest-100 bg-harvest-50">
          <div className="flex gap-3">
            <AlertTriangle size={18} className="text-harvest-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[13px] font-semibold text-harvest-400 mb-1">
                {alertCount} alerta{alertCount > 1 ? "s" : ""} climática{alertCount > 1 ? "s" : ""} activa{alertCount > 1 ? "s" : ""}
              </div>
              <div className="text-[12px] text-harvest-400 opacity-80 leading-relaxed">
                Hay condiciones climáticas que pueden afectar tu cultivo de aguacate.
              </div>
              <Link
                href="/dashboard/alertas"
                className="inline-flex items-center gap-1 mt-2 text-[12px] font-medium text-harvest-400 hover:text-harvest-600 underline"
              >
                Ver alertas →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-4 border-agro-100 bg-agro-50">
          <div className="flex gap-3">
            <Cloud size={18} className="text-agro-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[13px] font-semibold text-agro-600 mb-1">
                Sin alertas climáticas activas
              </div>
              <div className="text-[12px] text-agro-400 leading-relaxed">
                Las condiciones meteorológicas son favorables para el cultivo.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
