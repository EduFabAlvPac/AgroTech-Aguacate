# 🌿 AgroTech — Plataforma de Gestión Agrícola

Plataforma integral para la gestión del cultivo de **Aguacate Hass** en Finca Álvarez Pacheco, Norte de Santander, Colombia.

---

## 🚀 Inicio Rápido (5 minutos)

### Prerrequisitos
- Node.js 20+
- Docker Desktop
- Git

### 1. Clonar y configurar

```bash
git clone <repo-url> agro-tech
cd agro-tech
cp .env.example .env
npm install
```

### 2. Levantar la base de datos

```bash
docker-compose up -d
```

### 3. Configurar la base de datos

```bash
npm run db:generate   # Genera el cliente Prisma
npm run db:push       # Crea las tablas
npm run db:seed       # Siembra los datos iniciales de la finca
```

### 4. Iniciar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

### 5. Ingresar al sistema

```
Email:      info@fincaalvarezpacheco.co
Contraseña: agro2026
```

---

## 📁 Estructura del Proyecto

```
agro-tech/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Autenticación
│   │   ├── (dashboard)/           # Todas las páginas del dashboard
│   │   │   ├── page.tsx           # Dashboard principal
│   │   │   ├── cultivos/          # Gestión de cultivos
│   │   │   ├── mapa/              # Mapa interactivo de lotes
│   │   │   ├── finanzas/          # Gastos e ingresos
│   │   │   ├── asistente/         # Agente IA especializado
│   │   │   ├── alertas/           # Alertas climáticas
│   │   │   └── compradores/       # Red de compradores
│   │   └── api/                   # API Routes (REST)
│   ├── components/
│   │   ├── layout/               # Sidebar + Header
│   │   ├── dashboard/            # Componentes del dashboard
│   │   ├── ui/                   # Design system
│   │   └── providers/            # Context providers
│   ├── lib/
│   │   ├── db.ts                 # Prisma client
│   │   ├── auth.ts               # NextAuth config
│   │   └── utils.ts              # Utilidades
│   └── types/                    # TypeScript types
├── prisma/
│   ├── schema.prisma             # Modelo de datos
│   └── seed.ts                   # Datos iniciales de la finca
├── public/
│   ├── manifest.json             # PWA manifest
│   └── icons/                    # Íconos de la app
├── docker-compose.yml
└── .env.example
```

---

## 🎯 Módulos del MVP

| Módulo | Ruta | Estado |
|--------|------|--------|
| Dashboard principal | `/dashboard` | ✅ Sprint 1 |
| Gestión de cultivos | `/dashboard/cultivos` | 🏗️ Sprint 1 |
| Mapa de lotes | `/dashboard/mapa` | 🏗️ Sprint 1 |
| Finanzas | `/dashboard/finanzas` | 🏗️ Sprint 2 |
| Asistente IA | `/dashboard/asistente` | 📅 Sprint 3 |
| Alertas climáticas | `/dashboard/alertas` | 📅 Sprint 3 |
| Compradores | `/dashboard/compradores` | 🏗️ Sprint 1 |

---

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo con hot-reload
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run db:push      # Sincronizar schema con la BD
npm run db:studio    # Abrir Prisma Studio (GUI de la BD)
npm run db:seed      # Sembrar datos iniciales
npm run db:reset     # Resetear y re-sembrar la BD
```

---

## 🌱 Datos de la Finca (Seed)

La base de datos viene pre-configurada con:
- **Finca:** Álvarez Pacheco · Norte de Santander
- **Lote A:** 1 ha · 1,850 msnm · 160 plantas Hass
- **Lote B:** 1 ha · 1,820 msnm · 160 plantas Hass
- **Siembra:** 9 de julio de 2026
- **Compradores:** CoopAgroNS + Exports Colombia
- **Alertas:** Helada proyectada 12 Jul 2026

---

## 🌐 Tech Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript strict |
| Estilos | Tailwind CSS 3.4 |
| Base de datos | PostgreSQL 16 + Prisma |
| Autenticación | NextAuth.js 4 |
| Mapas | Leaflet + React-Leaflet |
| Gráficas | Recharts |
| IA | Anthropic Claude API |
| PWA | next-pwa |
| Íconos | Lucide React |
| Contenedores | Docker + Docker Compose |

---

## 📡 Variables de Entorno Requeridas

```env
DATABASE_URL         # PostgreSQL connection string
NEXTAUTH_SECRET      # Secreto para JWT (mínimo 32 chars)
NEXTAUTH_URL         # URL base de la app
ANTHROPIC_API_KEY    # API key de Anthropic (asistente IA)
OPENWEATHER_API_KEY  # API key OpenWeather (alertas)
```

---

## 🤝 Contribución

Este proyecto sigue la metodología **Agile** con sprints de 2-3 semanas.

Ver `.kiro/PLAN-MAESTRO-AGRO-TECH.md` para el roadmap completo.

---

*AgroTech MVP v0.1.0 · Julio 2026 · Norte de Santander, Colombia* 🇨🇴
