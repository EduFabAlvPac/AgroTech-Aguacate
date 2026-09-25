# Auditoría de calidad, seguridad y coherencia — 2026-09-24

Cuatro roles revisaron el código en solo lectura (QA funcional, ciberseguridad,
UX/UI, calidad + arquitectura + datos). Este archivo es el registro vivo del
plan; se marca cada punto al entregarse su PR. Detalle de cada hallazgo:
informes de la sesión (no versionados); los cambios quedan explicados en cada PR.

## Ola 1 — confianza en los datos y aislamiento
| # | Tema | Estado |
|---|---|---|
| 1 | **Alertas**: "marcar todas como leídas" persiste; sin pronóstico inventado en producción; dedupe por finca y por asunto; errores mudos | ✅ este PR |
| 1b | Alertas: caducidad y purga (cron de retención) + índices | pendiente |
| 2a | **Eliminar finca**: bloquea con mensaje que dice qué la bloquea (lotes/cultivos/gastos/ingresos/jornales/presupuestos), reglas únicas para acción y API, Super Admin exento de "única finca", auditado | ✅ |
| 2b | Eliminar lote/cultivo/gasto/comprador con mensajes claros; eliminar cuenta con gastos y cuentas Google | pendiente |
| 2c | Error de hidratación #418 (fecha del Header calculada en el servidor en UTC) | ✅ |
| 3 | **Aislamiento**: IDOR en gastos/jornales (ids de otra finca), `iniciarActivacionMfa` con MFA activo, ingreso sin `requireAccess` | pendiente |

## Ola 2 — seguridad transversal y producto
**Hecho:** panel de Organizaciones completo (consultar, editar, suspender/reactivar, eliminar lógico + restaurar, con enforcement), insignia real de alertas, etiquetas de organización unificadas.

Pendiente de esta ola: cabeceras de seguridad · rate limit por IP en login y normalizar correo · política
de contraseña y revocar sesiones al cambiarla · escapar HTML de correos ·
campesinos antiguos con `requiereVinculacion` · panel de Organizaciones completo
(detalle, editar, suspender/reactivar, eliminar lógico con enforcement) ·
UX (confirmaciones, insignia "1" falsa, glosario Campesino/Asociado, sidebar por
secciones, objetivos táctiles y a11y del Modal).

## Ola 3 — base sólida
Tests de alert-engine/borrados/cuenta · `lint` y `build` en CI · Sentry ·
validación y límites en endpoints de IA · portal público de compradores.

## Decisiones tomadas con el usuario
- Orden: Ola 1 completa (alertas → borrados → aislamiento).
- Eliminar finca con gastos/presupuestos/jornales: **bloquear con un mensaje
  claro** (qué la bloquea y qué hacer), no borrar en cascada.


## Actualización — borrados (PR «borrados 2b»)

- Lote/cultivo con **ingresos, jornales o inversiones de inversionistas** ya no se borran en silencio (dejaban ingresos/jornales huérfanos e invisibles y borraban en cascada el aporte de inversionistas): se bloquean con mensaje claro (409). Los gastos no bloquean (tienen `fincaId`).
- Borrar lote, cultivo, gasto, ingreso y comprador ahora deja **auditoría** (`*.eliminar`), y los errores de base de datos se traducen a mensajes humanos (`mensajeErrorBorrado`).
- Lógica única en `src/lib/borrado-guardas.ts` para las Server Actions y las rutas API gemelas.
- Pendiente de esta ola: eliminar cuenta (gastos/presupuestos, usuarios solo-Google) y aislamiento (IDOR gastos/jornales).
