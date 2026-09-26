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

## Seguros (pólizas y siniestros)

100% modo completo — **exclusión con salida**. Formularios largos (riesgos, cultivos, vigencia, fotos) y un expediente imprimible que no caben en el marco angosto de modo simple. Salida desde Perfil → "Más funciones (modo completo)", condicionada a `tieneModulo("seguros")`. El aviso "tu seguro cubre este riesgo" vive en Alertas y la tarjeta "Seguro de este cultivo" en el detalle del cultivo (modo completo). Módulo `seguros` delegable por colaborador (por defecto solo dueño/administrador; el colaborador de campo puede *reportar* siniestros si el dueño le habilita el módulo).

## Compradores / Equipo / Fichas técnicas

100% modo completo. Exclusión ya decidida (Fase 2). Salida agregada en Fase 5 desde Perfil → "Más funciones (modo completo)", condicionada a los mismos guards que ya usan sus páginas reales (`tieneModulo("compradores")`, `esOwner`, `esSuperAdmin`).

## Configuración / Perfil

| Capacidad | Completo | Simple | Clasificación |
|---|---|---|---|
| Nombre, teléfono, contraseña | ✅ | ✅ | Paridad completa |
| Vista preferida (switch de 3 posiciones) | ✅ | ✅ | Paridad completa |
| Configurar umbrales de alerta | ✅ | ❌ | Exclusión con salida (Fase 5) — `/dashboard/configuracion?tab=alertas` |
| Exportar mis datos / eliminar cuenta | ✅ | ❌ | Exclusión con salida (Fase 5) — `/dashboard/configuracion?tab=privacidad` |
| Editar datos de la organización (nombre, NIT, contacto) — solo OWNER | ✅ `organizacion-actions.ts` | ❌ | **Exclusión con salida** (ADR-011 Sprint 3) — `/dashboard/configuracion?tab=organizacion`, tarjeta solo visible si `accesos.esOwner` (mismo gate que la salida a Equipo) |

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

---

## Experiencia Campesino (árbol de rutas separado)

A partir de ADR-006 (fase posterior a las 5 anteriores) existe una **tercera experiencia**, `src/app/(campesino)/campesino/*` — no es una tercera bifurcación de `/dashboard/*` como Simple/Completa (esas conviven en las mismas rutas, ver arriba), sino un árbol de rutas propio, hermano de `(dashboard)`, con su propio login (celular sin contraseña) y su propio shell (`ModoCampesinoShell`). La única intersección con lo de arriba es una guarda de una línea en `(dashboard)/layout.tsx` que redirige a `/campesino` si `User.experiencia === "CAMPESINO"`.

Por eso no encaja en la tabla de paridad de arriba (no hay "versión completa" de la que sea exclusión), pero por la misma regla del proyecto (toda función nueva se documenta) va aquí un resumen de qué reutiliza tal cual y qué es 100% nuevo:

**Reutilizado sin modificar:**
- `diagnosticarImagen()` (`src/lib/diagnostico-ia.ts`) — mismo motor de diagnóstico por imagen que `/api/cultivos/[id]/diagnostico`, pero servido por un endpoint nuevo y desacoplado de `Cultivo` (`/api/campesino/diagnostico`), porque el Campesino no tiene Finca/Lote/Cultivo (decisión de producto).
- `getCurrentWeather()` (`src/lib/weather.ts`) — mismos datos de OpenWeatherMap que el dashboard.
- El pipeline `MediaRecorder → /api/transcribir` (Whisper/Groq) — mismo STT que ya usaba el cuaderno de campo por voz (RF14), reutilizado para "Hablar con GermIAmigo".
- `PhotoCapture`/`compressImage` (`src/components/ui/PhotoCapture.tsx`), patrones de UI kit (`Button`, `Input`, `Select`, `Modal`).

**100% nuevo:**
- Login sin contraseña (provider `telefono-campesino` en `src/lib/auth.ts`) y login con Google (`Otro rol`). **Colectivo/Cooperativa**: el aviso del trial (`TrialAviso`) vive en el shell de modo completo; en modo simple la organización se cambia desde Perfil (selector, solo con 2+) y la gestión del plan/asociados es de Configuración → Organización (exclusión con salida, ya clasificada arriba). **Login Campesino seguro**: el dueño genera desde Equipo (modo completo) un código de 6 dígitos de un solo uso (`generarCodigoVinculacion`) y el celular del campesino queda como dispositivo de confianza (`/api/campesino/vincular`, cookie `germia_dispositivo`). Es una función de **gestión del dueño en Equipo**, que no existe en modo simple (Equipo entero es "exclusión con salida" desde `PerfilSimpleClient`): sigue esa misma clasificación, sin cambios en la tabla de arriba.
- `ExperienciaApp` (campo de perfil de experiencia, ortogonal a `vistaPreferida`).
- Tienda (`ProductoTienda`), Precios de mercado (`PrecioMercado`), fase lunar (`src/lib/fase-lunar.ts`) y consejo del día (`src/lib/consejo-del-dia.ts`) — nada de esto existía antes.
- Texto-a-voz (`speechSynthesis`) — primer uso en el repo.
- "Hablar con GermIAmigo" (`/api/campesino/hablar`) — prompt y persona propios, no reutiliza `/api/chat`.
- `ConsultaDiagnosticoCampesino` — reemplaza a `RegistroCultivo` solo para este flujo (sin Finca/Lote/Cultivo de por medio).
