"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import type { Finca, Lote, Cultivo } from "@prisma/client";
import { ETAPA_LABELS } from "@/types";
import { calculateGeodesicArea, isSelfIntersecting } from "@/lib/geo";
import { LOTE_COLORS } from "@/lib/constants";
import { EditControls } from "@/components/mapa/EditControls";
import toast from "react-hot-toast";

type LoteWithCultivo = Lote & {
  cultivos: Partial<Cultivo>[];
  _count?: { cultivos: number };
};
type FincaWithLotes = (Finca & { lotes: LoteWithCultivo[] }) | null;

type MapMode = "view" | "draw-new" | "draw-existing" | "edit";

interface LeafletMapProps {
  finca: FincaWithLotes;
  mapMode?: MapMode;
  activeLoteId?: string | null;
  activeLoteName?: string | null;
  onLoteCreated?: (lote: Lote) => void;
  onLoteUpdated?: (lote: Lote) => void;
  onModeChange?: (mode: "view") => void;
}

/**
 * Generate the HTML content for the Flow C popup (assign area to existing lote).
 */
function getFlowCPopupHtml(areaHa: number): string {
  return `<div style="font-family: system-ui, -apple-system, sans-serif; min-width: 220px; padding: 4px;">
  <h3 style="font-size: 14px; font-weight: 600; color: #1A2B14; margin: 0 0 12px 0;">Confirmar área</h3>
  <div style="margin-bottom: 12px;">
    <label style="font-size: 11px; color: #5F7052; display: block; margin-bottom: 4px;">Área calculada (ha)</label>
    <input id="popup-area" type="number" step="0.01" min="0.01" max="10000" value="${areaHa}" style="width: 100%; padding: 6px 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-size: 13px; outline: none;" />
  </div>
  <div id="popup-api-error" style="color: #C0392B; font-size: 11px; display: none; margin-bottom: 8px; background: #fef2f2; padding: 6px 8px; border-radius: 4px;"></div>
  <div style="display: flex; gap: 8px; justify-content: flex-end;">
    <button id="popup-cancel-btn" style="padding: 6px 14px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-size: 12px; font-weight: 500; background: white; color: #5F7052; cursor: pointer;">Cancelar</button>
    <button id="popup-save-btn" style="padding: 6px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; background: #639922; color: white; cursor: pointer;">Guardar área</button>
  </div>
</div>`;
}

/**
 * Generate the HTML content for the Flow B popup (create new lote from map).
 */
function getFlowBPopupHtml(areaHa: number): string {
  return `<div style="font-family: system-ui, -apple-system, sans-serif; min-width: 250px; padding: 4px;">
  <h3 style="font-size: 14px; font-weight: 600; color: #1A2B14; margin: 0 0 12px 0;">Nuevo lote</h3>
  <div style="margin-bottom: 10px;">
    <label style="font-size: 11px; color: #5F7052; display: block; margin-bottom: 4px;">Nombre del lote *</label>
    <input id="popup-nombre" type="text" maxlength="100" placeholder="Ej: Lote Norte" style="width: 100%; padding: 6px 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-size: 13px; outline: none;" />
    <span id="popup-nombre-error" style="color: #C0392B; font-size: 11px; display: none; margin-top: 2px;">El nombre es requerido</span>
  </div>
  <div style="margin-bottom: 10px;">
    <label style="font-size: 11px; color: #5F7052; display: block; margin-bottom: 4px;">Área (ha)</label>
    <input id="popup-area" type="number" step="0.01" min="0.01" max="10000" value="${areaHa}" style="width: 100%; padding: 6px 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-size: 13px; outline: none;" />
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
    <div>
      <label style="font-size: 11px; color: #5F7052; display: block; margin-bottom: 4px;">Altitud (msnm)</label>
      <input id="popup-altitud" type="number" min="0" max="5000" placeholder="Opcional" style="width: 100%; padding: 6px 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-size: 13px; outline: none;" />
    </div>
    <div>
      <label style="font-size: 11px; color: #5F7052; display: block; margin-bottom: 4px;">Pendiente (°)</label>
      <input id="popup-pendiente" type="number" min="0" max="90" step="0.1" placeholder="Opcional" style="width: 100%; padding: 6px 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-size: 13px; outline: none;" />
    </div>
  </div>
  <div id="popup-api-error" style="color: #C0392B; font-size: 11px; display: none; margin-bottom: 8px; background: #fef2f2; padding: 6px 8px; border-radius: 4px;"></div>
  <div style="display: flex; gap: 8px; justify-content: flex-end;">
    <button id="popup-cancel-btn" style="padding: 6px 14px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-size: 12px; font-weight: 500; background: white; color: #5F7052; cursor: pointer;">Cancelar</button>
    <button id="popup-save-btn" style="padding: 6px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; background: #639922; color: white; cursor: pointer;">Guardar lote</button>
  </div>
</div>`;
}

export default function LeafletMap({
  finca,
  mapMode = "view",
  activeLoteId,
  activeLoteName,
  onLoteCreated,
  onLoteUpdated,
  onModeChange,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const drawControlRef = useRef<any>(null);
  const drawnPolygonLayerRef = useRef<any>(null);
  const activePopupRef = useRef<any>(null);
  const polygonDrawerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);

  // ── Edit mode refs and state ──
  const loteLayersRef = useRef<Map<string, any>>(new Map());
  const originalGeoJsonRef = useRef<GeoJSON.Polygon | null>(null);
  const editingLayerRef = useRef<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let mounted = true;

    // Dynamic import — expose L globally BEFORE loading leaflet-draw
    import("leaflet").then(async (leafletModule) => {
      if (!mounted || !mapRef.current || mapInstance.current) return;

      const L = leafletModule.default || leafletModule;
      (window as any).L = L;

      // leaflet-draw requires global L to be available
      await import("leaflet-draw");

      if (!mounted || !mapRef.current || mapInstance.current) return;

      LRef.current = L;

      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Center on finca or Ocaña, Norte de Santander (Finca El Juncal)
      const center: [number, number] = [
        finca?.lat ?? 8.320589,
        finca?.lng ?? -73.337551,
      ];

      const map = L.map(mapRef.current!, {
        center,
        zoom: 16,
        zoomControl: true,
      });

      mapInstance.current = map;

      // Base tile layer — Google Satellite (best coverage in rural Colombia)
      const satellite = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        { attribution: "Imagery © Google", maxZoom: 20 }
      );
      satellite.addTo(map);

      // OSM as alternate layer
      const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      });

      // Google Hybrid (satellite + labels) as third option
      const hybrid = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        { attribution: "Imagery © Google", maxZoom: 20 }
      );

      const baseLayers = {
        "Satélite": satellite,
        "Satélite + Nombres": hybrid,
        "Mapa base": osmLayer,
      };

      L.control.layers(baseLayers).addTo(map);

      // ── Leaflet Draw Controls (hidden by default, activated programmatically) ──
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      const drawControl = new (L as any).Control.Draw({
        position: "topleft",
        draw: {
          polygon: {
            allowIntersection: false,
            shapeOptions: {
              color: "#639922",
              weight: 2,
              fillOpacity: 0.25,
            },
          },
          polyline: false,
          circle: false,
          circlemarker: false,
          marker: false,
          rectangle: false,
        },
        edit: {
          featureGroup: drawnItems,
          remove: false,
        },
      });

      drawControl.addTo(map);
      drawControlRef.current = drawControl;

      // ── Listen to draw:created event ──
      map.on((L as any).Draw.Event.CREATED, (e: any) => {
        const layer = e.layer;
        drawnItems.addLayer(layer);

        // Calcular área y centroide
        const latlngs = layer.getLatLngs()[0];
        const center = layer.getBounds().getCenter();

        // Calcular área en hectáreas
        let area = 0;
        const n = latlngs.length;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          area += latlngs[i].lng * latlngs[j].lat;
          area -= latlngs[j].lng * latlngs[i].lat;
        }
        const areaHa = Math.abs(area * 0.5 * 111319.9 * 111319.9 * Math.cos(center.lat * Math.PI / 180) / 10000).toFixed(2);

        const geoJson = layer.toGeoJSON();

        // Crear contenedor del popup
        const container = document.createElement('div');
        container.style.cssText = 'font-family:system-ui,sans-serif;min-width:220px;padding:4px;';
        container.innerHTML = `
          <div style="font-weight:600;font-size:14px;color:#1A2B14;margin-bottom:12px">Nuevo lote</div>
          <div style="margin-bottom:8px">
            <label style="font-size:11px;color:#5F7052;display:block;margin-bottom:3px">Nombre del lote *</label>
            <input id="popup-lote-nombre" type="text" placeholder="Ej: Lote Norte, Lote 3..."
              style="width:100%;padding:6px 8px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;box-sizing:border-box"/>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
            <div>
              <label style="font-size:11px;color:#5F7052;display:block;margin-bottom:3px">Área (ha)</label>
              <input id="popup-lote-area" type="number" value="${areaHa}"
                style="width:100%;padding:6px 8px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;box-sizing:border-box"/>
            </div>
            <div>
              <label style="font-size:11px;color:#5F7052;display:block;margin-bottom:3px">Altitud (msnm)</label>
              <input id="popup-lote-altitud" type="number" placeholder="Opcional"
                style="width:100%;padding:6px 8px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;box-sizing:border-box"/>
            </div>
          </div>
          <div style="display:flex;gap:6px;margin-top:12px">
            <button id="popup-lote-cancelar"
              style="flex:1;padding:8px;border:1px solid #D1D5DB;background:white;border-radius:6px;font-size:13px;cursor:pointer;color:#5F7052">Cancelar</button>
            <button id="popup-lote-guardar"
              style="flex:1;padding:8px;border:none;background:#639922;color:white;border-radius:6px;font-size:13px;cursor:pointer;font-weight:500">Guardar lote</button>
          </div>
          <div id="popup-lote-error" style="color:#A32D2D;font-size:11px;margin-top:6px;display:none"></div>
        `;

        // Crear y abrir el popup
        const popup = L.popup({
          maxWidth: 260,
          closeButton: false,
          closeOnClick: false,
          autoClose: false,
        })
          .setLatLng(center)
          .setContent(container)
          .openOn(map);

        // Bind event handlers after popup is added to DOM
        setTimeout(() => {
          const btnCancelar = document.getElementById('popup-lote-cancelar');
          const btnGuardar = document.getElementById('popup-lote-guardar');
          const errorDiv = document.getElementById('popup-lote-error');

          if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
              map.closePopup();
              drawnItems.removeLayer(layer);
            });
          }

          if (btnGuardar) {
            btnGuardar.addEventListener('click', async () => {
              const nombre = (document.getElementById('popup-lote-nombre') as HTMLInputElement)?.value?.trim();
              const areaInput = (document.getElementById('popup-lote-area') as HTMLInputElement)?.value;
              const altitudInput = (document.getElementById('popup-lote-altitud') as HTMLInputElement)?.value;

              if (!nombre) {
                if (errorDiv) {
                  errorDiv.style.display = 'block';
                  errorDiv.textContent = 'El nombre del lote es requerido';
                }
                return;
              }

              btnGuardar.textContent = 'Guardando...';
              (btnGuardar as HTMLButtonElement).disabled = true;

              try {
                const res = await fetch('/api/lotes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nombre,
                    areaHa: parseFloat(areaInput) || parseFloat(areaHa),
                    altitud: altitudInput ? parseFloat(altitudInput) : undefined,
                    lat: center.lat,
                    lng: center.lng,
                    geoJson,
                  }),
                });

                const data = await res.json();

                if (!res.ok) {
                  throw new Error(data.error || `Error ${res.status}`);
                }

                map.closePopup();
                alert(`✅ Lote "${nombre}" guardado correctamente`);
                window.location.reload();
              } catch (err: any) {
                if (errorDiv) {
                  errorDiv.style.display = 'block';
                  errorDiv.textContent = `Error: ${err.message}`;
                }
                btnGuardar.textContent = 'Guardar lote';
                (btnGuardar as HTMLButtonElement).disabled = false;
              }
            });
          }
        }, 100);
      });

      // ── Render existing lotes ──
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
                weight: 2,
                fillColor: color,
                fillOpacity: 0.25,
              },
            });

            // Add polygon layers to the FeatureGroup so Leaflet.draw can edit them
            polygon.eachLayer((layer: any) => {
              drawnItems.addLayer(layer);
            });

            // Store the GeoJSON group reference for edit mode
            loteLayersRef.current.set(lote.id, polygon);

            const popupContent = `
              <div style="font-family: system-ui; min-width: 160px; padding: 4px;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">
                  ${lote.nombre}
                </div>
                <div style="font-size: 12px; color: #5F7052; line-height: 1.8;">
                  <div>📐 ${lote.areaHa} ha</div>
                  ${lote.altitud ? `<div>🏔️ ${lote.altitud.toLocaleString()} msnm</div>` : ""}
                  ${cultivo ? `<div>🌿 ${cultivo.especie} ${cultivo.variedad}</div>` : "<div>Sin cultivo activo</div>"}
                  ${cultivo?.etapa ? `<div>📅 Etapa: ${ETAPA_LABELS[cultivo.etapa as keyof typeof ETAPA_LABELS]}</div>` : ""}
                </div>
                <a href="/dashboard/cultivos" style="display:inline-block;margin-top:8px;font-size:11px;color:#639922;font-weight:500;text-decoration:none;">Ver detalle →</a>
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

            L.marker(loteCenter, { icon: labelIcon, interactive: false }).addTo(
              map
            );

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

            marker.bindPopup(
              `<strong>${lote.nombre}</strong><br/>${lote.areaHa} ha`
            );
            bounds.push([
              [lote.lat - 0.001, lote.lng - 0.001],
              [lote.lat + 0.001, lote.lng + 0.001],
            ]);
          }
        });

        // Fit map to show all lotes
        if (bounds.length > 0) {
          try {
            let allBounds = L.latLngBounds(bounds[0]);
            for (let i = 1; i < bounds.length; i++) {
              allBounds = allBounds.extend(bounds[i]);
            }
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

      // ── Activate draw mode if mapMode requires it ──
      if (mapMode === "draw-new" || mapMode === "draw-existing") {
        setTimeout(() => {
          if (!mounted || !mapInstance.current) return;
          activateDrawTool(L, map, drawControl);
        }, 300);
      } else if (mapMode === "edit" && activeLoteId) {
        setTimeout(() => {
          if (!mounted || !mapInstance.current) return;
          activateEditMode(activeLoteId);
        }, 300);
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

  // ── Effect: React to mapMode changes after initial render ──
  useEffect(() => {
    if (!mapInstance.current || !LRef.current) return;

    const L = LRef.current;
    const map = mapInstance.current;
    const drawControl = drawControlRef.current;

    if (mapMode === "draw-new" || mapMode === "draw-existing") {
      // Activate the draw tool
      setTimeout(() => {
        activateDrawTool(L, map, drawControl);
      }, 300);
    } else if (mapMode === "edit" && activeLoteId) {
      // Activate edit mode on the target polygon
      setTimeout(() => {
        activateEditMode(activeLoteId);
      }, 300);
    } else if (mapMode === "view") {
      // Disable any active drawing
      if (polygonDrawerRef.current) {
        try {
          polygonDrawerRef.current.disable();
        } catch {}
        polygonDrawerRef.current = null;
      }
      // Disable any active editing
      disableEditMode();
    }
  }, [mapMode, activeLoteId]);

  /**
   * Programmatically activate the polygon draw tool.
   */
  function activateDrawTool(L: any, map: any, drawControl: any) {
    // Disable any previously active drawer
    if (polygonDrawerRef.current) {
      try {
        polygonDrawerRef.current.disable();
      } catch {}
    }

    const polygonDrawer = new L.Draw.Polygon(
      map,
      drawControl.options.draw.polygon
    );
    polygonDrawer.enable();
    polygonDrawerRef.current = polygonDrawer;
  }

  /**
   * Activate edit mode on the polygon layer for the given loteId.
   * Stores original geoJson coordinates for revert on cancel.
   */
  function activateEditMode(loteId: string) {
    const geoJsonLayer = loteLayersRef.current.get(loteId);
    if (!geoJsonLayer) return;

    // Get the inner Leaflet polygon layer from the L.geoJSON group
    let innerLayer: any = null;
    geoJsonLayer.eachLayer((l: any) => {
      innerLayer = l;
    });

    if (!innerLayer) return;

    // Store original GeoJSON for revert
    const originalGeoJson = innerLayer.toGeoJSON().geometry as GeoJSON.Polygon;
    originalGeoJsonRef.current = originalGeoJson;
    editingLayerRef.current = innerLayer;

    // Enable editing on the inner layer (which lives in drawnItems FeatureGroup)
    if (innerLayer.editing) {
      innerLayer.editing.enable();
    }
  }

  /**
   * Disable edit mode and clean up refs (without reverting).
   */
  function disableEditMode() {
    if (editingLayerRef.current?.editing) {
      try {
        editingLayerRef.current.editing.disable();
      } catch {}
    }
    editingLayerRef.current = null;
    originalGeoJsonRef.current = null;
  }

  /**
   * Handle saving edited polygon (Flujo D).
   * Validates, recalculates area, PUTs to API.
   */
  async function handleEditSave() {
    if (!editingLayerRef.current || !activeLoteId) return;

    const editedGeoJson = editingLayerRef.current.toGeoJSON().geometry as GeoJSON.Polygon;
    const coordinates = editedGeoJson.coordinates[0] as [number, number][];

    // Validate: not self-intersecting
    if (isSelfIntersecting(coordinates)) {
      toast.error("El polígono no es válido: las líneas no deben cruzarse");
      return;
    }

    // Recalculate area (remove closing point for calculation)
    const openCoords = coordinates.slice(0, -1) as [number, number][];
    const areaHa = calculateGeodesicArea(openCoords);

    setEditLoading(true);

    try {
      const response = await fetch(`/api/lotes/${activeLoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geoJson: editedGeoJson,
          areaHa,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "No se pudieron guardar los cambios" }));
        toast.error(errorData.error ?? "No se pudieron guardar los cambios");
        setEditLoading(false);
        return;
      }

      const result = await response.json();
      const updatedLote = result.data;

      // Disable editing on the layer
      if (editingLayerRef.current?.editing) {
        editingLayerRef.current.editing.disable();
      }

      // Clean up refs
      editingLayerRef.current = null;
      originalGeoJsonRef.current = null;

      // Notify parent
      if (onLoteUpdated) {
        onLoteUpdated(updatedLote);
      }

      toast.success("Área actualizada correctamente");
    } catch (err) {
      toast.error("Error de conexión. No se pudieron guardar los cambios.");
    } finally {
      setEditLoading(false);
    }
  }

  /**
   * Handle canceling polygon edit (Flujo D).
   * Reverts polygon to original coordinates and exits edit mode.
   */
  function handleEditCancel() {
    if (editingLayerRef.current && originalGeoJsonRef.current) {
      // Disable editing first
      if (editingLayerRef.current.editing) {
        editingLayerRef.current.editing.disable();
      }

      // Revert to original coordinates
      const originalCoords = originalGeoJsonRef.current.coordinates[0];
      const latLngs = originalCoords.map(
        (coord: number[]) => [coord[1], coord[0]] as [number, number]
      );
      editingLayerRef.current.setLatLngs(latLngs);
    }

    // Clean up refs
    editingLayerRef.current = null;
    originalGeoJsonRef.current = null;

    // Return to view mode
    if (onModeChange) {
      onModeChange("view");
    }
  }

  /**
   * Open the Flow B popup (Nuevo lote) at the given centroid.
   */
  function openFlowBPopup(
    L: any,
    map: any,
    centroid: any,
    geoJson: GeoJSON.Polygon,
    areaHa: number
  ) {
    const popup = L.popup({
      closeOnClick: false,
      autoClose: false,
      closeButton: true,
      maxWidth: 320,
      minWidth: 270,
    })
      .setLatLng(centroid)
      .setContent(getFlowBPopupHtml(areaHa));

    activePopupRef.current = popup;

    // Bind event listeners AFTER popup DOM is rendered
    popup.on("add", () => {
      const saveBtn = document.getElementById("popup-save-btn");
      const cancelBtn = document.getElementById("popup-cancel-btn");

      saveBtn?.addEventListener("click", handleFlowBSave);
      cancelBtn?.addEventListener("click", handleFlowBCancel);
    });

    popup.on("remove", () => {
      // Clean up listeners (popup DOM is gone, but good practice)
      activePopupRef.current = null;
    });

    popup.openOn(map);

    // ── Flow B Save handler ──
    async function handleFlowBSave() {
      const nombreInput = document.getElementById("popup-nombre") as HTMLInputElement | null;
      const areaInput = document.getElementById("popup-area") as HTMLInputElement | null;
      const altitudInput = document.getElementById("popup-altitud") as HTMLInputElement | null;
      const pendienteInput = document.getElementById("popup-pendiente") as HTMLInputElement | null;
      const nombreError = document.getElementById("popup-nombre-error");
      const apiError = document.getElementById("popup-api-error");

      const nombre = nombreInput?.value?.trim() ?? "";

      // Validate nombre is not empty
      if (!nombre) {
        if (nombreInput) {
          nombreInput.style.border = "1px solid #C0392B";
        }
        if (nombreError) {
          nombreError.style.display = "block";
        }
        return;
      }

      // Clear validation error if previously shown
      if (nombreInput) {
        nombreInput.style.border = "1px solid rgba(0,0,0,0.1)";
      }
      if (nombreError) {
        nombreError.style.display = "none";
      }

      // Gather form values
      const formArea = parseFloat(areaInput?.value ?? String(areaHa));
      const formAltitud = altitudInput?.value ? parseFloat(altitudInput.value) : null;
      const formPendiente = pendienteInput?.value ? parseFloat(pendienteInput.value) : null;

      const fincaId = finca?.id;
      if (!fincaId) {
        if (apiError) {
          apiError.textContent = "Error: no se encontró la finca";
          apiError.style.display = "block";
        }
        return;
      }

      // Disable save button to prevent double-click
      const saveBtn = document.getElementById("popup-save-btn") as HTMLButtonElement | null;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";
        saveBtn.style.opacity = "0.7";
      }

      try {
        const payload = {
          nombre,
          areaHa: formArea,
          altitud: formAltitud,
          pendiente: formPendiente,
          fincaId,
          geoJson,
          lat: centroid.lat,
          lng: centroid.lng,
        };

        console.log("[LeafletMap] Creando lote, payload:", JSON.stringify(payload, null, 2));

        const response = await fetch("/api/lotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const responseData = await response.json().catch(() => ({ error: "Respuesta no válida del servidor" }));

        if (!response.ok) {
          console.error("Error al guardar lote:", response.status, responseData);
          alert(`Error al guardar el lote: ${responseData.error || response.status}`);

          if (apiError) {
            apiError.textContent = responseData.error ?? "Error al crear el lote";
            apiError.style.display = "block";
          }

          // Re-enable save button
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Guardar lote";
            saveBtn.style.opacity = "1";
          }
          return;
        }

        const createdLote = responseData.data;

        // Close popup
        map.closePopup(popup);
        activePopupRef.current = null;

        // Keep the polygon rendered permanently with the lote's assigned color and label
        if (drawnPolygonLayerRef.current) {
          const loteIndex = finca?.lotes?.length ?? 0;
          const color = LOTE_COLORS[loteIndex % LOTE_COLORS.length];

          drawnPolygonLayerRef.current.setStyle({
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.25,
          });

          // Add a label at the centroid
          const labelIcon = L.divIcon({
            className: "",
            html: `<div style="background: ${color}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">${nombre}</div>`,
            iconAnchor: [45, 14],
          });

          L.marker(centroid, { icon: labelIcon, interactive: false }).addTo(map);

          drawnPolygonLayerRef.current = null;
        }

        // Notify parent
        if (onLoteCreated) {
          onLoteCreated(createdLote);
        }

        toast.success(`Lote ${nombre} creado correctamente`);
      } catch (err) {
        if (apiError) {
          apiError.textContent = "Error de conexión. Intenta de nuevo.";
          apiError.style.display = "block";
        }

        // Re-enable save button
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Guardar lote";
          saveBtn.style.opacity = "1";
        }
      }
    }

    // ── Flow B Cancel handler ──
    function handleFlowBCancel() {
      // Close popup
      map.closePopup(popup);
      activePopupRef.current = null;

      // Remove drawn polygon
      if (drawnPolygonLayerRef.current) {
        map.removeLayer(drawnPolygonLayerRef.current);
        drawnPolygonLayerRef.current = null;
      }

      // Return to view mode
      if (onModeChange) {
        onModeChange("view");
      }
    }
  }

  /**
   * Open the Flow C popup (Confirmar área) at the given centroid for an existing lote.
   */
  function openFlowCPopup(
    L: any,
    map: any,
    centroid: any,
    geoJson: GeoJSON.Polygon,
    areaHa: number
  ) {
    const popup = L.popup({
      closeOnClick: false,
      autoClose: false,
      closeButton: true,
      maxWidth: 300,
      minWidth: 240,
    })
      .setLatLng(centroid)
      .setContent(getFlowCPopupHtml(areaHa));

    activePopupRef.current = popup;

    // Bind event listeners AFTER popup DOM is rendered
    popup.on("add", () => {
      const saveBtn = document.getElementById("popup-save-btn");
      const cancelBtn = document.getElementById("popup-cancel-btn");

      saveBtn?.addEventListener("click", handleFlowCSave);
      cancelBtn?.addEventListener("click", handleFlowCCancel);
    });

    popup.on("remove", () => {
      activePopupRef.current = null;
    });

    popup.openOn(map);

    // ── Flow C Save handler ──
    async function handleFlowCSave() {
      const areaInput = document.getElementById("popup-area") as HTMLInputElement | null;
      const apiError = document.getElementById("popup-api-error");

      const formArea = parseFloat(areaInput?.value ?? String(areaHa));

      // Disable save button to prevent double-click
      const saveBtn = document.getElementById("popup-save-btn") as HTMLButtonElement | null;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";
        saveBtn.style.opacity = "0.7";
      }

      try {
        const response = await fetch(`/api/lotes/${activeLoteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            geoJson,
            areaHa: formArea,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "No se pudo guardar el área" }));
          const errorMessage = errorData.error ?? "No se pudo guardar el área";

          if (apiError) {
            apiError.textContent = errorMessage;
            apiError.style.display = "block";
          }

          toast.error("No se pudo guardar el área");

          // Re-enable save button
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Guardar área";
            saveBtn.style.opacity = "1";
          }
          return;
        }

        const result = await response.json();
        const updatedLote = result.data;

        // Close popup
        map.closePopup(popup);
        activePopupRef.current = null;

        // Keep the polygon rendered permanently with appropriate color and label
        if (drawnPolygonLayerRef.current) {
          const loteIndex = finca?.lotes?.findIndex((l) => l.id === activeLoteId) ?? 0;
          const color = LOTE_COLORS[(loteIndex >= 0 ? loteIndex : 0) % LOTE_COLORS.length];

          drawnPolygonLayerRef.current.setStyle({
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.25,
          });

          // Add a label at the centroid
          const loteName = activeLoteName ?? updatedLote.nombre ?? "Lote";
          const labelIcon = L.divIcon({
            className: "",
            html: `<div style="background: ${color}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">${loteName}</div>`,
            iconAnchor: [45, 14],
          });

          L.marker(centroid, { icon: labelIcon, interactive: false }).addTo(map);

          drawnPolygonLayerRef.current = null;
        }

        // Notify parent
        if (onLoteUpdated) {
          onLoteUpdated(updatedLote);
        }

        toast.success("Área del lote guardada");
      } catch (err) {
        if (apiError) {
          apiError.textContent = "Error de conexión. Intenta de nuevo.";
          apiError.style.display = "block";
        }

        toast.error("No se pudo guardar el área");

        // Re-enable save button
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Guardar área";
          saveBtn.style.opacity = "1";
        }
      }
    }

    // ── Flow C Cancel handler ──
    function handleFlowCCancel() {
      // Close popup
      map.closePopup(popup);
      activePopupRef.current = null;

      // Remove drawn polygon
      if (drawnPolygonLayerRef.current) {
        map.removeLayer(drawnPolygonLayerRef.current);
        drawnPolygonLayerRef.current = null;
      }

      // Reactivate the Drawing_Tool so user can try again
      if (mapInstance.current && LRef.current && drawControlRef.current) {
        activateDrawTool(LRef.current, mapInstance.current, drawControlRef.current);
      }
    }
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: "400px" }}>
      <div
        ref={mapRef}
        className="w-full h-full"
        aria-label={`Mapa interactivo de ${finca?.nombre ?? "la finca"}`}
      />
      <EditControls
        visible={mapMode === "edit"}
        loading={editLoading}
        onSave={handleEditSave}
        onCancel={handleEditCancel}
      />
    </div>
  );
}
