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
  // Use Google Maps embed — reliable satellite view with full Colombia coverage
  // Note: if lat/lng appear swapped (marker in ocean), swap them
  const actualLat = Math.abs(lat) < 15 ? lat : lng;  // lat for Colombia should be 0-13
  const actualLng = Math.abs(lng) > 60 ? lng : lat;  // lng for Colombia should be -67 to -79

  const embedUrl = `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3000!2d${actualLng}!3d${actualLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1ses!2sco&maptype=satellite`;

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
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}
