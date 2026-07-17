# PLAN MAESTRO · AGRO TECH MVP
**Versión:** 0.1.0  
**Fecha inicio:** 9 julio 2026  
**Finca piloto:** Álvarez Pacheco · Norte de Santander  
**Comercialización:** Mercado local Colombia  

---

## 🎯 OKRs del Proyecto

**O1 · MVP funcional en 12 semanas**
- KR1: Dashboard operativo con datos reales de la finca
- KR2: Módulo financiero con 100% de gastos registrados
- KR3: Asistente IA respondiendo consultas técnicas
- KR4: App instalable como PWA en móvil

**O2 · Primer usuario piloto real**
- KR1: 1 finca configurada (Álvarez Pacheco)
- KR2: 2 lotes georreferenciados
- KR3: 1 comprador activo registrado

---

## 🏃 ROADMAP · SPRINTS ÁGILES

### ✅ Sprint 0 · Fundación (Sem 1 — COMPLETADO)
**Entregables:**
- [x] Estructura monorepo Next.js 15 + TypeScript
- [x] Tailwind CSS + Design system AgroTech
- [x] Prisma schema completo (12 entidades)
- [x] Seed data finca Álvarez Pacheco
- [x] Docker Compose (PostgreSQL + Redis)
- [x] NextAuth con credenciales
- [x] PWA manifest.json
- [x] Dashboard principal con todos los widgets
- [x] Sidebar + Header layout
- [x] README setup guide

---

### 🏗️ Sprint 1 · Core MVP (Sem 2–3)
**Objetivo:** CRUD completo de cultivos, lotes, finanzas y compradores

#### Módulo Cultivos (`/dashboard/cultivos`)
- [ ] Lista de cultivos con estado por etapa
- [ ] Detalle de cultivo (info + timeline + registros)
- [ ] Formulario nuevo registro de actividad (CRUD)
- [ ] Galería de fotos por registro
- [ ] Historial de actividades filtrable por tipo

#### Módulo Finanzas (`/dashboard/finanzas`)
- [ ] Lista gastos con filtros (categoría, fecha, lote)
- [ ] Formulario nuevo gasto
- [ ] Resumen por categoría (donut chart)
- [ ] Proyección de gastos para próximas etapas
- [ ] Exportar resumen a PDF (básico)

#### Módulo Compradores (`/dashboard/compradores`)
- [ ] Lista completa de compradores
- [ ] Formulario crear/editar comprador
- [ ] Detalle de comprador (historial de ventas)
- [ ] Estado activo/prospecto

#### Módulo Mapa (`/dashboard/mapa`)
- [ ] Mapa Leaflet + OpenStreetMap
- [ ] Polígonos de lotes (GeoJSON de BD)
- [ ] Popup de lote con info del cultivo
- [ ] Dibujar nuevos lotes (draw plugin)

---

### 📅 Sprint 2 · IA + Clima (Sem 4–6)
**Objetivo:** Agente IA funcional + alertas climáticas en tiempo real

#### Asistente IA (`/dashboard/asistente`)
- [ ] Chat interface full-screen
- [ ] Integración Claude API con context del cultivo
- [ ] Sistema RAG: documentos técnicos aguacate Hass
  - Manual ICA de plagas del aguacate
  - Guía de riego aguacate Hass Colombia
  - Fichas técnicas de nutrición Hass
- [ ] Historial de conversaciones (BD)
- [ ] Sugerencias contextuales basadas en etapa del cultivo

#### Alertas Climáticas (`/dashboard/alertas`)
- [ ] Integración OpenWeather API (forecast 7 días)
- [ ] Integración IDEAM datos abiertos
- [ ] Sistema de umbrales configurables
- [ ] Lista de alertas activas e historial
- [ ] Notificaciones push (service worker)
- [ ] Recomendaciones automáticas por alerta

---

### 📅 Sprint 3 · Refinamiento + Launch (Sem 7–9)
**Objetivo:** Polish, testing, despliegue en producción

#### UX / UI
- [ ] Responsive mobile completo
- [ ] PWA: instalar en Android/iOS
- [ ] Offline mode (service worker + cache)
- [ ] Loading states y skeleton screens
- [ ] Formularios con validación Zod

#### Testing
- [ ] Tests unitarios (Vitest): utils + lib
- [ ] Tests de integración: API routes
- [ ] Tests E2E (Playwright): flujos críticos
- [ ] Cobertura mínima 60%

#### Deploy
- [ ] Configurar Railway o Render (free tier)
- [ ] Variables de entorno en producción
- [ ] CI/CD con GitHub Actions
- [ ] Monitoreo básico (Sentry free tier)

---

## 📐 ARQUITECTURA DE DATOS

### Flujo principal
```
Usuario → Finca → Lotes → Cultivos → Registros
                                    → Gastos
                                    → Ingresos ← Compradores
```

### Entidades y relaciones
```
User (1) ──< Finca (1) ──< Lote (*) ──< Cultivo (*)
                                         ├──< RegistroCultivo (*)
                                         ├──< Gasto (*)
                                         └──< Ingreso (*) >── Comprador
User (1) ──< Comprador (*)
AlertaClimatica (*)  [no relacionada a user, global]
ChatMessage (*)  [por usuario]
```

---

## 🎨 DESIGN SYSTEM

### Paleta de colores
```css
--agro-green:   #639922  /* primary */
--agro-dark:    #3B6D11  /* text success */
--agro-light:   #EAF3DE  /* bg success */
--agro-teal:    #1D9E75  /* secondary */
--agro-amber:   #EF9F27  /* warning */
--surface-page: #F8FAF5  /* background */
```

### Tipografía
- Display: Inter 600 (headings)
- Body: Inter 400 (contenido)
- Mono: JetBrains Mono (datos técnicos)

### Componentes clave
- `Card` · border-radius 14px · shadow-card
- `Badge` · variants: success, warning, info, danger
- `KpiCard` · metric display con icono y contexto
- `Sidebar` · navegación principal · 220px
- `Header` · título + fecha + notificaciones

---

## 🔐 SEGURIDAD

- [ ] Autenticación JWT con NextAuth
- [ ] Row-level security: usuario solo ve su finca
- [ ] Validación de inputs con Zod
- [ ] Rate limiting en API routes (Sprint 3)
- [ ] Variables de entorno nunca en el código
- [ ] HTTPS en producción

---

## 💰 ESTIMACIÓN DE COSTOS (producción)

| Servicio | Plan | Costo/mes |
|----------|------|-----------|
| Railway (app) | Starter | $5 USD |
| Railway (PostgreSQL) | Starter | $5 USD |
| Anthropic API | Pay-as-you-go | ~$2-5 USD |
| OpenWeather | Free tier | $0 |
| Total | | **~$12-15 USD/mes** |

---

## 📋 BACKLOG DE FUNCIONALIDADES FUTURAS (Post-MVP)

- **v1.1:** Módulo de exportación e informes PDF
- **v1.2:** Integración con SIGRA/IDEAM oficial
- **v1.3:** Multi-finca support
- **v1.4:** Modo cooperativa (múltiples productores)
- **v1.5:** Marketplace de compradores
- **v2.0:** App nativa React Native
- **v2.1:** Predicciones de cosecha con ML
- **v2.2:** Blockchain para trazabilidad

---

*Generado por AgroTech Arquitecto · Julio 2026*
