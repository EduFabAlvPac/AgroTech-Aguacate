# Sprint 3 — Refinamiento, Mobile y Deploy
**Tipo:** Feature Spec  
**Estado:** Listo para implementar  
**Dependencias:** Sprint 0, Sprint 1 y Sprint 2 completados

---

## Requerimientos

### REQ-1: Sidebar Responsive para Mobile
**Como** productor que accede desde su celular en la finca,  
**Quiero** una navegación funcional en pantallas pequeñas,  
**Para** poder registrar actividades directamente desde el campo.

**Criterios de aceptación:**
- [ ] En pantallas < 768px el sidebar está oculto por defecto
- [ ] Un botón de hamburguesa en el header abre/cierra el sidebar como overlay
- [ ] El overlay tiene fondo semitransparente y cierra al hacer clic fuera
- [ ] Todos los módulos son 100% usables en pantalla de 375px (iPhone SE)
- [ ] Las tablas de finanzas hacen scroll horizontal en móvil
- [ ] Los formularios modales se adaptan al ancho de pantalla

### REQ-2: Skeleton Loading States
**Como** usuario en conexión lenta (rural),  
**Quiero** ver indicadores de carga mientras se obtienen los datos,  
**Para** no pensar que la app está rota.

**Criterios de aceptación:**
- [ ] El dashboard muestra skeleton cards mientras carga los KPIs
- [ ] Las tablas muestran skeleton rows durante la carga inicial
- [ ] El mapa muestra un estado de carga antes de renderizar Leaflet
- [ ] El chat de AgroIA muestra "typing..." mientras espera respuesta del stream

### REQ-3: PWA Instalable en Android e iOS
**Como** productor con smartphone,  
**Quiero** instalar AgroTech como app en mi celular,  
**Para** acceder rápidamente sin abrir el navegador.

**Criterios de aceptación:**
- [ ] Al visitar la URL en Chrome Android, aparece el prompt "Agregar a pantalla de inicio"
- [ ] La app instalada se abre en modo standalone (sin barra del navegador)
- [ ] El icono y splash screen muestran la marca AgroTech
- [ ] La app funciona en modo offline mostrando datos cacheados
- [ ] Al volver a conectarse, los datos se sincronizan

### REQ-4: Funcionalidad Offline Básica
**Como** productor en zona con señal intermitente,  
**Quiero** que la app funcione aunque pierda conexión,  
**Para** seguir registrando actividades en el campo.

**Criterios de aceptación:**
- [ ] El dashboard muestra los últimos datos cacheados cuando no hay red
- [ ] Se muestra un banner "Sin conexión — mostrando datos guardados" cuando está offline
- [ ] Los formularios de registro de actividad funcionan offline (datos guardados localmente)
- [ ] Al recuperar conexión, los registros offline se sincronizan automáticamente

### REQ-5: Acciones Rápidas (Quick Actions)
**Como** productor en campo,  
**Quiero** registrar rápidamente las actividades más comunes,  
**Para** no tener que navegar múltiples pantallas.

**Criterios de aceptación:**
- [ ] Botón flotante (FAB) visible en móvil con las 3 acciones más usadas
- [ ] Acción 1: "Registrar riego" — abre mini-form pre-lleno con tipo=RIEGO
- [ ] Acción 2: "Registrar gasto" — abre modal de gasto con el cultivo activo pre-seleccionado
- [ ] Acción 3: "Consultar AgroIA" — navega al asistente
- [ ] En desktop el FAB no se muestra (usar botones en las páginas)

### REQ-6: Página de Ingresos
**Como** productor que hace su primera venta,  
**Quiero** registrar los ingresos de mis ventas,  
**Para** tener el resumen financiero completo.

**Criterios de aceptación:**
- [ ] Formulario de nuevo ingreso: concepto, monto, kg vendidos, precio/kg, fecha, comprador
- [ ] El precio/kg se calcula automáticamente si se ingresan kg y monto total
- [ ] Los ingresos aparecen en el módulo de finanzas junto a los gastos
- [ ] El saldo (ingresos - gastos) se actualiza en el KPI del dashboard

### REQ-7: Export a PDF
**Como** productor que lleva registros para el ICA o la cooperativa,  
**Quiero** exportar un resumen del cultivo en PDF,  
**Para** presentarlo en reuniones o trámites.

**Criterios de aceptación:**
- [ ] Botón "Exportar PDF" en el módulo de finanzas
- [ ] El PDF incluye: nombre de la finca, período, resumen de gastos por categoría, total, lotes
- [ ] El PDF incluye el logo AgroTech y la fecha de generación
- [ ] El PDF se descarga directamente en el navegador

### REQ-8: Configuración de Perfil de Finca
**Como** productor que quiere ajustar su información,  
**Quiero** poder editar los datos de mi finca desde la configuración,  
**Para** tener la información siempre actualizada.

**Criterios de aceptación:**
- [ ] El módulo de configuración ya existe ✅
- [ ] Agregar validación de formularios con mensajes de error claros
- [ ] Al guardar, mostrar confirmación de éxito con toast
- [ ] El nombre de la finca en el sidebar se actualiza sin recargar la página
