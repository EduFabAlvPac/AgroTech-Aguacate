"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Finca, Lote, Cultivo } from "@prisma/client";
import { ETAPA_LABELS } from "@/types";

type LoteWithCultivo = Lote & { cultivos: Partial<Cultivo>[] };
type FincaWithLotes = (Finca & { lotes: LoteWithCultivo[] }) | null;

interface LeafletMapProps {
  finca: FincaWithLotes;
}

const LOTE_COLORS = ["#639922", "#1D9E75", "#BA7517", "#185FA5"];

export default function LeafletMap({ finca }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let mounted = true;

    // Dynamic import to avoid SSR
    import("leaflet").then((L) => {
      if (!mounted || !mapRef.current || mapInstance.current) return;

      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Center on finca or Norte de Santander
      const center: [number, number] = [
        finca?.lat ?? 7.9273,
        finca?.lng ?? -72.5078,
      ];

      const map = L.map(mapRef.current!, {
        center,
        zoom: 15,
        zoomControl: true,
      });

      mapInstance.current = map;

      // Base tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Satellite layer option
      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Tiles © Esri", maxZoom: 19 }
      );

      const baseLayers = {
        "Mapa base": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }),
        "Satélite": satellite,
      };

      L.control.layers(baseLayers).addTo(map);

      // Render lotes
      if (finca?.lotes) {
        const bounds: any[] = [];

        finca.lotes.forEach((lote, i) => {
          const color = LOTE_COLORS[i % LOTE_COLORS.length];
          const cultivo = lote.cultivos[0];

          // GeoJSON polygon
          if (lote.geoJson) {
            const polygon = L.geoJSON(lote.geoJson as any, {
              style: {
                color,
                weight: 2.5,
                fillColor: color,
                fillOpacity: 0.25,
              },
            }).addTo(map);

            const popupContent = `
              <div style="font-family: system-ui; min-width: 180px;">
                <div style="font-size: 14px; font-weight: 600; color: #1A2B14; margin-bottom: 8px;">
                  ${lote.nombre}
                </div>
                <div style="font-size: 12px; color: #5F7052; line-height: 1.8;">
                  <div>📐 Área: <strong>${lote.areaHa} ha</strong></div>
                  ${lote.altitud ? `<div>🏔️ Altitud: <strong>${lote.altitud.toLocaleString()} msnm</strong></div>` : ""}
                  ${lote.pendiente ? `<div>📐 Pendiente: <strong>${lote.pendiente}°</strong></div>` : ""}
                  ${cultivo?.variedad ? `<div>🌿 Cultivo: <strong>Hass ${cultivo.variedad}</strong></div>` : ""}
                  ${cultivo?.etapa ? `<div>📅 Etapa: <strong>${ETAPA_LABELS[cultivo.etapa as keyof typeof ETAPA_LABELS]}</strong></div>` : ""}
                  ${cultivo?.cantidadPlantas ? `<div>🌱 Plantas: <strong>${cultivo.cantidadPlantas}</strong></div>` : ""}
                </div>
              </div>
            `;

            polygon.bindPopup(popupContent, { maxWidth: 250 });

            // Add lote center marker with label
            const loteCenter = polygon.getBounds().getCenter();

            const labelIcon = L.divIcon({
              className: "",
              html: `<div style="background: ${color}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">${lote.nombre}</div>`,
              iconAnchor: [45, 14],
            });

            L.marker(loteCenter, { icon: labelIcon, interactive: false }).addTo(map);

            bounds.push(polygon.getBounds());
          } else if (lote.lat && lote.lng) {
            // Fallback: center marker only
            const marker = L.circleMarker([lote.lat, lote.lng], {
              radius: 30,
              color,
              weight: 2,
              fillColor: color,
              fillOpacity: 0.3,
            }).addTo(map);

            marker.bindPopup(`<strong>${lote.nombre}</strong><br/>${lote.areaHa} ha`);
            bounds.push([[lote.lat - 0.001, lote.lng - 0.001], [lote.lat + 0.001, lote.lng + 0.001]]);
          }
        });

        // Fit map to show all lotes
        if (bounds.length > 0) {
          try {
            const allBounds = bounds[0];
            map.fitBounds(allBounds, { padding: [40, 40] });
          } catch {}
        }
      }

      // Add finca center marker
      if (finca?.lat && finca?.lng) {
        const fincaIcon = L.divIcon({
          className: "",
          html: `<div style="background: #1A2B14; color: #EAF3DE; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍 ${finca.nombre}</div>`,
          iconAnchor: [70, 24],
        });
        L.marker([finca.lat, finca.lng], { icon: fincaIcon }).addTo(map);
      }
    });

    return () => {
      mounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ minHeight: "400px" }}
      aria-label={`Mapa interactivo de ${finca?.nombre ?? "la finca"}`}
    />
  );
}
