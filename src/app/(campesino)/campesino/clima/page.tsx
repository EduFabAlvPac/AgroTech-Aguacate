import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Droplets, Wind, MapPin } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentWeather, iconToEmoji } from "@/lib/weather";
import { calcularFaseLunar } from "@/lib/fase-lunar";
import { obtenerConsejoDelDia } from "@/lib/consejo-del-dia";
import { CONSEJO_LUNAR } from "@/lib/consejo-lunar";
import { ConsejoTTSButton } from "@/components/modo-campesino/ConsejoTTSButton";
import { HeaderSeccion } from "@/components/modo-campesino/HeaderSeccion";
import { GRADIENTE_SECCION } from "@/lib/campesino-gradientes";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Clima y consejos — GermIA" };
export const dynamic = "force-dynamic";

export default async function ClimaCampesinoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Ubicación real del navegador si ya la pidió/guardó
  // UbicacionCampesinoClient.tsx (montado en el layout) — si todavía no hay
  // permiso, getCurrentWeather() cae sola al default de Ocaña (sin cambios
  // en weather.ts).
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { ubicacionLat: true, ubicacionLng: true } });
  const usaUbicacionReal = user?.ubicacionLat != null && user?.ubicacionLng != null;

  const clima = usaUbicacionReal ? await getCurrentWeather(user!.ubicacionLat!, user!.ubicacionLng!) : await getCurrentWeather();
  const faseLunar = calcularFaseLunar();
  const consejo = obtenerConsejoDelDia(clima);
  const consejoLunar = CONSEJO_LUNAR[faseLunar.nombre];

  return (
    <div className="flex flex-col min-h-full" style={{ background: "white" }}>
      <HeaderSeccion titulo="Clima y consejos" gradiente={GRADIENTE_SECCION.clima} />
      <div className="px-4 pt-4 pb-8">
        {clima && (
          <div className="rounded-[var(--radius-lg)] p-5 mb-4" style={{ background: "var(--color-info-bg)" }}>
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
              <MapPin size={12} />
              {clima.city} · Hoy, {formatDate(new Date(), true)}
              {!usaUbicacionReal && <span className="text-[10.5px] text-[var(--text-muted)]"> (aproximada)</span>}
            </div>
            <div className="flex items-center justify-between mt-1">
              <div>
                <p className="text-[36px] font-bold text-[var(--text-primary)] leading-none">{clima.temp}°C</p>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">{clima.description}</p>
              </div>
              <span style={{ fontSize: 48 }}>{iconToEmoji(clima.icon)}</span>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                <Wind size={14} /> {clima.windSpeed} km/h
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                <Droplets size={14} /> {clima.rain1h ? `${clima.rain1h} mm` : `${clima.humidity}% humedad`}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-[var(--radius-lg)] p-4 border border-[var(--border-default)] mb-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">Consejo para hoy</p>
            <ConsejoTTSButton texto={consejo} />
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{consejo}</p>
        </div>

        {/* Fase lunar — calendario tradicional de siembra/poda/cosecha (ver
            src/lib/consejo-lunar.ts), rediseñado 2026-08-29 con recomendación
            propia por cada una de las 8 fases, no solo el nombre + emoji. */}
        <div className="rounded-[var(--radius-lg)] p-4 border border-[var(--border-default)]">
          <div className="flex items-center gap-3 mb-3">
            <span style={{ fontSize: 44 }}>{faseLunar.emoji}</span>
            <div>
              <p className="text-[15px] font-bold text-[var(--text-primary)]">{faseLunar.label}</p>
              <p className="text-[11.5px] text-[var(--text-muted)]">Fase de la luna hoy</p>
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--surface-gray)" }}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-[13px] font-bold" style={{ color: "#2F6E52" }}>
                {consejoLunar.actividad}
              </p>
              <ConsejoTTSButton texto={consejoLunar.texto} />
            </div>
            <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">{consejoLunar.texto}</p>
          </div>
          <p className="text-[10.5px] text-[var(--text-muted)] mt-2.5">Según la tradición del campo — no es un dato científico.</p>
        </div>
      </div>
    </div>
  );
}
