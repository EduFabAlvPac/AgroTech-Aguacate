"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Map, ExternalLink } from "lucide-react";
import { ETAPA_LABELS } from "@/types";
import type { Finca, Lote, Cultivo, EtapaCultivo } from "@prisma/client";

const MapPreviewLeaflet = dynamic(
  () => import("@/components/dashboard/MapPreviewLeaflet"),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: "100%", height: "220px",
        background: "#EAF3DE",
        borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <span style={{ fontSize: 13, color: "#5F7052" }}>Cargando mapa...</span>
      </div>
    ),
  }
);

type FincaWithLotes = (Finca & { lotes: (Lote & { cultivos: Cultivo[] })[] }) | null;

interface MapPreviewProps {
  finca: FincaWithLotes;
}

export function MapPreview({ finca }: MapPreviewProps) {
  const lotes = finca?.lotes ?? [];
  const totalHa = lotes.reduce((s, l) => s + l.areaHa, 0);

  return (
    <div className="card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Map size={16} className="text-agro-400" />
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Mapa de lotes
          </h2>
          <span className="badge badge-success">{finca?.municipio ?? "Norte de Santander"}</span>
        </div>
        <Link
          href="/dashboard/mapa"
          className="flex items-center gap-1 text-[12px] text-agro-400 hover:text-agro-600 font-medium"
        >
          Mapa completo <ExternalLink size={13} />
        </Link>
      </div>

      {/* Leaflet Map Preview — read-only satellite view */}
      <div className="relative w-full rounded-[var(--radius-md)] overflow-hidden" style={{ height: 220 }}>
        {finca?.lat && finca?.lng ? (
          <MapPreviewLeaflet
            lotes={lotes.map((l) => ({
              nombre: l.nombre,
              areaHa: l.areaHa,
              altitud: l.altitud,
              geoJson: (l as any).geoJson,
              lat: l.lat,
              lng: l.lng,
              cultivos: l.cultivos.map((c) => ({ variedad: c.variedad, etapa: c.etapa })),
            }))}
            lat={finca.lat}
            lng={finca.lng}
          />
        ) : (
          <div className="w-full h-full bg-agro-50 flex items-center justify-center text-[var(--text-muted)] text-[13px]">
            Configura las coordenadas de tu finca para ver el mapa
          </div>
        )}
      </div>

      {/* Lote details — dynamic grid */}
      <div className={`grid gap-3 mt-4 ${lotes.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {lotes.map((lote, idx) => {
          const isEven = idx % 2 === 0;
          const cultivo = lote.cultivos[0];
          const etapaLabel = cultivo?.etapa
            ? ETAPA_LABELS[cultivo.etapa as EtapaCultivo] ?? cultivo.etapa
            : null;

          return (
            <div
              key={lote.id}
              className={`p-3 rounded-[var(--radius-md)] border ${
                isEven ? "bg-agro-50 border-agro-100" : "bg-teal-50 border-teal-100"
              }`}
            >
              <div
                className={`text-[12px] font-semibold mb-1 ${
                  isEven ? "text-agro-600" : "text-teal-600"
                }`}
              >
                {lote.nombre} · {lote.areaHa} ha
              </div>
              {lote.altitud && (
                <div className="text-[11px] text-[var(--text-muted)]">
                  {lote.pendiente ? `Pend. ${lote.pendiente}° · ` : ""}{lote.altitud.toLocaleString()} msnm
                </div>
              )}
              {cultivo && (
                <div
                  className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium ${
                    isEven ? "text-agro-400" : "text-teal-400"
                  }`}
                >
                  <span className={`stage-dot ${isEven ? "bg-agro-400" : "bg-teal-400"}`}></span>
                  {cultivo.especie} {cultivo.variedad}{etapaLabel ? ` · ${etapaLabel}` : ""}
                </div>
              )}
              {!cultivo && (
                <div className="text-[11px] text-[var(--text-muted)] mt-1.5">Sin cultivo activo</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
