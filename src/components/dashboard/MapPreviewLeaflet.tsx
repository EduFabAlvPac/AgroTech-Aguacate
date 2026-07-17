"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let mounted = true;

    import("leaflet").then((leafletModule) => {
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
    });

    return () => {
      mounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [lotes, lat, lng]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%", borderRadius: 10 }} />;
}
