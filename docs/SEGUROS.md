# Seguros agrícolas y siniestros

**Idea:** el productor registra el seguro que ya contrató, lo asocia a sus cultivos y, cuando ocurre un
evento (sequía, exceso de lluvias, heladas, granizo, vientos…), registra el siniestro sobre el cultivo y
genera un **expediente** con la evidencia. GermIA **no vende ni intermedia seguros** (eso exige vigilancia de
la Superintendencia Financiera). La cotización/derivación a aliados (fase 3) queda como idea futura.

## Modelo (aditivo — `prisma/sql/2026-09-seguros-siniestros.sql`)
- `PolizaSeguro` (finca, aseguradora, riesgos[], suma asegurada, prima, deducible, vigencia, estado) ↔
  `PolizaCultivo` (N:M con `Cultivo`) — una póliza puede cubrir varios cultivos de **una misma finca**.
- `Siniestro` (cultivo, póliza opcional, tipo, fecha, descripción, % daño, área, pérdida, fotos, estado del
  reclamo, monto indemnizado). `creadoPorId`/`gastoId` son texto sin FK a propósito (no bloquean borrar cuentas/gastos).
- Vigencia **calculada de las fechas** (`src/lib/seguros.ts`): VIGENTE / POR_VENCER (≤30 d) / VENCIDA / CANCELADA.

## Reglas
- Permisos: recursos `seguro` (póliza: dueño/admin CRUD, colaborador solo lee) y `siniestro` (colaborador puede
  **reportar**). Módulo `seguros` delegable (por defecto no incluido para operarios).
- La finca se deduce de los cultivos en BD; todos deben ser de la misma finca; `requireAccess` autoriza contra ella
  (probado: alterar la petición para colar un cultivo o póliza de otra finca se rechaza).
- Un siniestro solo puede ligarse a una póliza que **cubra** ese cultivo + riesgo + fecha del evento (`polizaCubre`).
  Sin póliza sirve como evidencia.
- La **prima** puede registrarse como gasto FIJO (categoría Otros / «Seguro agrícola») y se mantiene sincronizada al editar.
- Bloqueos de borrado: póliza con siniestros (cancelar en su lugar); cultivo/lote con siniestros.
- Auditoría: `poliza.crear/editar/cancelar/eliminar`, `siniestro.crear/actualizar/eliminar`.

## Expediente (`/expediente-siniestro/[id]`)
Imprimible / «Guardar como PDF»: finca y cultivo, póliza, evento, **alertas de GermIA ±7 días** (son pronósticos
de OpenWeather, no mediciones de estación — el documento lo aclara), actividades del cuaderno de campo (30 días
previos), fotos y estado del reclamo. 404 si la persona no tiene acceso a la finca.

## Asegurar desde el cultivo
En el detalle del cultivo, la tarjeta «Seguro de este cultivo» permite **asociar una póliza ya registrada**
(solo de la misma finca) o crear una nueva con el cultivo preseleccionado, y **quitar** el vínculo. La lista de
Cultivos muestra la insignia «🛡️ Asegurado» cuando hay una póliza vigente. Si la finca activa no tiene cultivos,
el formulario de póliza lo explica (con el nombre de la finca) y enlaza a Cultivos.

## Integraciones
Alertas (aviso «tu seguro cubre este riesgo» + atajo a registrar siniestro), detalle del cultivo (tarjeta de seguro),
Finanzas (prima como gasto), modo simple (salida a modo completo, ver `paridad-modo-simple.md`).

## Ideas futuras
Fase 3 (referir cotización a aliado con consentimiento, Ley 1581) · siniestro pagado → ingreso automático ·
aviso por correo/WhatsApp del vencimiento · umbral paramétrico automático.
