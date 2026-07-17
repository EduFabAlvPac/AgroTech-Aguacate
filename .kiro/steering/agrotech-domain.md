---
inclusion: auto
description: Design system, database schema, component patterns and API conventions for AgroTech. Use when creating or modifying components, pages, API routes, or database queries.
---

# Patrones y Dominio AgroTech

## Base de Datos — Modelos Principales

### User → Finca → Lote → Cultivo (jerarquía principal)
```
User (1) ──< Finca (1) ──< Lote (*) ──< Cultivo (*)
                                         ├──< RegistroCultivo (*)
                                         ├──< Gasto (*)
                                         └──< Ingreso (*) >── Comprador
User (1) ──< Comprador (*)
User (1) ──○ UserPreferences
AlertaClimatica (*) [global, no ligada a user]
ChatMessage (*) [por user]
```

### Enums de Prisma
```typescript
// Etapas del ciclo del cultivo
EtapaCultivo: PREPARACION | SIEMBRA | ESTABLECIMIENTO | CRECIMIENTO | PRODUCCION | COSECHA

// Tipos de registro de actividad
TipoRegistro: SIEMBRA | RIEGO | FERTILIZACION | PODA | TRATAMIENTO_PLAGAS |
              COSECHA | OBSERVACION | INSPECCION | ALERTA

// Categorías de gasto
CategoriaGasto: INSUMOS | MANO_OBRA | MAQUINARIA | AGUA_RIEGO | TRANSPORTE |
                CERTIFICACIONES | TIERRA | SEMILLAS_PLANTULAS | HERRAMIENTAS | ENERGIA | OTROS

// Tipos de comprador
TipoComprador: COOPERATIVA | EXPORTADOR | MAYORISTA | SUPERMERCADO | PLAZA_MERCADO | RESTAURANTE | OTRO

// Tipos y severidad de alerta
TipoAlerta: HELADA | LLUVIA_EXCESIVA | SEQUIA | VIENTO_FUERTE | TEMPERATURA_ALTA | GRANIZO | PLAGA | OTRO
Severidad: BAJA | MEDIA | ALTA | CRITICA
```

### Labels para mostrar en UI
```typescript
import { ETAPA_LABELS, CATEGORIA_LABELS, TIPO_REGISTRO_LABELS, TIPO_COMPRADOR_LABELS } from "@/types";
// Ej: ETAPA_LABELS["SIEMBRA"] → "Siembra"
```

## Sistema de Badges
```typescript
// CSS classes para badges - usar con className
"badge badge-success"   // verde agro (activo, completado)
"badge badge-warning"   // ámbar harvest (en progreso, advertencia)
"badge badge-info"      // azul (info, IA)
"badge badge-danger"    // rojo (error, crítico)
"badge badge-neutral"   // gris (neutro, pendiente)
```

## Estructura de Tarjeta Estándar
```tsx
<div className="card p-5">
  {/* Header */}
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-[var(--text-muted)]" />
      <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Título</h2>
    </div>
    <span className="badge badge-success">Estado</span>
  </div>
  {/* Content */}
  ...
</div>
```

## Formato de Valores Monetarios
```typescript
import { formatCOP, formatCOPFull } from "@/lib/utils";
formatCOP(2450000)    // → "$2.45M" (compacto para KPIs)
formatCOPFull(2450000) // → "$2.450.000" (completo para tablas)
```

## Mapa Interactivo
- Leaflet solo en Client Components con `"use client"`
- Siempre usar `dynamic(() => import("./LeafletMap"), { ssr: false })` en el wrapper
- GeoJSON de los lotes guardado en `lote.geoJson` (JSON field en BD)
- Coordenadas por defecto: Norte de Santander `lat=7.9273, lng=-72.5078`
- Finca Álvarez Pacheco: Lote A (1850 msnm), Lote B (1820 msnm)

## AgroIA — Asistente IA
- Usa Vercel AI SDK v4 con `useChat` hook en el cliente
- Endpoint: `POST /api/chat` — responde con streaming
- RAG automático: `src/lib/rag.ts` identifica keywords y recupera chunks de `src/lib/knowledge/base.ts`
- El prompt del sistema incluye contexto dinámico de la finca del usuario
- Historial persistido en tabla `ChatMessage`
- **NUNCA hacer llamadas directas a Anthropic desde componentes cliente** — siempre vía `/api/chat`

## Motor de Alertas Climáticas
- `src/lib/alert-engine.ts` — analiza forecast y crea alertas
- `POST /api/alertas/generate` — dispara el análisis
- Umbrales configurables por usuario en `UserPreferences`
- Defaults: helada <12°C, lluvia >30mm/día, viento >40km/h, sequía >5 días secos
- Deduplicación: no crea la misma alerta 2 veces en 24h para el mismo tipo+fecha

## Clima
- `GET /api/weather?type=current` — clima actual
- `GET /api/weather?type=daily` — forecast agrupado por día (5 días)
- `src/lib/weather.ts` — cliente OpenWeather con fallback a datos de muestra si no hay API key
- Coordenadas se leen de la finca del usuario en BD

## Seed Data (Finca Piloto)
```
Usuario: info@fincaalvarezpacheco.co / agro2026
Finca: Álvarez Pacheco, Norte de Santander (lat=7.9273, lng=-72.5078)
Lote A: 1 ha, 1850 msnm, pendiente 15°, 160 plantas Hass
Lote B: 1 ha, 1820 msnm, pendiente 12°, 160 plantas Hass
Siembra: 9 de julio de 2026
Compradores: CoopAgroNS (Cúcuta, $3.200/kg) + Exports Colombia (Bogotá, $4.100/kg)
Alerta activa: Helada sábado 12 julio 2026
```

## Responsive / Mobile
- Layout principal: `display: flex` con sidebar 220px + main flex-1
- En móvil el sidebar debe colapsar (pendiente Sprint 3)
- PWA instalable: `public/manifest.json` configurado, service worker generado por `next-pwa`
- Breakpoints Tailwind: `sm: 640px`, `md: 768px`, `lg: 1024px`
