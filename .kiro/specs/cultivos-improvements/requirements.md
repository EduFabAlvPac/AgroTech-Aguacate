# Requirements Document

## Introduction

Este documento define los requisitos para cuatro mejoras al módulo de Cultivos y al layout general de AgroTech: CRUD completo de lotes, gestión de registros de actividad, actualización en tiempo real al crear registros, y sidebar colapsable en desktop.

## Glossary

- **Sistema**: La aplicación AgroTech en su conjunto (frontend + backend)
- **API_Lotes**: Endpoints REST para gestión de lotes (`/api/lotes`)
- **API_Registros**: Endpoints REST para gestión de registros de actividad (`/api/cultivos/[id]/registros/[registroId]`)
- **CultivosList**: Componente cliente que muestra los lotes y sus cultivos en la página de Cultivos
- **Sidebar**: Componente de navegación lateral fija del dashboard
- **Modal_Lote**: Modal reutilizable con formulario para crear/editar lotes
- **Lote**: Unidad geográfica dentro de una finca donde se siembran cultivos
- **Registro**: Entrada de actividad de un cultivo (fertilización, riego, poda, etc.)
- **Estado_Colapsado**: Estado visual del Sidebar donde solo se muestran íconos (68px de ancho)
- **Estado_Expandido**: Estado visual del Sidebar donde se muestran íconos y texto (220px de ancho)

## Requirements

### Requirement 1: Crear lotes

**User Story:** Como productor, quiero crear nuevos lotes en mi finca, para poder asociar cultivos a subdivisiones específicas de mi terreno.

#### Acceptance Criteria

1. WHEN el usuario hace clic en el botón "Agregar lote", THE CultivosList SHALL mostrar el Modal_Lote con el formulario vacío conteniendo los campos: Nombre (texto, obligatorio), Área en hectáreas (numérico, obligatorio), Altitud en msnm (numérico, opcional), Pendiente en grados (numérico, opcional) y Notas (texto, opcional)
2. WHEN el usuario envía el formulario de creación con datos válidos, THE API_Lotes SHALL validar que nombre tenga entre 1 y 100 caracteres, areaHa sea un valor numérico entre 0.01 y 10000, altitud (si se provee) esté entre 0 y 5000, y pendiente (si se provee) esté entre 0 y 90, crear el lote en la base de datos asociado a la finca del usuario autenticado y retornar el lote creado con status 201
3. WHEN el API_Lotes recibe una solicitud POST sin los campos obligatorios (nombre, areaHa, fincaId), THE API_Lotes SHALL retornar un error con status 400 y un mensaje indicando cuáles campos obligatorios faltan o son inválidos
4. IF el usuario no tiene sesión activa al enviar la solicitud POST, THEN THE API_Lotes SHALL retornar un error con status 401 y un mensaje indicando que no está autorizado
5. WHEN el lote se crea exitosamente, THE CultivosList SHALL agregar el nuevo lote al estado local y renderizarlo en la lista sin recargar la página
6. WHEN el lote se crea exitosamente, THE Sistema SHALL mostrar una notificación toast de éxito visible durante al menos 3 segundos
7. IF la solicitud de creación del lote falla por error del servidor o de red, THEN THE CultivosList SHALL mostrar una notificación toast de error indicando que no se pudo crear el lote y mantener el formulario abierto con los datos ingresados

### Requirement 2: Editar lotes

**User Story:** Como productor, quiero editar la información de mis lotes existentes, para mantener actualizados datos como área, altitud y notas.

#### Acceptance Criteria

1. WHEN el usuario hace clic en el ícono de edición (Pencil) en el encabezado de un lote, THE CultivosList SHALL mostrar el Modal_Lote con los campos nombre, areaHa, pendiente, altitud y notas pre-cargados con los valores actuales del lote
2. WHEN el usuario envía el formulario de edición con datos válidos (nombre entre 1 y 100 caracteres, areaHa entre 0.01 y 10000, pendiente opcional entre 0 y 90, altitud opcional entre 0 y 5000, notas opcional máximo 500 caracteres), THE API_Lotes SHALL actualizar el lote en la base de datos y retornar el lote actualizado
3. IF el usuario envía el formulario de edición con datos que no cumplen las reglas de validación, THEN THE Modal_Lote SHALL mostrar mensajes de error inline en los campos correspondientes sin cerrar el modal
4. WHEN el lote se actualiza exitosamente, THE CultivosList SHALL reflejar los cambios en el estado local sin recargar la página y mostrar una notificación toast de éxito
5. IF el lote no pertenece al usuario autenticado, THEN THE API_Lotes SHALL retornar error con status 403
6. IF la solicitud PUT al API_Lotes falla por error de red o error del servidor, THEN THE Sistema SHALL mostrar una notificación toast de error y mantener el modal abierto con los datos ingresados por el usuario

### Requirement 3: Eliminar lotes

**User Story:** Como productor, quiero eliminar lotes que ya no uso, para mantener organizada mi finca.

#### Acceptance Criteria

1. WHEN el usuario hace clic en el ícono de eliminar (Trash2) en el encabezado de un lote, THE CultivosList SHALL mostrar un diálogo de confirmación con un campo de texto que requiera escribir el nombre exacto del lote (case-sensitive) y un botón de confirmar deshabilitado hasta que el texto ingresado coincida exactamente con el nombre del lote
2. WHEN el usuario confirma la eliminación escribiendo el nombre correcto y haciendo clic en el botón de confirmar, THE API_Lotes SHALL verificar que el usuario autenticado es propietario del lote a través de la relación Lote → Finca → User, y eliminar el lote de la base de datos retornando status 200
3. IF el lote tiene cultivos con estado ACTIVO asociados, THEN THE API_Lotes SHALL rechazar la eliminación con status 409 y un mensaje indicando que existen cultivos activos que deben finalizarse o pausarse antes de eliminar el lote
4. IF el usuario no está autenticado o no es propietario del lote, THEN THE API_Lotes SHALL rechazar la solicitud con status 401 o 403 respectivamente
5. WHEN el lote se elimina exitosamente, THE CultivosList SHALL remover el lote del estado local sin recargar la página
6. WHEN el lote se elimina exitosamente, THE Sistema SHALL mostrar una notificación toast de éxito indicando que el lote fue eliminado
7. IF la solicitud de eliminación falla por error de red o del servidor, THEN THE CultivosList SHALL mostrar una notificación toast de error indicando que no se pudo eliminar el lote y mantener el lote visible en la interfaz

### Requirement 4: Editar registros de actividad

**User Story:** Como productor, quiero editar los registros de actividad de mis cultivos, para corregir errores en la descripción o tipo de actividad registrada.

#### Acceptance Criteria

1. WHEN el usuario hace clic en el ícono de edición (Pencil) de un registro de actividad, THE CultivosList SHALL mostrar el formulario RegistroForm en modo edición dentro de un Modal, con los campos tipo, descripcion y fecha pre-cargados con los valores actuales del registro seleccionado
2. WHEN el usuario envía el formulario de edición con datos válidos (descripcion entre 10 y 2000 caracteres, tipo dentro del enum TipoRegistro, fecha no futura), THE API_Registros SHALL actualizar los campos tipo, descripcion y fecha del registro en la base de datos mediante PUT /api/cultivos/[id]/registros/[registroId]
3. WHEN el registro se actualiza exitosamente, THE CultivosList SHALL reflejar los cambios en el estado local sin recargar la página y mostrar una notificación toast de éxito
4. IF el registro no pertenece a un cultivo del usuario autenticado, THEN THE API_Registros SHALL retornar error con status 403
5. IF el usuario envía el formulario de edición con datos inválidos, THEN THE RegistroForm SHALL mostrar los mensajes de error de validación en los campos correspondientes sin enviar la solicitud al servidor
6. IF el registroId proporcionado no existe en la base de datos, THEN THE API_Registros SHALL retornar error con status 404

### Requirement 5: Eliminar registros de actividad

**User Story:** Como productor, quiero eliminar registros de actividad erróneos o duplicados, para mantener un historial limpio de mi cultivo.

#### Acceptance Criteria

1. WHEN el usuario hace clic en el ícono de eliminar (Trash2) de un registro de actividad, THE CultivosList SHALL mostrar un diálogo de confirmación con un mensaje indicando que la acción no se puede deshacer y botones para confirmar o cancelar
2. WHEN el usuario hace clic en cancelar dentro del diálogo de confirmación, THE CultivosList SHALL cerrar el diálogo sin eliminar el registro
3. WHEN el usuario confirma la eliminación, THE CultivosList SHALL enviar una solicitud DELETE a /api/cultivos/[id]/registros/[registroId] y THE API_Registros SHALL eliminar el registro de la base de datos
4. WHEN el registro se elimina exitosamente, THE CultivosList SHALL remover el registro del estado local sin recargar la página y mostrar una notificación toast de éxito
5. IF la API retorna un error durante la eliminación, THEN THE CultivosList SHALL mostrar una notificación toast de error y mantener el registro visible en la lista
6. IF el registro no existe en la base de datos, THEN THE API_Registros SHALL retornar error con status 404
7. IF el registro no pertenece a un cultivo del usuario autenticado, THEN THE API_Registros SHALL retornar error con status 403

### Requirement 6: Actualización en tiempo real al crear registros

**User Story:** Como productor, quiero que los nuevos registros aparezcan inmediatamente en la lista de actividad, para tener retroalimentación visual instantánea sin recargar la página.

#### Acceptance Criteria

1. WHEN un registro se crea exitosamente mediante el formulario, THE CultivosList SHALL enviar una petición GET al endpoint /api/cultivos/[cultivoId]/registros para obtener la lista actualizada de registros del cultivo correspondiente
2. WHEN la respuesta del endpoint de registros se recibe con estado exitoso (HTTP 2xx), THE CultivosList SHALL reemplazar el array de registros del cultivo correspondiente en el estado local y renderizar el nuevo registro en la sección "Actividad reciente" del cultivo, ordenado por fecha descendente (más reciente primero), sin recargar la página
3. WHEN la respuesta del endpoint de registros se recibe con estado exitoso, THE CultivosList SHALL actualizar el contador de registros mostrado en la tarjeta del cultivo para reflejar el nuevo total
4. IF ocurre un error al obtener los registros actualizados (respuesta HTTP no-2xx o fallo de red), THEN THE Sistema SHALL mantener los registros previos visibles sin alteración y mostrar una notificación de error mediante react-hot-toast indicando que no se pudieron actualizar los registros
5. WHEN el registro se crea exitosamente y se inicia la consulta de registros actualizados, THE CultivosList SHALL cerrar el modal del formulario y mostrar una notificación de éxito mediante react-hot-toast antes de que la lista se actualice

### Requirement 7: Sidebar colapsable en desktop

**User Story:** Como productor, quiero poder colapsar la barra lateral de navegación, para disponer de más espacio horizontal para visualizar mis datos.

#### Acceptance Criteria

1. WHEN el usuario hace clic en el botón de colapsar (ícono PanelLeftClose), THE Sidebar SHALL reducir su ancho de 220px a 68px con una transición CSS de 0.25 segundos ease
2. WHILE el Sidebar está en Estado_Colapsado, THE Sidebar SHALL mostrar únicamente los íconos de navegación sin texto, ocultar la tarjeta de información de finca, y mostrar solo el ícono de hoja del logo sin el texto "AgroTech" ni el nombre del usuario
3. WHILE el Sidebar está en Estado_Colapsado, THE Sidebar SHALL mostrar un tooltip con el label del enlace al hacer hover sobre cada ícono de navegación, para mantener la identificación de las secciones sin texto visible
4. WHEN el usuario hace clic en el botón de expandir (ícono PanelLeftOpen), THE Sidebar SHALL expandir su ancho de 68px a 220px con la misma transición CSS de 0.25 segundos ease
5. WHEN el Sidebar cambia de estado colapsado o expandido, THE Sistema SHALL ajustar el margen izquierdo del área de contenido principal de ml-[220px] a ml-[68px] (o viceversa) con una transición CSS de 0.25 segundos ease, sincronizada con la transición del Sidebar
6. WHEN el usuario colapsa o expande el Sidebar, THE Sistema SHALL persistir el estado en localStorage con la clave "sidebar-collapsed" (valor "true" o "false")
7. WHEN la aplicación se carga, THE Sidebar SHALL restaurar el estado colapsado/expandido desde localStorage; IF no existe valor en localStorage o localStorage no está disponible, THEN THE Sidebar SHALL mostrarse en estado expandido (220px) como valor por defecto
8. THE Sidebar SHALL posicionar el botón de toggle encima del enlace de Configuración en el footer
