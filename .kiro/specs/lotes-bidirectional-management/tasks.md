# Implementation Plan: Gestión Bidireccional de Lotes (Cultivos ↔ Mapa)

## Overview

Implementación del flujo bidireccional de creación y edición de lotes entre los módulos Cultivos y Mapa. Se crean nuevos endpoints API, se refactorizan componentes del mapa para soportar múltiples modos (draw-new, draw-existing, edit), se agregan chips de estado en Cultivos, y se usa L.popup() nativo para formularios inline en el mapa.

## Tasks

- [x] 1. API endpoint PUT /api/lotes/[id] y schema de validación de update
  - Create `src/app/api/lotes/[id]/route.ts` with GET, PUT, DELETE handlers
  - Add `loteUpdateWithGeoSchema` to `src/lib/validations.ts` (all fields optional, geoJson nullable)
  - PUT handler: verify session, verify ownership (lote.finca.userId === session.user.id), validate with schema, update lote, return 200
  - GET handler: return lote with active cultivos
  - DELETE handler: move existing delete logic
  - Return 404 for non-existent lotes, 403 for wrong ownership
  - Add GET handler to existing `src/app/api/lotes/route.ts` to list all lotes for user's finca

- [x] 2. Actualizar paleta de colores a 6 colores y constante compartida
  - Update LOTE_COLORS in `src/components/mapa/LeafletMap.tsx` from 4 to 6 colors: ["#639922", "#1D9E75", "#BA7517", "#185FA5", "#8B3A8A", "#C0392B"]
  - Extract color constant to be importable from both LeafletMap and MapSidebar
  - Update polygon style: weight 2, fillOpacity 0.25
  - Ensure label uses assigned color as background with white text

- [x] 3. Extraer MapSidebar como componente independiente
  - Create `src/components/mapa/MapSidebar.tsx` extracting the inline sidebar from MapaContainer
  - Props: finca, lotes, onStartDraw, onStartDrawForLote, onStartEdit
  - Show "Dibujar nuevo lote" button at top
  - Show Pencil icon (size 14) next to lotes with geoJson → calls onStartEdit(loteId)
  - Show MapPin icon (size 14) next to lotes without geoJson → calls onStartDrawForLote(loteId)
  - Empty state when no lotes exist
  - Use the 6-color palette for lote color indicators

- [x] 4. Refactorizar DrawModeBanner para soportar múltiples mensajes y variantes
  - Update `src/components/mapa/DrawModeBanner.tsx` to accept message and variant props
  - Variant info: green-left border for draw mode
  - Variant edit: blue-left border for edit mode
  - Variant error: red-left border for error states
  - Keep existing icon (Pencil for info/edit, alert icon for error)

- [x] 5. Refactorizar MapaContainer para modo multi-mode con URL params
  - Read loteId from searchParams in addition to existing action
  - Implement mode resolution: draw without loteId → draw-new, draw with loteId → draw-existing, edit with loteId → edit, no action → view
  - Validate loteId against loaded lotes list
  - Show appropriate banner message per mode
  - Handle error cases: invalid loteId, lote without geoJson for edit mode
  - Pass mapMode, activeLoteId, activeLoteName to LeafletMap
  - Remove LoteCreatePanel usage (replaced by L.popup in LeafletMap)
  - Wire sidebar callbacks to update mapMode state

- [x] 6. Refactorizar LeafletMap para Flujo B — creación desde mapa con L.popup
  - When mapMode is draw-new and polygon is completed: calculate area, calculate centroid, open L.popup with full form HTML
  - Bind event listeners via document.getElementById after popup opens
  - On save: validate nombre, POST to /api/lotes with geoJson, close popup, keep polygon, update sidebar, toast success
  - On cancel: close popup, remove drawn polygon
  - On validation error: show inline error in popup
  - On API error: show error message in popup, keep popup open
  - Handle self-intersecting polygon detection (toast.error, discard polygon)

- [x] 7. Implementar Flujo C en LeafletMap — asignación de área a lote existente
  - When mapMode is draw-existing and activeLoteId is set: auto-activate Drawing_Tool within 2 seconds
  - On polygon complete: open simplified popup (only area field + save/cancel)
  - On save: PUT /api/lotes/{loteId} with geoJson and areaHa, close popup, toast success
  - On cancel: close popup, remove polygon, reactivate Drawing_Tool
  - On API error: keep popup open, show toast.error

- [x] 8. Implementar Flujo D en LeafletMap — edición de polígono existente
  - Create `src/components/mapa/EditControls.tsx` (floating buttons: Guardar cambios / Cancelar)
  - When mapMode is edit and activeLoteId is set: find polygon layer, store original geoJson, enable editing
  - Show EditControls overlay
  - On save: validate not self-intersecting, recalculate area, PUT /api/lotes/{id}, disable editing, toast success
  - On cancel: revert polygon to original coordinates, disable editing
  - On API error: toast.error, keep edit mode active
  - Handle URL-based edit (action=edit&loteId from Cultivos)

- [x] 9. Agregar chips de estado de mapeo en CultivosList
  - In the lote header section after the data line (ha, msnm, pendiente):
  - If lote.geoJson is null: render chip "Sin área en mapa" (badge-neutral) + button "Dibujar" → router.push to mapa with draw action
  - If lote.geoJson is not null: render chip "Área mapeada ✓" (badge-success) + button "Editar área" → router.push to mapa with edit action
  - Position chips below lote data, above cultivos section

- [x] 10. Refactorizar LoteForm con sección preview de mapa y botón "Dibujar área en el mapa"
  - Add section "Área en el mapa (opcional)" below form fields, before action buttons
  - Add a static mini map preview (180px height, non-interactive, centered on finca coords)
  - Add button "Dibujar área en el mapa" with MapPin icon
  - On click: validate required fields, POST /api/lotes without geoJson, on success navigate to /dashboard/mapa with draw action and loteId
  - Disable both buttons while API call is in progress, show loading indicator
  - Handle API errors: toast.error, keep modal open
  - Accept new prop fincaCoords from CultivosList

- [ ] 11. Eliminar LoteCreatePanel y limpiar imports obsoletos
  - Delete `src/components/mapa/LoteCreatePanel.tsx`
  - Remove all references and imports of LoteCreatePanel from MapaContainer
  - Remove unused state variables from MapaContainer
  - Verify no broken imports across the codebase

## Task Dependency Graph

```json
{
  "waves": [
    {"tasks": ["1", "2", "4"]},
    {"tasks": ["3"]},
    {"tasks": ["5", "9", "10"]},
    {"tasks": ["6"]},
    {"tasks": ["7", "8"]},
    {"tasks": ["11"]}
  ]
}
```

```
Task 1 (API)
Task 2 (Colors)
Task 4 (Banner)

Task 2 → Task 3 (Sidebar)

Task 3 + Task 4 → Task 5 (MapaContainer refactor)

Task 1 + Task 5 → Task 6 (Flujo B - draw new)
Task 1 → Task 9 (Chips en Cultivos)
Task 1 → Task 10 (LoteForm preview)

Task 6 → Task 7 (Flujo C - draw existing)
Task 6 → Task 8 (Flujo D - edit)

Task 6 + Task 7 + Task 8 → Task 11 (Cleanup)
```

## Notes

- `leaflet-draw` ya está instalado en el proyecto, no necesita instalación adicional
- El modelo Prisma `Lote` ya tiene el campo `geoJson: Json?` — no se requieren migraciones
- Las funciones `calculateGeodesicArea` e `isSelfIntersecting` ya existen en `src/lib/geo.ts`
- El esquema de validación `geoJsonPolygonSchema` ya existe en `src/lib/validations.ts`
- Se usa L.popup() nativo de Leaflet (no React portals) para los formularios inline por rendimiento
- Los tasks 1, 2 y 4 no tienen dependencias y pueden ejecutarse en paralelo
