"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let mounted = true;

    import("leaflet")
      .then((leafletModule) => {
        if (!mounted || !mapRef.current || mapInstance.current) return;

        const L = leafletModule.default || leafletModule;

        const map = L.map(mapRef.current!, {
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
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 19 }
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
              radius: 20,
              color,
              fillColor: color,
              fillOpacity: 0.3,
            }).addTo(map);
          }
        });

        setLoading(false);
      })
      .catch((err) => {
        if (mounted) {
          console.error("[MapPreviewLeaflet] Error loading map:", err);
          setError("No se pudo cargar el mapa");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [lotes, lat, lng]);

  if (error) {
    return (
      <div style={{
        width: "100%", height: "100%",
        background: "#FEF0E7",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 10, fontSize: 13, color: "#CA6F1E"
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "#EAF3DE",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 10, fontSize: 13, color: "#5F7052"
        }}>
          Cargando mapa...
        </div>
      )}
      <div ref={mapRef} style={{ width: "100%", height: "100%", borderRadius: 10 }} />
    </div>
  );
}
