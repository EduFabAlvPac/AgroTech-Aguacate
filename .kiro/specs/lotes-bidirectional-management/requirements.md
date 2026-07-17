# Requirements Document

## Introduction

Gestión bidireccional de lotes entre el módulo de Cultivos y el módulo de Mapa en la plataforma AgroTech. El sistema permite cuatro flujos principales: (A) crear un lote desde Cultivos con opción de navegar al mapa para dibujar su área, (B) dibujar un polígono directamente en el mapa y crear el lote desde un popup de Leaflet, (C) dibujar el área de un lote existente que fue creado sin geometría desde Cultivos, y (D) editar el polígono de un lote que ya tiene geometría asignada. Se integra Leaflet Draw para el dibujo de polígonos, se usa un popup nativo de Leaflet para el formulario de creación desde el mapa, y se extiende la API existente para persistir y actualizar la geometría GeoJSON de cada lote.

## Glossary

- **LeafletMap**: Componente cliente (`src/components/mapa/LeafletMap.tsx`) que renderiza el mapa interactivo Leaflet con los lotes de la finca y gestiona los modos de dibujo y edición.
- **MapaContainer**: Componente contenedor (`src/components/mapa/MapaContainer.tsx`) que envuelve el sidebar y el mapa, lee parámetros de URL (`action`, `loteId`), y coordina la interacción entre el sidebar y el mapa.
- **CultivosList**: Componente cliente (`src/components/cultivos/CultivosList.tsx`) que muestra los lotes y cultivos del usuario, incluyendo el modal de creación de lote y los chips de estado de mapeo.
- **LoteForm**: Componente de formulario modal para crear/editar un lote desde el módulo de Cultivos, con sección de preview de mapa y botón para navegar a dibujar.
- **Drawing_Tool**: Herramienta de dibujo de polígonos proporcionada por la librería `leaflet-draw` integrada en LeafletMap.
- **Edit_Tool**: Herramienta de edición de polígonos existentes proporcionada por `leaflet-draw` que permite arrastrar vértices.
- **Lote_Popup**: Popup nativo de Leaflet (`L.popup`) anclado al centroide del polígono dibujado, que contiene un formulario HTML para crear o confirmar datos del lote.
- **GeoJSON_Polygon**: Objeto JSON conforme al estándar GeoJSON (RFC 7946) que representa la geometría del perímetro de un lote.
- **Drawing_Mode**: Estado activado por el parámetro de URL `action=draw` que inicia automáticamente la herramienta de dibujo al cargar el mapa.
- **Edit_Mode**: Estado activado por el parámetro de URL `action=edit&loteId={id}` o por clic en el ícono de edición del sidebar, que permite modificar un polígono existente.
- **Lotes_API**: Endpoints REST en `/api/lotes` (POST) y `/api/lotes/[id]` (GET, PUT, DELETE) para crear y actualizar lotes.
- **Area_Calculator**: Función cliente que calcula el área geodésica en hectáreas a partir de las coordenadas de un polígono usando la fórmula de Shoelace con proyección.
- **Centroid_Calculator**: Función cliente que calcula el centroide geométrico de un polígono para posicionar el popup de Leaflet.
- **Map_Sidebar**: Panel lateral izquierdo en la vista del mapa que lista los lotes de la finca con sus datos, estado de geoJson, y acciones de dibujo/edición.
- **Lote_Color_Palette**: Paleta rotativa de colores para los polígonos de lotes: ["#639922", "#1D9E75", "#BA7517", "#185FA5", "#8B3A8A", "#C0392B"].

## Requirements

### Requirement 1: Modal de creación de lote desde Cultivos con preview de mapa (Flujo A)

**User Story:** Como productor, quiero crear un lote desde el módulo de Cultivos y opcionalmente navegar al mapa para dibujar su área, para que pueda registrar los datos del lote de forma rápida y luego georreferenciar su perímetro cuando lo desee.

#### Acceptance Criteria

1. WHEN el usuario hace clic en "+ Agregar lote" en CultivosList, THE LoteForm SHALL abrirse en un modal mostrando los campos: nombre (requerido, máximo 100 caracteres), área en hectáreas (requerido, rango 0.01–10,000), altitud en msnm (opcional, rango 0–5,000), pendiente en grados (opcional, rango 0–90), y notas (opcional, máximo 500 caracteres).
2. THE LoteForm SHALL mostrar una sección titulada "Área en el mapa (opcional)" debajo de los campos del formulario y antes de los botones de acción, conteniendo un mini preview del mapa (altura 180px, no interactivo, solo visual) y un botón con texto "Dibujar área en el mapa" con ícono MapPin.
3. WHEN el usuario hace clic en "Dibujar área en el mapa" y los campos requeridos son válidos, THE LoteForm SHALL enviar una petición POST a Lotes_API sin campo geoJson, y al recibir respuesta exitosa (status 201) navegar a `/dashboard/mapa?action=draw&loteId={id}` usando el id del lote devuelto en la respuesta.
4. IF el usuario hace clic en "Dibujar área en el mapa" y los campos requeridos están vacíos o inválidos, THEN THE LoteForm SHALL mostrar los mensajes de error inline junto a los campos inválidos sin enviar la petición ni navegar.
5. WHEN el usuario hace clic en "Crear lote" (botón principal) y los campos requeridos son válidos, THE LoteForm SHALL enviar una petición POST a Lotes_API sin campo geoJson, cerrar el modal al recibir respuesta exitosa (status 201), agregar el lote a la lista local, y mostrar un toast.success con el mensaje "Lote creado correctamente".
6. IF la petición POST a Lotes_API falla (respuesta con status 4xx o 5xx) desde cualquiera de los dos flujos (botón "Crear lote" o "Dibujar área en el mapa"), THEN THE LoteForm SHALL mostrar un toast.error con el mensaje de error devuelto por la API, mantener el modal abierto con los datos del formulario preservados, y rehabilitar los botones de acción.
7. WHILE la petición POST a Lotes_API está en curso, THE LoteForm SHALL deshabilitar los botones "Crear lote" y "Dibujar área en el mapa", mostrar un indicador de carga en el botón que inició la acción, e ignorar cualquier clic adicional en el otro botón hasta que la petición se complete o falle.
8. WHEN la petición POST a Lotes_API retorna status 201 tras hacer clic en "Dibujar área en el mapa", THE LoteForm SHALL proceder con la navegación a `/dashboard/mapa?action=draw&loteId={id}` independientemente del estado actual de validación del formulario.

### Requirement 2: Chips de estado de mapeo en tarjeta de lote en Cultivos

**User Story:** Como productor, quiero ver en la tarjeta de cada lote si ya tiene un área dibujada en el mapa o no, para que pueda identificar rápidamente qué lotes necesitan georreferenciarse.

#### Acceptance Criteria

1. WHILE un lote en CultivosList tiene el campo `geoJson` con valor `null`, THE CultivosList SHALL mostrar un chip con clase `badge-neutral` y texto "Sin área en mapa", seguido de un botón con texto "Dibujar" que al hacer clic navega en la misma pestaña a `/dashboard/mapa?action=draw&loteId={id}`.
2. WHILE un lote en CultivosList tiene el campo `geoJson` con un valor no null (objeto JSON válido), THE CultivosList SHALL mostrar un chip con clase `badge-success` y texto "Área mapeada ✓", seguido de un botón con texto "Editar área" que al hacer clic navega en la misma pestaña a `/dashboard/mapa?action=edit&loteId={id}`.
3. THE CultivosList SHALL renderizar los chips de estado de mapeo en la sección del encabezado de cada lote, inmediatamente debajo de la línea de datos del lote (área en ha, altitud en msnm, pendiente en grados) y antes de la lista de tarjetas de cultivos.
4. IF el usuario hace clic en el botón "Dibujar" o "Editar área" y la navegación a `/dashboard/mapa` falla o la ruta no está disponible, THEN THE CultivosList SHALL permanecer en su estado actual sin pérdida de datos visibles y sin mostrar mensajes de error al usuario.

### Requirement 3: Creación de lote desde el mapa con popup de Leaflet (Flujo B)

**User Story:** Como productor, quiero dibujar un polígono directamente en el mapa y llenar los datos del lote en un popup, para que pueda crear lotes de forma visual sin salir de la vista del mapa.

#### Acceptance Criteria

1. THE Map_Sidebar SHALL mostrar un botón con texto "Dibujar nuevo lote" que, al hacer clic, activa la Drawing_Tool en el mapa añadiendo el parámetro de URL `action=draw`; la existencia visible del botón satisface este criterio independientemente de si la herramienta está activa.
2. WHEN el usuario hace clic en "Dibujar nuevo lote", THE MapaContainer SHALL mostrar un banner en la parte superior del mapa con el texto "Dibuja el perímetro del nuevo lote en el mapa" y un ícono de lápiz.
3. WHEN el usuario finaliza el dibujo de un polígono con 3 o más vértices y un máximo de 100 coordenadas totales, THE LeafletMap SHALL calcular automáticamente el área en hectáreas usando Area_Calculator y el centroide del polígono usando Centroid_Calculator.
4. IF el usuario finaliza el dibujo de un polígono cuyas líneas se cruzan entre sí (auto-intersección), THEN THE LeafletMap SHALL descartar el polígono, mostrar un toast.error con un mensaje indicando que las líneas no deben cruzarse, y no abrir el formulario de creación.
5. WHEN el usuario finaliza el dibujo de un polígono válido sin un loteId en la URL, THE LeafletMap SHALL abrir un Lote_Popup anclado al centroide calculado con un formulario que contiene: título "Nuevo lote", campo nombre del lote (input text, requerido, máximo 100 caracteres), campo área en ha (input number, pre-calculado desde el polígono, editable, rango 0.01–10000), campo altitud msnm (input number, opcional, rango 0–5000), campo pendiente en grados (input number, opcional, rango 0–90), botón "Guardar lote" (variante primary), y botón "Cancelar" (variante secondary).
6. WHEN el usuario hace clic en "Guardar lote" en el Lote_Popup y el campo nombre tiene entre 1 y 100 caracteres, THE LeafletMap SHALL enviar una petición POST a Lotes_API con los campos nombre, areaHa, altitud, pendiente, fincaId y el GeoJSON_Polygon del polígono dibujado.
7. WHEN Lotes_API responde exitosamente con status 201 tras la creación desde el Lote_Popup, THE LeafletMap SHALL cerrar el popup, mantener el polígono pintado en el mapa con el nombre del lote como label, actualizar la lista de lotes en Map_Sidebar, y mostrar un toast.success con el mensaje "Lote {nombre} creado correctamente".
8. WHEN el usuario hace clic en "Cancelar" en el Lote_Popup, THE LeafletMap SHALL cerrar el popup y eliminar el polígono dibujado del mapa, retornando al estado previo sin parámetro `action=draw` en la URL.
9. IF el usuario intenta guardar desde el Lote_Popup con el campo nombre vacío, THEN THE Lote_Popup SHALL resaltar el campo nombre con borde de color de error y mostrar el mensaje de validación "El nombre es requerido" debajo del campo, sin enviar la petición a Lotes_API.
10. IF Lotes_API responde con un error (status 400, 403, 404 o 500) tras el intento de creación desde el Lote_Popup, THEN THE Lote_Popup SHALL mostrar el mensaje de error retornado por la API dentro del formulario, mantener el popup abierto con los datos ingresados, y no eliminar el polígono dibujado.

### Requirement 4: Asignación de área a lote existente desde el mapa (Flujo C)

**User Story:** Como productor, quiero navegar al mapa desde la tarjeta de un lote sin área y dibujar su perímetro, para que pueda georreferenciar lotes que ya creé sin tener que re-ingresar sus datos.

#### Acceptance Criteria

1. WHEN MapaContainer detecta los parámetros de URL `action=draw` y `loteId={id}`, THE MapaContainer SHALL obtener el nombre del lote desde la lista de lotes cargados y mostrar un banner con el texto "Dibuja el área del lote {nombre}" en un máximo de 1 segundo tras el renderizado del componente.
2. WHEN MapaContainer detecta `action=draw` con `loteId`, THE Drawing_Tool SHALL activarse automáticamente en un máximo de 2 segundos tras la inicialización del mapa, sin requerir clic adicional del usuario.
3. WHEN el usuario finaliza el dibujo del polígono en modo Flujo C (con loteId presente en la URL), THE LeafletMap SHALL abrir un Lote_Popup simplificado anclado al centroide que muestra únicamente: el área calculada en un campo numérico editable (rango permitido: 0.01 a 10000 hectáreas, máximo 2 decimales), un botón "Guardar área" (estilo primario), y un botón "Cancelar" (estilo secundario).
4. WHEN el usuario hace clic en "Guardar área" en el popup simplificado, THE LeafletMap SHALL enviar una petición PUT a `/api/lotes/{loteId}` con el campo geoJson del polígono dibujado y el campo areaHa con el valor del campo de área (ya sea el calculado o el editado por el usuario).
5. WHEN Lotes_API responde exitosamente (status 200) al PUT, THE LeafletMap SHALL cerrar el popup, mantener el polígono pintado en el mapa, actualizar la tarjeta del lote en Map_Sidebar reflejando el nuevo valor de área en hectáreas, y mostrar un toast.success con el mensaje "Área del lote guardada".
6. IF el loteId proporcionado en la URL no corresponde a ningún lote del usuario, THEN THE MapaContainer SHALL mostrar un banner de error indicando que el lote no fue encontrado, no activar la Drawing_Tool, y no permitir ninguna funcionalidad de dibujo mientras el error persista.
7. IF la petición PUT a `/api/lotes/{loteId}` falla (status 4xx o 5xx o error de red), THEN THE LeafletMap SHALL mantener el popup abierto con el polígono dibujado visible, y mostrar un toast.error con un mensaje indicando que no se pudo guardar el área.
8. WHEN el usuario hace clic en "Cancelar" en el popup simplificado, THE LeafletMap SHALL cerrar el popup, eliminar el polígono dibujado del mapa, y reactivar la Drawing_Tool para permitir un nuevo dibujo.

### Requirement 5: Edición de polígono existente (Flujo D)

**User Story:** Como productor, quiero editar el polígono de un lote que ya tiene área dibujada, para que pueda ajustar los vértices si el perímetro del lote cambió o si lo dibujé incorrectamente.

#### Acceptance Criteria

1. WHILE un lote en Map_Sidebar tiene geoJson asignado, THE Map_Sidebar SHALL mostrar un ícono de lápiz (Pencil, size 14) junto al nombre del lote que al hacer clic activa el Edit_Mode para ese polígono.
2. WHEN MapaContainer detecta los parámetros de URL `action=edit` y `loteId={id}`, THE LeafletMap SHALL activar automáticamente el Edit_Mode sobre el polígono del lote especificado, permitiendo arrastrar los vértices.
3. WHEN el Edit_Mode se activa sobre un polígono (por clic en sidebar o por URL), THE MapaContainer SHALL mostrar un banner con el texto "Editando área de {nombre lote} - Arrastra los vértices para ajustar".
4. WHILE el Edit_Mode está activo, THE LeafletMap SHALL mostrar dos botones flotantes sobre el mapa: "Guardar cambios" (variante primary del componente Button) y "Cancelar" (variante secondary del componente Button).
5. WHEN el usuario hace clic en "Guardar cambios", THE LeafletMap SHALL validar que el polígono editado no sea auto-intersectante, recalcular el área en hectáreas con la función geodésica existente, y enviar una petición PUT a `/api/lotes/{id}` con el GeoJSON_Polygon actualizado y el área recalculada; al recibir respuesta exitosa (status 200) SHALL desactivar el Edit_Mode, actualizar el polígono y el área visualmente en sidebar, y mostrar un toast.success.
6. IF la petición PUT a `/api/lotes/{id}` durante el guardado de edición falla (status 4xx, 5xx, o error de red), THEN THE LeafletMap SHALL mostrar un toast.error con un mensaje indicando que no se pudieron guardar los cambios, mantener el Edit_Mode activo con los vértices en su posición editada, y no revertir el polígono.
7. IF el polígono editado resulta auto-intersectante al hacer clic en "Guardar cambios", THEN THE LeafletMap SHALL mostrar un toast.error indicando que el polígono no es válido porque las líneas se cruzan, y no enviar la petición PUT, manteniendo el Edit_Mode activo para que el usuario corrija los vértices.
8. WHEN el usuario hace clic en "Cancelar" durante el Edit_Mode, THE LeafletMap SHALL revertir el polígono a su estado original (coordenadas previas a la edición) y desactivar el Edit_Mode sin realizar peticiones a la API.
9. IF MapaContainer detecta `action=edit` con un `loteId` que no existe en la finca o cuyo lote no tiene geoJson asignado, THEN THE MapaContainer SHALL ignorar los parámetros de edición, no activar Edit_Mode, y mostrar un toast.error indicando que el lote especificado no se encontró o no tiene polígono.

### Requirement 6: Cálculo geodésico de área y centroide

**User Story:** Como productor, quiero que el área de mi lote se calcule automáticamente y con precisión a partir del polígono que dibujo, para que no tenga que medirla manualmente.

#### Acceptance Criteria

1. WHEN el usuario finaliza el dibujo de un polígono con al menos 3 vértices en coordenadas WGS84 (formato GeoJSON: [longitud, latitud]), THE Area_Calculator SHALL calcular el área geodésica usando la fórmula de exceso esférico y mostrar el resultado con exactamente dos decimales en hectáreas (1 hectárea = 10,000 m²).
2. IF el área calculada es menor a 0.01 hectáreas, THEN THE Area_Calculator SHALL retornar 0.01 como valor mínimo.
3. IF el área calculada excede 10,000 hectáreas, THEN THE Area_Calculator SHALL retornar 10,000 como valor máximo.
4. IF el polígono tiene menos de 3 vértices únicos (excluyendo el vértice de cierre si el anillo está cerrado), THEN THE Area_Calculator SHALL retornar un error indicando que el polígono es inválido, pero el Lote_Popup podrá abrirse para que el usuario vea el error.
5. IF el polígono es auto-intersectante, THEN THE LeafletMap SHALL mostrar un toast.error con el mensaje "El polígono no es válido: las líneas no deben cruzarse" y no abrir el Lote_Popup; este es el único caso de validación que impide la apertura del popup.
6. WHEN un polígono válido es dibujado, THE LeafletMap SHALL calcular el centroide geométrico como el centro del bounding box del polígono y retornar una posición [lat, lng] para anclar la etiqueta del lote.
7. WHEN el usuario proporciona un polígono abierto (primer vértice distinto al último), THE Area_Calculator SHALL cerrar automáticamente el anillo antes de calcular el área, produciendo el mismo resultado que un polígono cerrado equivalente.

### Requirement 7: Persistencia y validación de GeoJSON en la API de lotes

**User Story:** Como productor, quiero que la geometría de mis lotes se guarde en la base de datos de forma segura y validada, para que pueda visualizarlos en el mapa en sesiones futuras.

#### Acceptance Criteria

1. WHEN una petición POST se envía a Lotes_API con un campo `geoJson` que contiene un GeoJSON_Polygon válido (un objeto con `type` "Polygon" y `coordinates` válidas, o un objeto con `type` "Feature" cuya propiedad `geometry` sea un Polygon válido), THE Lotes_API SHALL guardar el GeoJSON_Polygon en el campo `geoJson` del modelo Lote y retornar el lote creado con estado HTTP 201.
2. WHEN una petición POST se envía a Lotes_API sin el campo `geoJson` o con `geoJson` igual a null, THE Lotes_API SHALL crear el lote sin geometría (campo `geoJson` permanece null) y retornar el lote creado con estado HTTP 201.
3. WHEN una petición PUT se envía a `/api/lotes/[id]` con un campo `geoJson` que contiene un GeoJSON_Polygon válido, THE Lotes_API SHALL actualizar el GeoJSON_Polygon almacenado para ese lote y retornar el lote actualizado con estado HTTP 200.
4. WHEN una petición PUT se envía a `/api/lotes/[id]` con el campo `geoJson` igual a null, THE Lotes_API SHALL eliminar la geometría almacenada del lote (campo `geoJson` se establece a null) y retornar el lote actualizado con estado HTTP 200.
5. THE Lotes_API SHALL validar que el campo `geoJson`, cuando se proporciona, cumpla una de las siguientes estructuras: (a) un objeto con `type` igual a "Polygon" y una propiedad `coordinates` que sea un array de al menos un anillo lineal con al menos 4 posiciones [lng, lat] donde la primera y última posición son idénticas, y que no exceda 100 posiciones de coordenadas en total; o (b) un objeto con `type` igual a "Feature" cuya propiedad `geometry` cumpla la estructura descrita en (a).
6. IF el campo `geoJson` proporcionado no cumple la estructura válida definida en el criterio 5, THEN THE Lotes_API SHALL retornar un error HTTP 400 con un mensaje indicando el motivo del rechazo.
7. IF el campo `geoJson` proporcionado contiene coordenadas con valores de longitud fuera del rango [-180, 180] o de latitud fuera del rango [-90, 90], THEN THE Lotes_API SHALL retornar un error HTTP 400 con un mensaje indicando que las coordenadas están fuera de rango.
8. THE Lotes_API SHALL verificar que el lote pertenece a una finca del usuario autenticado antes de permitir operaciones POST y PUT sobre el recurso.
9. IF el lote especificado en una petición PUT no existe o no pertenece a una finca del usuario autenticado, THEN THE Lotes_API SHALL retornar un error HTTP 404 cuando el recurso no existe, o HTTP 403 cuando el recurso existe pero no pertenece al usuario.
10. IF la finca especificada en `fincaId` durante una petición POST no existe, THEN THE Lotes_API SHALL retornar un error HTTP 404 con un mensaje indicando que la finca no fue encontrada.

### Requirement 8: Visualización de polígonos en el mapa con paleta de colores

**User Story:** Como productor, quiero ver los polígonos de mis lotes pintados en el mapa con colores diferenciados y etiquetas, para que pueda identificar visualmente cada lote.

#### Acceptance Criteria

1. WHEN LeafletMap renderiza los lotes de la finca, THE LeafletMap SHALL pintar cada lote que tiene geoJson como un polígono donde el color de borde (stroke) y el color de relleno (fill) corresponden al valor de Lote_Color_Palette en la posición `índice del lote módulo longitud de la paleta`, con fillOpacity de 0.25 y weight de 2.
2. THE Lote_Color_Palette SHALL definir la secuencia de colores en este orden fijo: "#639922", "#1D9E75", "#BA7517", "#185FA5", "#8B3A8A", "#C0392B", asignando al lote en posición N el color en posición `N % 6`.
3. WHEN un polígono de lote se renderiza en el mapa, THE LeafletMap SHALL mostrar el nombre del lote como etiqueta de texto posicionada en el centroide geométrico (bounding box center) del polígono, con fuente de tamaño 12px, fondo del color asignado al lote, texto blanco y border-radius redondeado para legibilidad.
4. WHEN el usuario hace clic en un polígono de lote, THE LeafletMap SHALL mostrar un popup con: nombre del lote, área en hectáreas, altitud en msnm (solo si el campo altitud del lote no es null), pendiente en grados (solo si el campo pendiente del lote no es null), y datos del primer cultivo con estado ACTIVO asociado al lote (variedad, etapa con label legible, cantidad de plantas) si existe al menos un cultivo activo.
5. IF un lote no tiene geoJson pero tiene coordenadas lat/lng, THEN THE LeafletMap SHALL renderizar un marcador circular (circleMarker) en dichas coordenadas donde tanto el stroke como el fill usan el color asignado de la Lote_Color_Palette, con radio de 30px, weight de 2 y fillOpacity de 0.3, mostrando en su popup el nombre y área del lote.

### Requirement 9: Sidebar del mapa con acciones de dibujo y edición

**User Story:** Como productor, quiero que el sidebar del mapa me muestre todos mis lotes con opciones para dibujar o editar sus áreas, para que pueda gestionar la georreferenciación de todos mis lotes desde una sola vista.

#### Acceptance Criteria

1. THE Map_Sidebar SHALL mostrar la lista de todos los lotes de la finca del usuario, mostrando para cada lote: nombre, área en hectáreas (campo areaHa), altitud en msnm (si existe), pendiente en grados (si existe), y el cultivo con estado ACTIVO asociado al lote (variedad y etapa) si existe.
2. THE Map_Sidebar SHALL mostrar un botón "Dibujar nuevo lote" posicionado debajo del título de la finca y encima de la lista de lotes.
3. WHEN el usuario hace clic en el botón "Dibujar nuevo lote", THE Map_Sidebar SHALL activar el modo de dibujo (Drawing_Tool) sin un loteId preasignado, permitiendo al usuario trazar un nuevo polígono en el mapa.
4. WHILE un lote en Map_Sidebar tiene un campo geoJson no nulo, THE Map_Sidebar SHALL mostrar un ícono de edición (Pencil, size 14) junto al nombre del lote que, al hacer clic, activa el Edit_Mode cargando el polígono existente del lote en el mapa para modificación.
5. WHILE un lote en Map_Sidebar no tiene geoJson asignado (valor null), THE Map_Sidebar SHALL mostrar un ícono de dibujo (MapPin, size 14) junto al nombre del lote que, al hacer clic, activa la Drawing_Tool asociada al loteId de ese lote.
6. WHEN un lote se crea o se le asigna geoJson exitosamente mediante la Drawing_Tool o el Edit_Mode, THE Map_Sidebar SHALL agregar o actualizar el lote en la lista de forma reactiva sin recargar la página completa.
7. IF la finca del usuario no tiene lotes registrados, THEN THE Map_Sidebar SHALL mostrar un estado vacío con un mensaje indicando que no hay lotes y el botón "Dibujar nuevo lote" como acción principal.

### Requirement 10: Navegación bidireccional con parámetros de URL

**User Story:** Como productor, quiero que al navegar entre Cultivos y Mapa se mantenga el contexto del lote que estoy gestionando, para que el flujo sea continuo sin perder información.

#### Acceptance Criteria

1. WHEN MapaContainer detecta `action=draw` sin `loteId` en la URL, THE MapaContainer SHALL activar el modo de dibujo libre (Flujo B) con el banner genérico "Dibuja el perímetro del lote y haz clic para cerrar" y activar la Drawing_Tool automáticamente en un máximo de 2 segundos tras la inicialización del mapa.
2. WHEN MapaContainer detecta `action=draw` con `loteId={id}` en la URL y el loteId corresponde a un lote existente en la lista de lotes cargados de la finca, THE MapaContainer SHALL activar el modo de dibujo para lote existente (Flujo C) con el banner personalizado "Dibuja el área del lote {nombre}" y activar la Drawing_Tool automáticamente en un máximo de 2 segundos tras la inicialización del mapa.
3. WHEN MapaContainer detecta `action=edit` con `loteId={id}` en la URL y el lote tiene geoJson asignado, THE MapaContainer SHALL activar el Edit_Mode (Flujo D) sobre el polígono del lote especificado en un máximo de 2 segundos tras la inicialización del mapa, mostrando el banner "Editando área de {nombre lote} - Arrastra los vértices para ajustar".
4. IF los parámetros `action=edit` con `loteId` están presentes pero el lote no tiene geoJson asignado, THEN THE MapaContainer SHALL mostrar un banner de error indicando que el lote no tiene área para editar y no activar la Edit_Tool ni la Drawing_Tool.
5. WHEN la URL no contiene parámetro `action`, THE MapaContainer SHALL renderizar el mapa en modo visualización normal sin activar herramientas de dibujo ni edición.
6. IF la URL contiene `action=draw` o `action=edit` con un `loteId` que no corresponde a ningún lote de la finca del usuario, THEN THE MapaContainer SHALL mostrar un banner de error indicando que el lote no fue encontrado y no activar la Drawing_Tool ni la Edit_Tool.
7. IF la URL contiene `action=edit` sin parámetro `loteId`, THEN THE MapaContainer SHALL ignorar el parámetro action y renderizar el mapa en modo visualización normal sin activar herramientas de dibujo ni edición.
