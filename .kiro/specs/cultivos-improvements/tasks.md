# Implementation Plan: Cultivos Improvements

## Overview

Implementación de cuatro mejoras al módulo de Cultivos y al layout general de AgroTech: CRUD completo de lotes, gestión de registros de actividad (editar/eliminar), actualización en tiempo real al crear registros, y sidebar colapsable en desktop. Todas las tareas usan TypeScript, siguen patrones existentes del proyecto (API routes con auth + ownership, Client Components con estado local, Zod validación).

## Tasks

- [x] 1. Validaciones y tipos base
  - [x] 1.1 Agregar `loteFormSchema` en `src/lib/validations.ts`
    - Definir schema Zod con campos: nombre (1–100 chars), areaHa (0.01–10000), altitud (0–5000, opcional/nullable), pendiente (0–90, opcional/nullable), notas (max 500, opcional/nullable), fincaId (string requerido)
    - Exportar tipo `LoteFormData`
    - _Requirements: 1.2, 2.2_

  - [x] 1.2 Crear API route `src/app/api/lotes/route.ts` con handler POST
    - Autenticación con `getServerSession(authOptions)`
    - Validar body con `loteFormSchema`
    - Verificar que la finca pertenece al usuario autenticado (`finca.userId === session.user.id`)
    - Crear lote con `db.lote.create()` y retornar `{ data: lote }` con status 201
    - Retornar 400 para validación fallida, 401 sin sesión, 403 si finca no pertenece al usuario
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 1.3 Crear API route `src/app/api/lotes/[id]/route.ts` con handlers PUT y DELETE
    - **PUT**: Validar body con schema parcial de lote (nombre, areaHa, altitud, pendiente, notas), verificar ownership vía `Lote → Finca → User`, actualizar con `db.lote.update()`
    - **DELETE**: Verificar ownership, comprobar que no existan cultivos con `estado === "ACTIVO"` (retornar 409 si existen), eliminar con `db.lote.delete()`
    - Retornar 401/403/404/409 según corresponda
    - _Requirements: 2.2, 2.5, 3.2, 3.3, 3.4_

  - [x]* 1.4 Write property test for lote validation (Property 1)
    - **Property 1: Lote validation accepts valid data and rejects invalid data**
    - Usar fast-check para generar payloads con strings de longitud variable y números en rangos válidos/inválidos
    - Verificar que `loteFormSchema.safeParse` acepta válidos y rechaza inválidos
    - **Validates: Requirements 1.2, 2.2**

  - [x]* 1.5 Write property test for delete protection (Property 2)
    - **Property 2: Lotes with active cultivos cannot be deleted**
    - Generar combinaciones de cultivos con diferentes estados (ACTIVO, PAUSADO, FINALIZADO)
    - Verificar que la lógica de protección rechaza solo cuando hay al menos un ACTIVO
    - **Validates: Requirements 3.3**

- [x] 2. API de registros (editar/eliminar)
  - [x] 2.1 Crear API route `src/app/api/cultivos/[id]/registros/[registroId]/route.ts` con handlers PUT y DELETE
    - **PUT**: Validar body (tipo, descripcion, fecha), verificar ownership vía `RegistroCultivo → Cultivo → Lote → Finca → User`, actualizar registro
    - **DELETE**: Verificar ownership, eliminar registro con `db.registroCultivo.delete()`
    - Retornar 404 si registro no existe, 403 si no pertenece al usuario, 400 para validación fallida
    - _Requirements: 4.2, 4.4, 4.6, 5.3, 5.6, 5.7_

  - [x]* 2.2 Write property test for registro validation (Property 3)
    - **Property 3: Registro validation accepts valid data and rejects invalid data**
    - Generar descripciones de longitud variable (10–2000 valid, fuera inválido), tipos enum aleatorios, fechas pasadas/futuras
    - Verificar que `registroFormSchema.safeParse` acepta válidos y rechaza inválidos
    - **Validates: Requirements 4.2**

- [x] 3. Checkpoint — Verificar API routes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Componente LoteForm y CRUD de lotes en CultivosList
  - [x] 4.1 Crear componente `src/components/cultivos/LoteForm.tsx`
    - Props: `fincaId: string`, `lote?: Lote | null`, `onSuccess: (lote: Lote) => void`, `onCancel: () => void`
    - Formulario con campos: Nombre (Input), Área ha (Input type number), Altitud (Input type number, opcional), Pendiente (Input type number, opcional), Notas (Textarea, opcional)
    - Validación client-side con `loteFormSchema` y mensajes de error inline
    - Fetch POST `/api/lotes` en modo creación, PUT `/api/lotes/[id]` en modo edición
    - `toast.success()` en éxito, `toast.error()` en error manteniendo formulario abierto
    - Usar componentes `Input`, `Textarea`, `Button` de `@/components/ui`
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 2.1, 2.3, 2.4, 2.6_

  - [x] 4.2 Modificar `CultivosList` para agregar gestión de lotes
    - Agregar estado local: `const [lotes, setLotes] = useState(finca.lotes)`
    - Agregar botón "Agregar lote" en la parte superior que abre Modal con LoteForm en modo creación
    - Agregar íconos `Pencil` y `Trash2` en el header de cada lote
    - Ícono Pencil abre Modal con LoteForm en modo edición (lote pre-cargado)
    - Ícono Trash2 abre diálogo de confirmación que requiere escribir nombre exacto del lote
    - Tras crear/editar/eliminar lote: actualizar estado local `setLotes(...)` sin recargar página
    - _Requirements: 1.1, 1.5, 2.1, 2.4, 3.1, 3.5, 3.6, 3.7_

  - [x]* 4.3 Write unit tests for LoteForm
    - Verificar que formulario se renderiza con campos vacíos en modo creación
    - Verificar que campos se pre-cargan en modo edición
    - Verificar mensajes de error inline con datos inválidos
    - _Requirements: 1.1, 2.1, 2.3_

- [x] 5. Gestión de registros en CultivosList
  - [x] 5.1 Modificar `CultivosList` para agregar editar/eliminar registros
    - Agregar íconos `Pencil` y `Trash2` en cada registro de la sección "Actividad reciente"
    - Ícono Pencil abre Modal con RegistroForm en modo edición (pre-cargado con tipo, descripcion, fecha del registro)
    - Ícono Trash2 abre diálogo de confirmación simple (mensaje "esta acción no se puede deshacer" + botones Cancelar/Confirmar)
    - Tras editar: fetch PUT `/api/cultivos/[id]/registros/[registroId]`, actualizar registro en estado local
    - Tras eliminar: fetch DELETE, remover registro del estado local, actualizar contador
    - `toast.success()` en éxito, `toast.error()` en error
    - _Requirements: 4.1, 4.3, 4.5, 5.1, 5.2, 5.4, 5.5_

  - [x] 5.2 Modificar `RegistroForm` para soportar modo edición
    - Agregar prop opcional `registro?: RegistroCultivo` para pre-cargar campos
    - Agregar prop opcional `onEditSuccess?: (registro: RegistroCultivo) => void`
    - Si `registro` está presente, hacer PUT en vez de POST y llamar `onEditSuccess`
    - _Requirements: 4.1, 4.2, 4.5_

  - [x]* 5.3 Write property test for registros ordering (Property 4)
    - **Property 4: Registros are always displayed in descending date order**
    - Generar arrays de registros con fechas aleatorias, aplicar sort, verificar invariante de orden descendente
    - **Validates: Requirements 6.2**

- [x] 6. Actualización en tiempo real al crear registros
  - [x] 6.1 Modificar `CultivosList` para reemplazar reload con fetch dirigido
    - Tras crear registro exitosamente: fetch GET `/api/cultivos/[cultivoId]/registros`
    - Reemplazar array de registros del cultivo en el estado local con respuesta del servidor
    - Actualizar contador de registros (`_count.registros`) en la tarjeta del cultivo
    - Ordenar registros por fecha descendente (más reciente primero)
    - Si fetch falla: mantener registros previos + `toast.error("No se pudieron actualizar los registros")`
    - Cerrar modal y mostrar toast de éxito antes de que la lista se actualice
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Checkpoint — Verificar módulo cultivos
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Sidebar colapsable en desktop
  - [x] 8.1 Extender `SidebarProvider` con estado collapsed
    - Agregar `collapsed: boolean` y `toggleCollapsed: () => void` al contexto
    - Hidratar `collapsed` desde `localStorage.getItem("sidebar-collapsed")` en un `useEffect` (default: false)
    - Persistir a localStorage en cada cambio de `collapsed` con try/catch para manejar localStorage no disponible
    - _Requirements: 7.6, 7.7_

  - [x] 8.2 Modificar `Sidebar` para soportar estado colapsado
    - Leer `collapsed` del contexto `useSidebar()`
    - Condicionar ancho: `w-[220px]` vs `w-[68px]` con transición CSS `transition-all duration-[250ms] ease`
    - Ocultar labels de navegación, tarjeta de finca, texto del logo, y nombre de usuario cuando collapsed
    - Mostrar solo ícono de hoja del logo cuando collapsed
    - Agregar tooltips (atributo `title`) en cada link de navegación cuando collapsed
    - Agregar botón toggle (`PanelLeftClose` cuando expandido / `PanelLeftOpen` cuando colapsado) encima del enlace de Configuración en el footer
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.8_

  - [x] 8.3 Modificar dashboard layout para ajustar margen del contenido
    - Convertir el `div.main-content` a un Client Component wrapper que lea `collapsed` del contexto
    - Ajustar clase: `md:ml-[220px]` vs `md:ml-[68px]` con transición CSS `transition-all duration-[250ms] ease`
    - _Requirements: 7.5_

  - [x]* 8.4 Write property test for sidebar persistence round-trip (Property 5)
    - **Property 5: Sidebar state persistence round-trip**
    - Generar secuencias aleatorias de toggle operations, verificar que localStorage refleja estado final correcto
    - **Validates: Requirements 7.6, 7.7**

- [x] 9. Final checkpoint — Verificar todo el feature
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- No Prisma schema changes required — existing models cover all needs
- All API routes follow existing pattern: `getServerSession` → ownership check → Prisma operation → `NextResponse.json()`
- All client interactions use `react-hot-toast` for feedback

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "2.1", "8.1"] },
    { "id": 3, "tasks": ["2.2", "4.1", "8.2"] },
    { "id": 4, "tasks": ["4.2", "5.2", "8.3"] },
    { "id": 5, "tasks": ["4.3", "5.1", "8.4"] },
    { "id": 6, "tasks": ["5.3", "6.1"] }
  ]
}
```
