# Technical Design Document

## Overview

Este diseño describe la implementación técnica del flujo bidireccional de gestión de lotes entre los módulos Cultivos y Mapa. Se extiende la arquitectura existente de LeafletMap, MapaContainer, CultivosList y la API de lotes para soportar 4 flujos: creación desde Cultivos con navegación al mapa (A), creación directa desde el mapa con popup (B), asignación de área a lote existente (C), y edición de polígono existente (D). Se usa `leaflet-draw` (ya instalado) para dibujo/edición de polígonos y `L.popup()` nativo de Leaflet para formularios inline en el mapa.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      URL Parameters                              │
│         ?action=draw|edit&loteId={id}                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                   MapaContainer.tsx                               │
│  - Lee searchParams (action, loteId)                             │
│  - Coordina sidebar, banner y mapa                               │
│  - Gestiona estado: mode, activeLoteId, lotes[]                  │
└────────┬─────────────────────┬─────────────────────┬────────────┘
         │                     │                     │
    ┌────▼────┐          ┌─────▼─────┐        ┌─────▼─────┐
    │Sidebar  │          │  Banner   │        │LeafletMap │
    │(lotes   │◄────────►│(DrawMode/ │        │(draw/edit │
    │list +   │          │ EditMode) │        │ polygon   │
    │actions) │          └───────────┘        │ rendering)│
    └─────────┘                               └─────┬─────┘
                                                    │
                                              ┌─────▼─────┐
                                              │L.popup()  │
                                              │(form HTML)│
                                              └─────┬─────┘
                                                    │
                                              ┌─────▼─────┐
                                              │/api/lotes │
                                              │POST / PUT │
                                              └───────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   CultivosList.tsx                                │
│  - Chips de estado: "Sin área en mapa" / "Área mapeada ✓"       │
│  - LoteForm con sección preview + botón "Dibujar área en mapa"  │
│  - Navegación a /dashboard/mapa?action=draw&loteId={id}          │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. MapaContainer.tsx (Refactor)

**Archivo:** `src/components/mapa/MapaContainer.tsx`

**Cambios:**
- Agregar lectura del parámetro `loteId` de searchParams
- Nuevo estado `mapMode: 'view' | 'draw-new' | 'draw-existing' | 'edit'`
- Nuevo estado `activeLoteId: string | null`
- Lógica de resolución de modo basada en URL params:
  - `action=draw` sin `loteId` → `draw-new`
  - `action=draw` con `loteId` → `draw-existing`
  - `action=edit` con `loteId` → `edit`
  - Sin `action` → `view`
- Validación de `loteId` contra la lista de lotes cargados
- Banner dinámico según el modo activo
- Callbacks para manejar inicio/fin de dibujo y edición desde el sidebar

**Props que pasa a LeafletMap:**
```typescript
interface LeafletMapProps {
  finca: FincaWithLotes;
  mapMode: 'view' | 'draw-new' | 'draw-existing' | 'edit';
  activeLoteId: string | null;
  activeLoteName: string | null;
  onLoteCreated: (lote: Lote) => void;
  onLoteUpdated: (lote: Lote) => void;
  onModeChange: (mode: 'view') => void;
}
```

### 2. LeafletMap.tsx (Refactor mayor)

**Archivo:** `src/components/mapa/LeafletMap.tsx`

**Cambios principales:**
- Eliminar el modelo callback `onPolygonDrawn`/`onDrawCancelled` existente
- El componente ahora gestiona internamente el flujo completo (dibujo → popup → API → render)
- Usar `L.popup()` nativo con contenido HTML para los formularios
- Implementar modo edición con `L.EditToolbar.Edit`
- Manejar los 3 modos: draw-new, draw-existing, edit

**Lote_Popup contenido HTML para Flujo B (draw-new):**
```html
<div style="font-family: system-ui; min-width: 240px; padding: 8px;">
  <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Nuevo lote</h3>
  <div style="margin-bottom: 8px;">
    <label style="font-size: 11px; display: block; margin-bottom: 4px;">Nombre *</label>
    <input id="popup-nombre" type="text" maxlength="100" style="..." />
    <span id="popup-nombre-error" style="color: red; font-size: 11px; display: none;"></span>
  </div>
  <div style="margin-bottom: 8px;">
    <label style="font-size: 11px; display: block; margin-bottom: 4px;">Área (ha)</label>
    <input id="popup-area" type="number" step="0.01" min="0.01" max="10000" value="{calculatedArea}" style="..." />
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
    <div>
      <label style="font-size: 11px; display: block; margin-bottom: 4px;">Altitud (msnm)</label>
      <input id="popup-altitud" type="number" min="0" max="5000" style="..." />
    </div>
    <div>
      <label style="font-size: 11px; display: block; margin-bottom: 4px;">Pendiente (°)</label>
      <input id="popup-pendiente" type="number" min="0" max="90" style="..." />
    </div>
  </div>
  <div id="popup-api-error" style="color: red; font-size: 11px; display: none; margin-bottom: 8px;"></div>
  <div style="display: flex; gap: 8px; justify-content: flex-end;">
    <button id="popup-cancel-btn" style="...">Cancelar</button>
    <button id="popup-save-btn" style="...">Guardar lote</button>
  </div>
</div>
```

**Lote_Popup contenido HTML para Flujo C (draw-existing):**
```html
<div style="font-family: system-ui; min-width: 200px; padding: 8px;">
  <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Confirmar área</h3>
  <div style="margin-bottom: 12px;">
    <label style="font-size: 11px; display: block; margin-bottom: 4px;">Área calculada (ha)</label>
    <input id="popup-area" type="number" step="0.01" min="0.01" max="10000" value="{calculatedArea}" style="..." />
  </div>
  <div id="popup-api-error" style="..."></div>
  <div style="display: flex; gap: 8px; justify-content: flex-end;">
    <button id="popup-cancel-btn" style="...">Cancelar</button>
    <button id="popup-save-btn" style="...">Guardar área</button>
  </div>
</div>
```

**Event binding pattern (tras popup.openOn(map)):**
```typescript
popup.on('add', () => {
  const saveBtn = document.getElementById('popup-save-btn');
  const cancelBtn = document.getElementById('popup-cancel-btn');
  saveBtn?.addEventListener('click', handleSave);
  cancelBtn?.addEventListener('click', handleCancel);
});
```

**Modo edición:**
- Cuando `mapMode === 'edit'` y `activeLoteId` tiene valor:
  1. Encontrar la layer del lote en el mapa
  2. Activar `.editing.enable()` sobre esa layer
  3. Guardar una copia del geoJson original para revertir en caso de cancelación
  4. Mostrar botones flotantes "Guardar cambios" / "Cancelar" como un custom Control o div posicionado absolutamente

### 3. MapSidebar.tsx (Nuevo componente, extraído del sidebar inline)

**Archivo:** `src/components/mapa/MapSidebar.tsx`

**Responsabilidades:**
- Mostrar lista de lotes con nombre, área, datos básicos
- Botón "Dibujar nuevo lote" que llama `onStartDraw()`
- Ícono Pencil (size 14) junto a lotes con geoJson → llama `onStartEdit(loteId)`
- Ícono MapPin (size 14) junto a lotes sin geoJson → llama `onStartDrawForLote(loteId)`
- Estado vacío cuando no hay lotes

```typescript
interface MapSidebarProps {
  finca: FincaWithLotes;
  lotes: LoteWithCultivo[];
  onStartDraw: () => void;
  onStartDrawForLote: (loteId: string) => void;
  onStartEdit: (loteId: string) => void;
}
```

### 4. DrawModeBanner.tsx (Refactor)

**Archivo:** `src/components/mapa/DrawModeBanner.tsx`

**Cambios:**
- Recibe prop `message: string` en lugar de solo `visible: boolean`
- Recibe prop `variant: 'info' | 'edit' | 'error'`
- Para modo edit: muestra texto de edición con color diferente
- Para error: muestra banner de error cuando loteId no es válido

```typescript
interface DrawModeBannerProps {
  visible: boolean;
  message: string;
  variant?: 'info' | 'edit' | 'error';
}
```

### 5. LoteForm.tsx (Refactor)

**Archivo:** `src/components/cultivos/LoteForm.tsx`

**Cambios:**
- Agregar sección "Área en el mapa (opcional)" después de los campos y antes de los botones
- Mini preview del mapa: un `<div>` de 180px con un mapa Leaflet estático (solo tiles, sin interactividad, centrado en la finca)
- Botón "Dibujar área en el mapa" con ícono MapPin
- Al hacer clic en "Dibujar área en el mapa":
  1. Validar campos requeridos
  2. POST a /api/lotes sin geoJson
  3. Al éxito: `router.push(/dashboard/mapa?action=draw&loteId={id})`
- Nuevo prop `fincaCoords?: { lat: number; lng: number }` para centrar el preview
- Estado de loading separado para cada botón (indicador visual en el botón activo)

### 6. CultivosList.tsx (Refactor)

**Archivo:** `src/components/cultivos/CultivosList.tsx`

**Cambios:**
- En el header de cada lote (debajo de la línea "X ha · Y msnm · Pendiente Z°"), agregar los chips de mapeo:
  - Si `lote.geoJson === null`: chip gris "Sin área en mapa" + botón "Dibujar" → navega a `/dashboard/mapa?action=draw&loteId={lote.id}`
  - Si `lote.geoJson !== null`: chip verde "Área mapeada ✓" + botón "Editar área" → navega a `/dashboard/mapa?action=edit&loteId={lote.id}`
- Usar `router.push()` para la navegación

### 7. EditControls.tsx (Nuevo componente)

**Archivo:** `src/components/mapa/EditControls.tsx`

**Responsabilidades:**
- Renderizar dos botones flotantes posicionados absolutamente sobre el mapa
- "Guardar cambios" (variant primary) y "Cancelar" (variant secondary)
- Solo visible cuando `mapMode === 'edit'`

```typescript
interface EditControlsProps {
  visible: boolean;
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
}
```

## API Changes

### PUT /api/lotes/[id] (Nuevo endpoint)

**Archivo:** `src/app/api/lotes/[id]/route.ts`

**Operaciones:**
- `GET`: Obtener un lote específico (con cultivos activos)
- `PUT`: Actualizar lote (nombre, area, altitud, pendiente, notas, geoJson)
- `DELETE`: Eliminar lote (existente, mover aquí)

**PUT handler:**
```typescript
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return 401;

  const lote = await db.lote.findUnique({
    where: { id: params.id },
    include: { finca: { select: { userId: true } } }
  });

  if (!lote) return 404;
  if (lote.finca.userId !== session.user.id) return 403;

  const body = await req.json();
  // Validate with loteUpdateWithGeoSchema (similar to create but all fields optional)

  const updated = await db.lote.update({
    where: { id: params.id },
    data: { ...validatedData }
  });

  return NextResponse.json({ data: updated }, { status: 200 });
}
```

**Nuevo schema de validación para update:**
```typescript
export const loteUpdateWithGeoSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  areaHa: z.number().min(0.01).max(10000).optional(),
  altitud: z.number().min(0).max(5000).optional().nullable(),
  pendiente: z.number().min(0).max(90).optional().nullable(),
  notas: z.string().max(500).optional().nullable(),
  geoJson: geoJsonPolygonSchema.optional().nullable(),
});
```

### GET /api/lotes (Actualizar)

**Cambio:** Agregar `GET` handler al archivo existente `src/app/api/lotes/route.ts` que retorna todos los lotes de la finca del usuario con cultivos activos.

```typescript
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return 401;

  const finca = await db.finca.findFirst({
    where: { userId: session.user.id },
    include: {
      lotes: {
        include: {
          cultivos: { where: { estado: 'ACTIVO' }, take: 1 }
        }
      }
    }
  });

  return NextResponse.json({ data: finca?.lotes ?? [] });
}
```

## Data Models

No hay cambios al schema de Prisma. El modelo `Lote` ya tiene:
- `geoJson: Json?` — almacena el GeoJSON Polygon directamente
- `lat: Float?` / `lng: Float?` — coordenadas para marcador fallback
- `areaHa: Float` — área en hectáreas

## Utility Functions

### src/lib/geo.ts (Sin cambios)

Las funciones existentes ya cubren todos los requerimientos:
- `calculateGeodesicArea()` — cálculo de área geodésica con clamp [0.01, 10000]
- `isSelfIntersecting()` — detección de auto-intersección
- `isValidPolygon()` — validación completa de coordenadas

### Centroid calculation (inline en LeafletMap)

Se usa el método `polygon.getBounds().getCenter()` de Leaflet (bounding box center), que ya está implementado en el código actual para posicionar labels.

## Color Palette

```typescript
const LOTE_COLORS = ["#639922", "#1D9E75", "#BA7517", "#185FA5", "#8B3A8A", "#C0392B"];
```

**Actualizar** la paleta existente en `LeafletMap.tsx` de 4 a 6 colores. Asignación: `LOTE_COLORS[index % 6]`.

**Estilo de polígonos:**
```typescript
{ color: LOTE_COLORS[i % 6], weight: 2, fillColor: LOTE_COLORS[i % 6], fillOpacity: 0.25 }
```

## Dependencies

**Nueva dependencia:** Ninguna. `leaflet-draw` ya está instalado y en uso.

## File Structure (cambios)

```
src/
├── app/api/lotes/
│   ├── route.ts           ← Agregar GET handler
│   └── [id]/
│       └── route.ts       ← NUEVO: GET, PUT, DELETE
├── components/mapa/
│   ├── MapaContainer.tsx  ← Refactor: multi-mode, sidebar extraction
│   ├── LeafletMap.tsx     ← Refactor: L.popup forms, edit mode
│   ├── MapSidebar.tsx     ← NUEVO: extraído del inline sidebar
│   ├── DrawModeBanner.tsx ← Refactor: dynamic message + variant
│   ├── EditControls.tsx   ← NUEVO: botones flotantes para edit mode
│   └── LoteCreatePanel.tsx ← Se elimina (funcionalidad movida a L.popup)
├── components/cultivos/
│   ├── CultivosList.tsx   ← Refactor: chips de estado de mapeo
│   └── LoteForm.tsx       ← Refactor: sección preview + botón dibujar
└── lib/
    ├── geo.ts             ← Sin cambios
    └── validations.ts     ← Agregar loteUpdateWithGeoSchema
```

## State Management

El estado se maneja localmente en MapaContainer con `useState`:

```typescript
// Modo del mapa derivado de URL params
const [mapMode, setMapMode] = useState<'view' | 'draw-new' | 'draw-existing' | 'edit'>('view');
const [activeLoteId, setActiveLoteId] = useState<string | null>(null);
const [lotes, setLotes] = useState<LoteWithCultivo[]>(finca?.lotes ?? []);
const [bannerMessage, setBannerMessage] = useState<string>('');
const [bannerVariant, setBannerVariant] = useState<'info' | 'edit' | 'error'>('info');
```

**Actualización reactiva del sidebar:** Cuando `onLoteCreated` o `onLoteUpdated` se dispara desde LeafletMap, MapaContainer actualiza `lotes` state y el sidebar re-renderiza.

## Error Handling

1. **loteId inválido en URL:** Banner de error, Drawing_Tool no se activa
2. **API failures:** toast.error + popup permanece abierto con datos preservados
3. **Auto-intersección:** toast.error + polígono descartado (draw-new) o edit mode preservado (edit)
4. **Map init failure:** Banner con botón "Reintentar" (ya implementado)

## Performance Considerations

- `LeafletMap` usa `dynamic(() => import(...), { ssr: false })` para evitar SSR
- Los popups usan HTML nativo (no React portals) para rendimiento en Leaflet
- El sidebar se extrae como componente separado para memoización independiente
- La lista de lotes se actualiza optimísticamente sin refetch de la API

## Correctness Properties

### Property 1: Idempotencia de geoJson en PUT
Enviar el mismo geoJson múltiples veces al PUT /api/lotes/[id] produce siempre el mismo resultado almacenado.

**Validates: Requirements 7.3**

### Property 2: Consistencia de área
Si un polígono se dibuja y el usuario no edita el campo de área manualmente, el valor persistido en `areaHa` debe coincidir con `calculateGeodesicArea(coordinates)` del geoJson guardado.

**Validates: Requirements 6.1**

### Property 3: Reversibilidad de edición
Si el usuario cancela el Edit_Mode, el polígono en el mapa vuelve exactamente a las coordenadas previas sin pérdida de precisión.

**Validates: Requirements 5.8**

### Property 4: Exclusividad de modo
Solo un modo (view/draw-new/draw-existing/edit) puede estar activo a la vez. Activar un modo desactiva cualquier otro.

**Validates: Requirements 10.1, 10.2, 10.3, 10.5**

### Property 5: Integridad referencial
El chip "Área mapeada ✓" en CultivosList se muestra si y solo si `lote.geoJson !== null` en la respuesta del servidor.

**Validates: Requirements 2.1, 2.2**

### Property 6: Validación de coordenadas
Todo geoJson almacenado pasa la validación de `geoJsonPolygonSchema` (anillo cerrado, ≥4 posiciones, coordenadas en rango WGS84, ≤100 posiciones totales).

**Validates: Requirements 7.5, 7.6, 7.7**

## Testing Strategy

1. **Unit tests (geo.ts):** Property-based tests existentes para `calculateGeodesicArea` e `isSelfIntersecting` ya cubren edge cases. Agregar tests para el clamping [0.01, 10000].
2. **Unit tests (validations.ts):** Tests para `loteUpdateWithGeoSchema` con payloads válidos e inválidos (geoJson null, geoJson parcial, coordenadas fuera de rango).
3. **API integration tests:** Test para PUT /api/lotes/[id] verificando: ownership check, geoJson update, geoJson removal (null), validation errors 400.
4. **Component tests (CultivosList):** Verificar renderizado de chips según estado de geoJson y navegación correcta al hacer clic.
5. **E2E smoke test:** Flujo A completo (crear lote → navegar al mapa → verificar banner con nombre del lote).
