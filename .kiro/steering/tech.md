---
inclusion: always
---

# Stack Tecnológico AgroTech

## Core Framework
- **Next.js 15** con App Router (NO Pages Router)
- **React 19** con Server Components por defecto
- **TypeScript 5** en modo strict
- `"use client"` solo cuando se requiere estado, efectos o eventos del navegador
- Todas las páginas en `src/app/(dashboard)/` son Server Components que fetchean datos del servidor

## Base de Datos
- **PostgreSQL 16** via Docker
- **Prisma 6** como ORM — el cliente se importa de `@/lib/db`
- Schema en `prisma/schema.prisma`
- Seed con datos reales de la finca en `prisma/seed.ts`
- Correr `npm run db:push` para sincronizar schema sin migraciones
- Correr `npm run db:seed` para datos iniciales

## Autenticación
- **NextAuth.js 4** con provider de Credentials (email + password)
- Configuración en `src/lib/auth.ts`
- Session accesible con `getServerSession(authOptions)` en Server Components
- Route handler en `src/app/api/auth/[...nextauth]/route.ts`
- Las páginas del dashboard requieren sesión activa y redirigen a `/login` si no existe

## Estilos
- **Tailwind CSS 3.4** — config en `tailwind.config.ts`
- **CSS Variables globales** en `src/app/globals.css` — SIEMPRE usar las variables en vez de colores hardcoded
- Clases de utilidad en `src/lib/utils.ts`: `cn()`, `formatCOP()`, `formatCOPFull()`, `formatDate()`

## Paleta de Colores AgroTech (Tailwind)
```
agro-400: #639922   → color primario (verde aguacate)
agro-600: #3B6D11   → texto success, botones hover
agro-50:  #EAF3DE   → fondo success, badges
teal-400: #1D9E75   → color secundario
harvest-200: #EF9F27 → advertencias, alertas
harvest-400: #BA7517 → texto warning
earth-400: #888780  → texto muted
```

## CSS Variables Críticas (usar en lugar de clases Tailwind para colores de UI)
```css
var(--surface-page)          /* fondo general: #F8FAF5 */
var(--surface-card)          /* fondo tarjetas: #FFFFFF */
var(--text-primary)          /* texto principal: #1A2B14 */
var(--text-secondary)        /* texto secundario: #5F7052 */
var(--text-muted)            /* texto tenue: #8FA080 */
var(--border-subtle)         /* borde suave: rgba(0,0,0,0.06) */
var(--border-default)        /* borde normal: rgba(0,0,0,0.10) */
var(--radius-md)             /* border-radius intermedio: 10px */
var(--radius-lg)             /* border-radius tarjetas: 14px */
var(--shadow-card)           /* sombra estándar de tarjeta */
var(--sidebar-width)         /* ancho sidebar: 220px */
var(--nav-active-bg)         /* fondo nav activo: #EAF3DE */
var(--nav-active-text)       /* texto nav activo: #3B6D11 */
```

## Íconos
- **Lucide React** exclusivamente — NO usar otros icon sets
- Tamaño estándar: `size={16}` en nav, `size={20}` en headers, `size={14}` en botones

## Componentes UI Compartidos
Todos los UI primitivos están en `src/components/ui/index.tsx`:
- `Button` — variantes: `primary`, `secondary`, `ghost`, `danger`; sizes: `sm`, `md`, `lg`
- `Input` — con label, error state integrado
- `Select` — con opciones y placeholder
- `Textarea` — con label y error
- `Modal` — wrapper con overlay, tamaños: `sm`, `md`, `lg`
- `EmptyState` — con icono, título, descripción y acción

**NUNCA crear botones, inputs o modals desde cero — siempre usar estos componentes.**

## API Routes (App Router)
- Todas en `src/app/api/`
- Usan `NextResponse.json()` de `next/server`
- Autenticación con `getServerSession(authOptions)` al inicio de cada handler
- Respuesta estándar: `{ data: T }` en éxito o `{ error: string }` en error
- Siempre verificar propiedad del recurso antes de modificar/eliminar

## Librerías Instaladas
```
next-auth, bcryptjs              → autenticación
prisma, @prisma/client           → base de datos
leaflet, react-leaflet           → mapas (client-only, usar dynamic import)
recharts                         → gráficas
ai, @ai-sdk/anthropic            → streaming IA
react-hot-toast                  → notificaciones
date-fns, date-fns-tz            → fechas en español
zod                              → validación
clsx, tailwind-merge             → utilidades CSS
lucide-react                     → íconos
```

## Convenciones de Código
- Todos los tipos en `src/types/index.ts`
- Exportar labels de enums desde types: `ETAPA_LABELS`, `CATEGORIA_LABELS`, etc.
- Server Components fetchean datos y los pasan a Client Components como props
- Client Components con formularios usan `useState` + `fetch` a API routes
- `toast.success()` / `toast.error()` para feedback de acciones CRUD
- Archivos de página: `page.tsx`; componentes: PascalCase; utilidades: camelCase
