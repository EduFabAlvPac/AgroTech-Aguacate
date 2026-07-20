"use client";

/**
 * MapPreviewLeaflet — Dashboard map preview using an OpenStreetMap iframe embed.
 * 
 * This is the most reliable approach for production:
 * - No JavaScript tile loading issues
 * - No hydration mismatches
 * - No leaflet CSS conflicts
 * - Works 100% on all browsers and deploy targets
 * - Zero dependencies
 */

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

export default function MapPreviewLeaflet({ lat, lng }: MapPreviewLeafletProps) {
  // OpenStreetMap embed with marker at the finca coordinates
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008}%2C${lat - 0.005}%2C${lng + 0.008}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <iframe
      src={embedUrl}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        borderRadius: 10,
      }}
      title="Mapa de la finca"
      loading="lazy"
      allowFullScreen={false}
    />
  );
}
