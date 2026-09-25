# Proceso de calidad — "definición de terminado"

Nace de la auditoría del 2026-09-24 (`docs/AUDITORIA-2026-09-24.md`): varios
flujos (marcar alertas, eliminar fincas, administrar organizaciones) llegaron a
producción con fallos que un recorrido real habría atrapado. Desde ahora **un
cambio no está terminado hasta cumplir todo esto**, y el PR debe decirlo.

## Antes de abrir un PR

1. **Tipos y pruebas:** `npx tsc --noEmit` y `npx vitest run` en verde.
2. **Prueba de regresión por cada bug arreglado.** Si el bug se pudo cometer, un
   test debe fallar sin el arreglo (reglas de negocio → test puro; flujo → QA real).
3. **QA real del flujo tocado** (Playwright contra `next dev` + Postgres local),
   con los casos **felices Y los de borde**: sin datos, con datos que bloquean,
   sin permiso, otra organización, rol de solo lectura, organización suspendida.
   Verificar el resultado **en la base de datos**, no solo en pantalla (un botón
   que "cambia la pantalla" sin persistir fue el bug de "marcar todas").
4. **`npm run qa:smoke`** (recorre 23 pantallas × escritorio y celular y falla ante
   errores de consola, excepciones, HTTP ≥ 400 o páginas de error). Debe dar ✅.
5. **Probar las rutas de fallo:** cada botón que muta debe mostrar el **motivo
   real** cuando algo lo impide (nunca "Error interno" / "Error al…" pelado).
6. **Datos de prueba limpiados** de la base local al terminar.
7. **Casos de hora/zona:** todo texto con fecha calculado en el servidor debe ser
   idéntico en el navegador (Colombia = UTC-5). Probar con servidor `TZ=UTC`.

## Reglas de diseño que salen de los errores
- Una acción de borrado **explica qué la bloquea** y qué hacer (ver `src/lib/finca-borrado.ts`).
- Una sola fuente de reglas para la Server Action y la ruta API gemela.
- Cada borrado/cambio sensible deja **auditoría**.
- Estados de organización (`suspendida`, `eliminada`, prueba vencida) se **aplican**
  en `requireAccess`/`fincaIdsAccesibles`, no solo se muestran.
- Nada en la UI puede ser un valor fijo que parezca un dato real (el "1" de Alertas).
- Datos externos ausentes (clima) **no se inventan**: se omite y se avisa.

## En el PR (descripción)
Debe incluir: qué se probó y cómo (escenarios), qué **no** se pudo probar y por
qué, pasos manuales para el usuario, y —si toca la BD— el SQL aditivo generado
con `prisma migrate diff`.

## Pendiente de infraestructura (Ola 3 de la auditoría)
ESLint no está configurado (`next lint` pide configuración interactiva) · sin
Sentry/monitoreo de errores · sin pruebas de integración contra BD en CI ·
`qa:smoke` aún no corre en CI (requiere BD y credenciales de prueba).
