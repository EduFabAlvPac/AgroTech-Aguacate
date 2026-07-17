import Link from "next/link";
import { Map, ExternalLink } from "lucide-react";
import { ETAPA_LABELS } from "@/types";
import type { Finca, Lote, Cultivo, EtapaCultivo } from "@prisma/client";

type FincaWithLotes = (Finca & { lotes: (Lote & { cultivos: Cultivo[] })[] }) | null;

interface MapPreviewProps {
  finca: FincaWithLotes;
}

const LOTE_FILLS = ["#639922", "#1D9E75", "#BA7517", "#185FA5", "#8B5CF6", "#D946EF"];
const LOTE_STROKES = ["#3B6D11", "#0F6E56", "#8A5610", "#0F4680", "#6D28D9", "#A21CAF"];
const LOTE_TEXT_DARK = ["#173404", "#04342C", "#4A2C08", "#082440", "#3B0764", "#4A044E"];

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

      {/* SVG Map Sketch — dynamic based on lotes */}
      <div className="relative w-full rounded-[var(--radius-md)] overflow-hidden bg-agro-50" style={{ height: 220 }}>
        <svg
          viewBox="0 0 480 220"
          className="w-full h-full"
          aria-label={`Mapa esquemático de ${lotes.length} lotes en ${finca?.nombre}`}
        >
          {/* Terrain lines */}
          <path d="M 20,195 Q 120,183 240,188 Q 360,193 460,180" stroke="#C0DD97" strokeWidth="1" fill="none" />
          <path d="M 20,170 Q 120,158 240,163 Q 360,168 460,155" stroke="#C0DD97" strokeWidth="1" fill="none" />
          <path d="M 20,145 Q 120,133 240,138 Q 360,143 460,130" stroke="#C0DD97" strokeWidth="1" fill="none" />

          {/* Dynamic lotes */}
          {lotes.map((lote, idx) => {
            const count = lotes.length;
            const padding = 20;
            const gap = 10;
            const usableWidth = 480 - padding * 2 - gap * (count - 1);
            const loteWidth = Math.min(usableWidth / count, 220);
            const x = padding + idx * (loteWidth + gap);
            const y = 20 + (idx % 2) * 8;
            const fill = LOTE_FILLS[idx % LOTE_FILLS.length];
            const stroke = LOTE_STROKES[idx % LOTE_STROKES.length];
            const textColor = LOTE_TEXT_DARK[idx % LOTE_TEXT_DARK.length];
            const cultivo = lote.cultivos[0];
            const plantas = cultivo?.cantidadPlantas;

            return (
              <g key={lote.id}>
                <rect
                  x={x}
                  y={y}
                  width={loteWidth}
                  height={130}
                  rx={6}
                  fill={fill}
                  fillOpacity="0.22"
                  stroke={stroke}
                  strokeWidth="2"
                />
                <text
                  x={x + loteWidth / 2}
                  y={y + 50}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="600"
                  fill={textColor}
                >
                  {lote.nombre}
                </text>
                <text
                  x={x + loteWidth / 2}
                  y={y + 68}
                  textAnchor="middle"
                  fontSize="10"
                  fill={textColor}
                >
                  {lote.areaHa} ha{plantas ? ` · ${plantas} pl.` : ""}
                </text>
                {lote.altitud && (
                  <text
                    x={x + loteWidth / 2}
                    y={y + 84}
                    textAnchor="middle"
                    fontSize="9"
                    fill={fill}
                  >
                    {lote.altitud.toLocaleString()} msnm
                  </text>
                )}
              </g>
            );
          })}

          {/* North arrow */}
          <text x="450" y="210" fontSize="10" fill="#888780" textAnchor="middle">N ↑</text>

          {/* Summary */}
          <rect x="20" y="165" width="120" height="28" fill="rgba(255,255,255,0.85)" rx="4" />
          <text x="28" y="182" fontSize="9" fill="#173404">
            {lotes.length} lotes · {totalHa.toFixed(1)} ha total
          </text>
        </svg>
      </div>

      {/* Lote details — dynamic grid */}
      <div className={`grid gap-3 mt-4 ${lotes.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {lotes.map((lote, idx) => {
          const colorIdx = idx % LOTE_FILLS.length;
          const isEven = colorIdx % 2 === 0;
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
