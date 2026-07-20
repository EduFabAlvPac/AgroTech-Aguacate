"use client";

import { useEffect, useRef, useState } from "react";

interface MapPreviewLeafletProps {
  lotes: {
    nombre: string;
    areaHa: number;
    altitud?: number | null;
    geoJson?: any;
    lat?: number | null;
    lng?: number | null;
    cultivos: { variedad?: string; etapa?: string }[];
  }[];
  lat: number;
  lng: number;
}

export default function MapPreviewLeaflet({ lotes, lat, lng }: MapPreviewLeafletProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Only render after mount to avoid hydration issues
  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;

    let cancelled = false;

    // Small delay to ensure container is rendered with final dimensions
    const timer = setTimeout(async () => {
      if (cancelled || !mapRef.current) return;

      try {
        // Import leaflet CSS via link tag (avoids webpack CSS issues)
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        const L = (await import("leaflet")).default;

        if (cancelled || !mapRef.current || mapInstance.current) return;

        const map = L.map(mapRef.current, {
          center: [lat, lng],
          zoom: 14,
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          attributionControl: false,
        });

        mapInstance.current = map;

        L.tileLayer(
          "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
          { maxZoom: 20 }
        ).addTo(map);

        const colors = ["#639922", "#1D9E75", "#BA7517", "#185FA5", "#8B3A8A"];

        lotes.forEach((lote, i) => {
          const color = colors[i % colors.length];
          if (lote.geoJson) {
            L.geoJSON(lote.geoJson, {
              style: { color, weight: 2, fillColor: color, fillOpacity: 0.3 },
            }).addTo(map);
          } else if (lote.lat && lote.lng) {
            L.circleMarker([lote.lat, lote.lng], {
              radius: 20, color, fillColor: color, fillOpacity: 0.3,
            }).addTo(map);
          }
        });

        // Force invalidateSize after tiles start loading
        setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.invalidateSize();
          }
        }, 200);
      } catch (err) {
        console.error("[MapPreview] Failed to load Leaflet:", err);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [ready, lotes, lat, lng]);

  if (!ready) {
    return (
      <div style={{ width: "100%", height: "220px", background: "#EAF3DE", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, color: "#5F7052" }}>Cargando mapa...</span>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "220px", borderRadius: 10, background: "#2d3a28" }}
    />
  );
}
