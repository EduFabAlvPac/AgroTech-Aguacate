# Sprint 3 — Lista de Tareas de Implementación

## Tarea 1: Sidebar Responsive con Overlay Mobile
- [x] Agregar estado `sidebarOpen: boolean` en un contexto o en el layout del dashboard
- [x] En `src/components/layout/Sidebar.tsx`: aplicar clases responsive con Tailwind (`hidden md:flex` en desktop, `fixed inset-y-0 left-0 z-50` en mobile)
- [x] En `src/components/layout/Header.tsx`: agregar botón hamburguesa visible solo en mobile (`md:hidden`)
- [x] Crear overlay semitransparente que cierra el sidebar al hacer clic
- [x] Asegurar que el main content tenga `ml-0 md:ml-[220px]` según el estado
- [x] Testear en 375px, 390px (iPhone 14), 412px (Pixel 7)

## Tarea 2: Skeleton Loading Components
- [x] Crear `src/components/ui/Skeleton.tsx` con variantes: `text`, `card`, `table-row`, `avatar`
- [x] Aplicar skeleton en `KpiCards.tsx` mientras se cargan los datos del servidor
- [x] Aplicar skeleton en `WeatherWidget.tsx` durante el fetch inicial (ya tiene loading parcial)
- [x] Aplicar skeleton en `FinancialChart.tsx`
- [x] Usar `loading.tsx` de Next.js 15 App Router para los módulos principales

## Tarea 3: Iconos PWA y Service Worker
- [x] Generar los íconos requeridos por `manifest.json` (72, 96, 128, 192, 512 px)
  - Usar un SVG de hoja (leaf) con fondo verde #639922
  - Guardar en `public/icons/`
- [x] Verificar que `next-pwa` genera el service worker al hacer build
  - Si hay error de compatibilidad: reemplazar `next-pwa` por `@ducanh2912/next-pwa`
  - Actualizar `package.json` y `next.config.ts` con el import correcto
- [x] Agregar meta tags adicionales para iOS en `src/app/layout.tsx`
- [x] Testear instalación en Chrome para Android

## Tarea 4: Offline Banner
- [x] Crear `src/components/ui/OfflineBanner.tsx` — escucha el evento `online/offline` del navegador
- [x] Mostrar banner amarillo en la parte superior cuando `!navigator.onLine`
- [x] Incluir el banner en el dashboard layout `src/app/(dashboard)/layout.tsx`

## Tarea 5: FAB (Floating Action Button) para Mobile
- [x] Crear `src/components/ui/MobileFAB.tsx`
- [x] Visible solo en mobile (`md:hidden fixed bottom-6 right-6 z-40`)
- [x] Al presionar: abre un mini menú con las 3 acciones rápidas
- [x] Acción "Riego": abre RegistroForm pre-llenado con tipo RIEGO
- [x] Acción "Gasto": abre GastoForm
- [x] Acción "AgroIA": navega a `/dashboard/asistente`
- [x] Agregar el FAB al layout del dashboard

## Tarea 6: Módulo de Ingresos
- [x] Crear `src/app/api/ingresos/route.ts` — GET, POST
- [x] Crear `src/app/api/ingresos/[id]/route.ts` — PUT, DELETE
- [x] Actualizar `src/app/(dashboard)/finanzas/page.tsx` para incluir ingresos
- [x] En `src/components/finanzas/FinanzasClient.tsx`:
  - Agregar sección "Registrar ingreso" con formulario
  - Mostrar tabla de ingresos separada de gastos
  - Calcular saldo = totalIngresos - totalGastos
- [x] Actualizar KPI "Ingresos" en `KpiCards.tsx` con datos reales

## Tarea 7: Export PDF de Finanzas
- [x] Instalar `jspdf` y `jspdf-autotable` (o usar `@react-pdf/renderer`)
  ```bash
  npm install jspdf jspdf-autotable
  ```
- [x] Crear `src/lib/pdf-export.ts` con función `exportFinanciasPDF(data)`
- [x] El PDF debe incluir:
  - Header: Logo AgroTech + nombre finca + período
  - Tabla: gastos por categoría con totales
  - Sección: resumen financiero (total gastos, ingresos, saldo)
  - Footer: fecha de generación + "Generado por AgroTech"
- [x] Agregar botón "Exportar PDF" en la página de finanzas
- [x] Usar `"use client"` en el componente que dispara la descarga

## Tarea 8: Validación de Formularios con Zod
- [x] Crear `src/lib/validations.ts` con schemas Zod para cada formulario
- [x] Aplicar validación en `RegistroForm.tsx` (descripción mínimo 10 chars)
- [x] Aplicar validación en `FinanzasClient.tsx` (monto > 0, concepto requerido)
- [x] Aplicar validación en `CompradoresClient.tsx` (nombre, tipo, ciudad requeridos)
- [x] Mostrar mensajes de error debajo de cada campo con el componente `Input` existente

## Tarea 9: Ajustes Visuales Mobile en Tablas
- [x] En `FinanzasClient.tsx`: envolver la tabla en `overflow-x-auto`
- [x] En móvil, ocultar columnas menos importantes: `hidden sm:table-cell`
- [x] En compradores: asegurar que las cards sean de columna única en móvil (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)

## Tarea 10: Deploy a Railway (Opcional — sprint final)
- [x] Crear `Procfile` o `railway.toml` con la configuración de Railway
- [x] Configurar variables de entorno en Railway Dashboard
- [x] Conectar repositorio GitHub → Railway para CD automático
- [ ] Configurar base de datos PostgreSQL en Railway ($5/mes)
- [ ] Ejecutar `npm run db:push && npm run db:seed` en el entorno de Railway
- [ ] Verificar que la app funciona en la URL pública de Railway
