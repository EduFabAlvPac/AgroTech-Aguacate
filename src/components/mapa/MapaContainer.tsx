"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { Finca, Lote, Cultivo } from "@prisma/client";
import { DrawModeBanner } from "@/components/mapa/DrawModeBanner";
import { MapSidebar } from "@/components/mapa/MapSidebar";
import toast from "react-hot-toast";

type LoteWithCultivo = Lote & {
  cultivos: Partial<Cultivo>[];
  _count?: { cultivos: number };
};
type FincaWithLotes = (Finca & { lotes: LoteWithCultivo[] }) | null;

export type MapMode = "view" | "draw-new" | "draw-existing" | "edit";

// Lazy-load Leaflet only on client
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-agro-50 text-agro-400">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-agro-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[13px]">Cargando mapa...</p>
      </div>
    </div>
  ),
});

interface MapaContainerProps {
  finca: FincaWithLotes;
}

/**
 * Resolves the initial map mode from URL search params.
 */
function resolveInitialMode(
  action: string | null,
  loteId: string | null
): MapMode {
  if (action === "draw" && !loteId) return "draw-new";
  if (action === "draw" && loteId) return "draw-existing";
  if (action === "edit" && loteId) return "edit";
  return "view";
}

function MapaContainerInner({ finca }: MapaContainerProps) {
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const loteIdParam = searchParams.get("loteId");

  // Resolve initial mode from URL
  const initialMode = resolveInitialMode(action, loteIdParam);

  // State management
  const [mapMode, setMapMode] = useState<MapMode>(initialMode);
  const [activeLoteId, setActiveLoteId] = useState<string | null>(loteIdParam);
  const [lotes, setLotes] = useState<LoteWithCultivo[]>(finca?.lotes ?? []);
  const [mapInitError, setMapInitError] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // Validate loteId against loaded lotes and determine error state
  const loteValidation = useMemo(() => {
    if (!activeLoteId) {
      return { valid: true, error: null };
    }

    const lote = lotes.find((l) => l.id === activeLoteId);

    if (!lote) {
      return { valid: false, error: "not-found" as const };
    }

    if (mapMode === "edit" && !lote.geoJson) {
      return { valid: false, error: "no-geojson" as const };
    }

    return { valid: true, error: null };
  }, [activeLoteId, lotes, mapMode]);

  // Get active lote name for banner messages
  const activeLoteName = useMemo(() => {
    if (!activeLoteId) return null;
    const lote = lotes.find((l) => l.id === activeLoteId);
    return lote?.nombre ?? null;
  }, [activeLoteId, lotes]);

  // Derive banner props from mode and validation
  const bannerProps = useMemo(() => {
    // Error states take priority
    if (loteValidation.error === "not-found") {
      return {
        visible: true,
        message: "Lote no encontrado",
        variant: "error" as const,
      };
    }

    if (loteValidation.error === "no-geojson") {
      return {
        visible: true,
        message: "El lote no tiene área para editar",
        variant: "error" as const,
      };
    }

    switch (mapMode) {
      case "draw-new":
        return {
          visible: true,
          message: "Dibuja el perímetro del lote y haz clic para cerrar",
          variant: "info" as const,
        };
      case "draw-existing":
        return {
          visible: true,
          message: `Dibuja el área del lote ${activeLoteName ?? ""}`,
          variant: "info" as const,
        };
      case "edit":
        return {
          visible: true,
          message: `Editando área de ${activeLoteName ?? ""} - Arrastra los vértices para ajustar`,
          variant: "edit" as const,
        };
      case "view":
      default:
        return {
          visible: false,
          message: "",
          variant: "info" as const,
        };
    }
  }, [mapMode, loteValidation, activeLoteName]);

  // Map init timeout (10s) when in draw/edit mode
  useEffect(() => {
    if (mapMode === "view") return;

    const timeout = setTimeout(() => {
      const mapContainer = document.querySelector(".leaflet-container");
      if (!mapContainer) {
        setMapInitError(true);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [mapMode, mapKey]);

  // Sync lotes when finca changes
  useEffect(() => {
    setLotes(finca?.lotes ?? []);
  }, [finca]);

  // Handle retry when map fails to init
  const handleRetry = useCallback(() => {
    setMapInitError(false);
    setMapKey((prev) => prev + 1);
  }, []);

  // Sidebar callback: start drawing a new lote (Flujo B)
  const handleStartDraw = useCallback(() => {
    setMapMode("draw-new");
    setActiveLoteId(null);
  }, []);

  // Sidebar callback: start drawing area for an existing lote (Flujo C)
  const handleStartDrawForLote = useCallback((loteId: string) => {
    setMapMode("draw-existing");
    setActiveLoteId(loteId);
  }, []);

  // Sidebar callback: start editing an existing lote polygon (Flujo D)
  const handleStartEdit = useCallback((loteId: string) => {
    setMapMode("edit");
    setActiveLoteId(loteId);
  }, []);

  // Callback from LeafletMap when a lote is created
  const handleLoteCreated = useCallback((lote: Lote) => {
    const loteWithCultivo: LoteWithCultivo = { ...lote, cultivos: [] };
    setLotes((prev) => [...prev, loteWithCultivo]);
    setMapMode("view");
    setActiveLoteId(null);
  }, []);

  // Callback from LeafletMap when a lote is updated
  const handleLoteUpdated = useCallback((lote: Lote) => {
    setLotes((prev) =>
      prev.map((l) => (l.id === lote.id ? { ...l, ...lote } : l))
    );
    setMapMode("view");
    setActiveLoteId(null);
  }, []);

  // Callback from LeafletMap to change mode (e.g., back to view after cancel)
  const handleModeChange = useCallback((mode: "view") => {
    setMapMode(mode);
    setActiveLoteId(null);
  }, []);

  // Callback: delete a lote (Problema 2)
  const handleDeleteLote = useCallback(async (loteId: string) => {
    try {
      const response = await fetch(`/api/lotes/${loteId}`, { method: "DELETE" });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "No se pudo eliminar el lote" }));
        toast.error(errorData.error ?? "No se pudo eliminar el lote");
        return;
      }

      setLotes((prev) => prev.filter((l) => l.id !== loteId));
      // Force map re-render to remove polygon
      setMapKey((prev) => prev + 1);
      toast.success("Lote eliminado");
    } catch {
      toast.error("Error de conexión. No se pudo eliminar el lote.");
    }
  }, []);

  // Determine effective map mode (error states force view)
  const effectiveMapMode: MapMode = loteValidation.valid ? mapMode : "view";

  return (
    <div className="flex h-full" style={{ height: "calc(100vh - 64px)" }}>
      {/* Sidebar */}
      <MapSidebar
        finca={finca}
        lotes={lotes}
        onStartDraw={handleStartDraw}
        onStartDrawForLote={handleStartDrawForLote}
        onStartEdit={handleStartEdit}
        onDeleteLote={handleDeleteLote}
      />

      {/* Map area with banner */}
      <div className="flex-1 flex flex-col relative">
        {/* Mode banner */}
        <DrawModeBanner
          visible={bannerProps.visible}
          message={bannerProps.message}
          variant={bannerProps.variant}
        />

        {/* Map init error banner */}
        {mapInitError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-l-4 border-red-400 text-[var(--text-primary)]">
            <span className="text-sm">
              No se pudo cargar el mapa. Verifica tu conexión e intenta de nuevo.
            </span>
            <button
              onClick={handleRetry}
              className="ml-auto px-3 py-1 text-sm font-medium text-white bg-agro-400 rounded-[var(--radius-md)] hover:bg-agro-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Map container */}
        <div className="flex-1 relative">
          <LeafletMap
            key={mapKey}
            finca={finca}
            mapMode={effectiveMapMode}
            activeLoteId={loteValidation.valid ? activeLoteId : null}
            activeLoteName={activeLoteName}
            onLoteCreated={handleLoteCreated}
            onLoteUpdated={handleLoteUpdated}
            onModeChange={handleModeChange}
          />
        </div>
      </div>
    </div>
  );
}

export function MapaContainer({ finca }: MapaContainerProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full bg-agro-50 text-agro-400">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-agro-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[13px]">Cargando mapa...</p>
          </div>
        </div>
      }
    >
      <MapaContainerInner finca={finca} />
    </Suspense>
  );
}
