# Matriz de paridad — modo simple vs. modo completo

> Producida en la Fase 5 de ADR-006 (QA de paridad funcional, última fase del roadmap). Ver el ADR para el contexto completo de por qué existen dos modos.
>
> **Regla permanente** (agregada también a `CLAUDE.md` §5): toda función nueva agregada a modo completo debe clasificarse en esta tabla — *paridad completa*, *exclusión con salida*, o *pendiente de decidir* (y resolverse antes de darse por terminada) — antes de que el trabajo se considere completo. El objetivo es que la paridad no se desalinee otra vez en silencio.

## Cómo leer esta tabla

- **Paridad completa**: existe y funciona igual en ambos modos (mismo Server Action / función de lectura).
- **Exclusión con salida**: no existe una versión simplificada; en su lugar hay un botón/tarjeta que lleva a la sección exacta en modo completo, vía [`SalidaModoCompleto`](../src/components/shared/SalidaModoCompleto.tsx) — visita puntual, **no** cambia `vistaPreferida`.
- **Pendiente de decidir**: alguien agregó algo a modo completo y todavía no se clasificó aquí. No debería haber ninguna fila en este estado en `main`.

## Dashboard / Inicio

| Capacidad | Completo | Simple | Clasificación |
|---|---|---|---|
| KPIs de finca | ✅ | ✅ (subconjunto) | Paridad completa |
| Clima actual | ✅ + pronóstico 3 días | ✅ solo actual | Exclusión ya decidida (Fase 2, mockup aprobado) |
| Mapa de lotes (preview) | ✅ | ❌ | Exclusión ya decidida (Fase 2, mockup aprobado) |
| Gráfico financiero mensual | ✅ | ❌ | Exclusión ya decidida (Fase 2, mockup aprobado) |
| Preview de compradores | ✅ | ❌ | Exclusión ya decidida (Fase 2, mockup aprobado) |
| Selector de finca activa | ✅ | ✅ | Paridad completa |

## Cultivos

| Capacidad | Completo | Simple | Clasificación |
|---|---|---|---|
| Crear/editar/eliminar cultivo | ✅ `cultivo-actions.ts` | ✅ | Paridad completa |
| Cambiar etapa | ✅ `etapa-actions.ts` | ✅ | Paridad completa |
| Registrar actividad de bitácora (con foto, sync financiero) | ✅ `registro-actions.ts` | ✅ (Fase 5) [`RegistrarActividadModal`](../src/components/modo-simple/RegistrarActividadModal.tsx) | **Paridad completa** — agregado en Fase 5 (gap #1), 1 foto en vez de hasta 5 |
| Ver detalle/historial del cultivo | ✅ `/dashboard/cultivos/[id]` | ✅ (Fase 5) [`CultivoDetalleSimpleClient`](../src/components/modo-simple/CultivoDetalleSimpleClient.tsx) | **Paridad completa** — agregado en Fase 5 (gap #2), sin las tablas de gastos/ingresos (ya cubiertas en Finanzas) |
| Crear/editar lote (con polígono) | ✅ `lote-actions.ts` + Leaflet.draw | ❌ | **Exclusión con salida** (Fase 5) — Mapa, `/dashboard/mapa` |
| Registrar análisis de suelo | ✅ | ❌ | Exclusión con salida (Fase 5) — vía Mapa |
| Diagnóstico por foto (RF15) | ✅ | ✅ (con selector de cultivo) | Paridad completa |

## Finanzas

| Capacidad | Completo | Simple | Clasificación |
|---|---|---|---|
| Crear/eliminar gasto e ingreso | ✅ | ✅ | Paridad completa |
| Editar gasto/ingreso existente | ✅ `actualizarGasto` | ❌ | **Exclusión con salida** (Fase 5) — `/dashboard/finanzas?tab=registros` |
| Registrar jornales | ✅ `crearJornales` | ❌ | **Exclusión con salida** (Fase 5) — `/dashboard/finanzas?tab=registros` |
| Definir presupuesto | ✅ `guardarPresupuesto` | ❌ | **Exclusión con salida** (Fase 5) — `/dashboard/finanzas?tab=presupuesto` |
| Reporte FINAGRO / exportar PDF | ✅ | ❌ | Exclusión con salida (Fase 5) — mismas rutas de arriba |

## Mapa (dentro de "Mis fincas" en simple)

| Capacidad | Completo | Simple | Clasificación |
|---|---|---|---|
| Crear/editar/eliminar finca | ✅ | ✅ | Paridad completa |
| Crear/editar lote (polígono) | ✅ | ❌ | **Exclusión con salida** (Fase 5) — `/dashboard/mapa` |
| Recomendación de cultivo por lote (RF3) | ✅ (modal en Mapa) | ✅ (tarjeta en Asistente IA) | Paridad completa (vía otra pantalla) |

## Alertas

| Capacidad | Completo | Simple | Clasificación |
|---|---|---|---|
| Ver activas, marcar leída | ✅ | ✅ (`AlertasPanel`, últimas) | Exclusión ya decidida (Fase 2), con vista parcial |
| Marcar vencida, descartar, generar, historial completo | ✅ `/dashboard/alertas` | ❌ | Exclusión con salida (Fase 5) — `/dashboard/alertas` |

## Compradores / Equipo / Fichas técnicas

100% modo completo. Exclusión ya decidida (Fase 2). Salida agregada en Fase 5 desde Perfil → "Más funciones (modo completo)", condicionada a los mismos guards que ya usan sus páginas reales (`tieneModulo("compradores")`, `esOwner`, `esSuperAdmin`).

## Configuración / Perfil

| Capacidad | Completo | Simple | Clasificación |
|---|---|---|---|
| Nombre, teléfono, contraseña | ✅ | ✅ | Paridad completa |
| Vista preferida (switch de 3 posiciones) | ✅ | ✅ | Paridad completa |
| Configurar umbrales de alerta | ✅ | ❌ | Exclusión con salida (Fase 5) — `/dashboard/configuracion?tab=alertas` |
| Exportar mis datos / eliminar cuenta | ✅ | ❌ | Exclusión con salida (Fase 5) — `/dashboard/configuracion?tab=privacidad` |

## Asistente IA

Paridad completa + un extra: la tarjeta "¿Qué cultivo me conviene?" (RF3) existe **solo** en modo simple.

---

## El mecanismo de salida (Fase 5)

Un solo componente, [`SalidaModoCompleto`](../src/components/shared/SalidaModoCompleto.tsx), reutilizado en las 10 exclusiones de arriba:

1. Escribe la cookie `agrotech_visita_completa` (30 min, ver [`vista-preferida.ts`](../src/lib/vista-preferida.ts)) — **nunca** llama a `actualizarVistaPreferida`.
2. Navega a la ruta específica (con `?tab=` cuando aplica — soporte agregado de forma aditiva en `FinanzasClient.tsx`/`ConfigClient.tsx`, sin cambiar su comportamiento por defecto).
3. `(dashboard)/layout.tsx` lee esa cookie con precedencia máxima (por encima incluso de `vistaPreferida = SIMPLE` explícito) y muestra el banner [`VolverModoSimple`](../src/components/shared/VolverModoSimple.tsx), visible en cualquier pantalla de modo completo a la que navegue después.
4. "Volver a modo simple" borra la cookie y regresa a `/dashboard` — la preferencia guardada nunca se tocó.

**Nota técnica** encontrada durante la verificación E2E de esta fase: una navegación con `<Link>` normal no fuerza que Next.js vuelva a evaluar el layout compartido tras escribir la cookie (los layouts se reutilizan entre navegaciones cliente-a-cliente dentro del mismo árbol) — `SalidaModoCompleto` usa `router.push()` + `router.refresh()` en vez de un `<Link>` plano para garantizar que el layout se re-evalúe con la cookie ya escrita.
