import Link from "next/link";
import { Map, ExternalLink } from "lucide-react";
import type { Finca, Lote, Cultivo } from "@prisma/client";

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

      {/* SVG Map Sketch */}
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

          {/* Internal road */}
          <path d="M 240,0 L 240,220" stroke="#D3D1C7" strokeWidth="4" strokeDasharray="8,4" />

          {/* Lote A */}
          <polygon
            points="25,32 215,20 220,145 30,152"
            fill="#639922"
            fillOpacity="0.25"
            stroke="#3B6D11"
            strokeWidth="2"
          />
          <text x="122" y="82" textAnchor="middle" fontSize="14" fontWeight="600" fill="#173404">
            Lote A
          </text>
          <text x="122" y="100" textAnchor="middle" fontSize="11" fill="#27500A">
            1.0 ha · 160 plantas
          </text>
          <text x="122" y="116" textAnchor="middle" fontSize="10" fill="#639922">
            1,850 msnm
          </text>

          {/* Lote B */}
          <polygon
            points="262,25 455,13 460,148 265,155"
            fill="#1D9E75"
            fillOpacity="0.22"
            stroke="#0F6E56"
            strokeWidth="2"
          />
          <text x="362" y="82" textAnchor="middle" fontSize="14" fontWeight="600" fill="#04342C">
            Lote B
          </text>
          <text x="362" y="100" textAnchor="middle" fontSize="11" fill="#085041">
            1.0 ha · 160 plantas
          </text>
          <text x="362" y="116" textAnchor="middle" fontSize="10" fill="#1D9E75">
            1,820 msnm
          </text>

          {/* Water source */}
          <circle cx="32" cy="200" r="8" fill="#5DCAA5" fillOpacity="0.8" />
          <text x="46" y="204" fontSize="10" fill="#085041">Fuente hídrica</text>

          {/* North arrow */}
          <text x="450" y="210" fontSize="10" fill="#888780" textAnchor="middle">N ↑</text>

          {/* Legend */}
          <rect x="20" y="160" width="100" height="32" fill="rgba(255,255,255,0.85)" rx="4" />
          <rect x="26" y="168" width="10" height="8" fill="#639922" fillOpacity="0.5" stroke="#3B6D11" strokeWidth="0.5" />
          <text x="40" y="176" fontSize="9" fill="#173404">Aguacate Hass</text>
          <rect x="26" y="180" width="10" height="5" fill="#D3D1C7" stroke="#888780" strokeWidth="0.5" />
          <text x="40" y="187" fontSize="9" fill="#5F5E5A">Camino interno</text>
        </svg>
      </div>

      {/* Lote details */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {lotes.map((lote, idx) => (
          <div
            key={lote.id}
            className={`p-3 rounded-[var(--radius-md)] border ${
              idx === 0
                ? "bg-agro-50 border-agro-100"
                : "bg-teal-50 border-teal-100"
            }`}
          >
            <div
              className={`text-[12px] font-semibold mb-1 ${
                idx === 0 ? "text-agro-600" : "text-teal-600"
              }`}
            >
              {lote.nombre} · {lote.areaHa} ha
            </div>
            {lote.altitud && (
              <div className="text-[11px] text-[var(--text-muted)]">
                Pend. {lote.pendiente}° · {lote.altitud.toLocaleString()} msnm
              </div>
            )}
            <div
              className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium ${
                idx === 0 ? "text-agro-400" : "text-teal-400"
              }`}
            >
              <span className={`stage-dot ${idx === 0 ? "bg-agro-400" : "bg-teal-400"}`}></span>
              {lote.cultivos[0]?.etapa === "SIEMBRA" ? "En siembra" : "Activo"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
