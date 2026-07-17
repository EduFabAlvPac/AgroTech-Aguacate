# 🌿 GUÍA DE CONFIGURACIÓN AGRO TECH EN KIRO IDE
## Paso a paso desde cero — Sprint 0 hasta Sprint 2

---

## ⚠️ IMPORTANTE: ¿Qué ZIP usar?

Tienes 3 archivos ZIP. Cada uno es **acumulativo**:

| ZIP | Contiene |
|-----|----------|
| `agro-tech-sprint0.zip` | Solo la fundación |
| `agro-tech-sprint1.zip` | Sprint 0 + Sprint 1 |
| `agro-tech-sprint2.zip` | **TODO** (Sprint 0 + 1 + 2) ✅ |

**→ USA ÚNICAMENTE `agro-tech-sprint2.zip`**. Los demás los puedes ignorar.

---

## FASE 1: Preparar el Entorno (antes de abrir Kiro)

### Paso 1.1 — Verificar Node.js 20+
Abre una terminal y ejecuta:
```bash
node --version
```
Debe mostrar `v20.x.x` o superior.  
Si no lo tienes: descarga desde **https://nodejs.org** (versión LTS).

### Paso 1.2 — Instalar Docker Desktop
AgroTech usa PostgreSQL en Docker.

1. Descarga desde **https://www.docker.com/products/docker-desktop**
2. Instala y ábrelo
3. Espera a que el ícono de Docker en tu barra de sistema esté en verde ("Docker Desktop is running")
4. Verifica en terminal:
```bash
docker --version
docker-compose --version
```

### Paso 1.3 — Instalar Git (si no lo tienes)
```bash
git --version
```
Si no está instalado: **https://git-scm.com/downloads**

---

## FASE 2: Instalar Kiro IDE

### Paso 2.1 — Descargar Kiro
1. Ve a **https://kiro.dev**
2. Haz clic en "Download" y descarga el instalador para tu OS (Windows/macOS/Linux)
3. Ejecuta el instalador y sigue los pasos

### Paso 2.2 — Autenticarse en Kiro
Al abrir Kiro por primera vez:
1. Se abrirá la pantalla de login
2. Puedes usar: **Google**, **GitHub**, o **AWS Builder ID** (gratuito en kiro.dev)
3. Recomendación: usar **Google** o **GitHub** para mayor simplicidad

### Paso 2.3 — Importar configuración de VS Code (opcional)
Si ya usas VS Code, Kiro te preguntará si importar tu configuración:
- **Sí** si quieres traer tus temas, atajos y extensiones
- **No** si prefieres empezar limpio

> **Kiro es un fork de VS Code**, así que todo lo que conoces de VS Code funciona igual.

---

## FASE 3: Configurar el Proyecto AgroTech

### Paso 3.1 — Extraer el ZIP
1. Ubica `agro-tech-sprint2.zip` donde lo descargaste
2. Extrae el ZIP en una carpeta de tu elección, por ejemplo:
   - Windows: `C:\Proyectos\agro-tech\`
   - macOS/Linux: `~/proyectos/agro-tech/`
3. Verifica que al abrir la carpeta extraída ves archivos como `package.json`, `next.config.ts`, `prisma/`, etc.

### Paso 3.2 — Abrir el proyecto en Kiro
**Opción A** (recomendada): Terminal  
```bash
cd /ruta/a/la/carpeta/agro-tech
kiro .
```

**Opción B**: Desde el menú de Kiro  
`File → Open Folder → Seleccionar la carpeta agro-tech`

### Paso 3.3 — Generar los Steering Docs automáticamente
Los archivos `.kiro/steering/` ya vienen incluidos en el ZIP con el contexto completo de AgroTech. Sin embargo, si quieres que Kiro los lea y genere contexto adicional:

1. En el panel lateral de Kiro, busca la sección **"Kiro"** o **"Steering"**
2. Haz clic en **"Generate Steering Docs"** — Kiro analizará el proyecto
3. Los steering docs existentes en `.kiro/steering/` ya tienen todo el contexto

---

## FASE 4: Configurar Variables de Entorno

### Paso 4.1 — Crear el archivo .env
En la terminal de Kiro (Terminal → New Terminal):
```bash
cp .env.example .env
```

### Paso 4.2 — Editar el archivo .env
Abre `.env` en Kiro y configura los valores:

```env
# ── BASE DE DATOS (local Docker) ──────────────────────────────
DATABASE_URL="postgresql://agrotech:agrotech123@localhost:5432/agro_tech_db?schema=public"

# ── AUTENTICACIÓN ─────────────────────────────────────────────
# Genera un secreto seguro ejecutando en terminal: openssl rand -base64 32
NEXTAUTH_SECRET="tu-secreto-de-32-caracteres-aqui"
NEXTAUTH_URL="http://localhost:3000"

# ── ANTHROPIC — ASISTENTE AGRO IA ─────────────────────────────
# Obtén tu API key en: https://console.anthropic.com
ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ── OPENWEATHER — CLIMA EN TIEMPO REAL ────────────────────────
# Registro gratuito en: https://openweathermap.org/api
# La app funciona SIN esta key (usa datos de muestra)
OPENWEATHER_API_KEY="tu-api-key-aqui"

# ── APP ───────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

> **Mínimo requerido para arrancar**: `DATABASE_URL` y `NEXTAUTH_SECRET`.  
> Sin `ANTHROPIC_API_KEY` el asistente IA no funcionará.  
> Sin `OPENWEATHER_API_KEY` el clima mostrará datos de muestra (la app sigue funcionando).

### Paso 4.3 — Generar el NEXTAUTH_SECRET
En la terminal de Kiro:
```bash
# macOS/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```
Copia el resultado y pégalo como valor de `NEXTAUTH_SECRET` en el `.env`.

### Paso 4.4 — Obtener API Keys gratuitas

**Anthropic API Key:**
1. Ve a **https://console.anthropic.com**
2. Crea una cuenta (puedes usar Google)
3. Ve a "API Keys" → "Create Key"
4. Copia la key (empieza con `sk-ant-...`)
5. Nuevo usuario tiene créditos gratis suficientes para el MVP

**OpenWeather API Key:**
1. Ve a **https://openweathermap.org**
2. Crea una cuenta gratuita
3. Ve a "My API Keys"
4. Copia la key (free tier: 60 calls/min, 1M calls/mes)

---

## FASE 5: Instalar Dependencias

En la terminal de Kiro:
```bash
npm install
```
Esto puede tardar 2-5 minutos la primera vez.

---

## FASE 6: Levantar la Base de Datos

### Paso 6.1 — Iniciar Docker Desktop
Asegúrate de que Docker Desktop está corriendo (ícono verde en la barra de sistema).

### Paso 6.2 — Levantar PostgreSQL
```bash
docker-compose up -d
```
Verás algo como:
```
✅ Container agro-tech-db  Started
✅ Container agro-tech-redis  Started
```

Verifica que está corriendo:
```bash
docker-compose ps
```

### Paso 6.3 — Inicializar el Schema de la BD
```bash
npm run db:generate   # Genera el cliente Prisma TypeScript
npm run db:push       # Crea todas las tablas en PostgreSQL
```

### Paso 6.4 — Sembrar los Datos de la Finca
```bash
npm run db:seed
```
Verás:
```
🌱 Sembrando datos iniciales...
✅ Datos sembrados correctamente
   👤 Usuario: info@fincaalvarezpacheco.co / agro2026
   🌿 Finca: Finca Álvarez Pacheco
   🌱 Cultivos: Lote A (160 plantas) + Lote B (160 plantas)
   💰 Compradores: CoopAgroNS y Exports Colombia
```

---

## FASE 7: Ejecutar la App

```bash
npm run dev
```

Verás:
```
▲ Next.js 15.3.3
- Local:   http://localhost:3000
- Ready in 2.5s
```

Abre **http://localhost:3000** en tu navegador.

**Credenciales de acceso:**
```
Email:      info@fincaalvarezpacheco.co
Contraseña: agro2026
```

---

## FASE 8: Validar que Todo Funciona

Navega por cada módulo y verifica:

| Módulo | URL | Qué verificar |
|--------|-----|---------------|
| Dashboard | /dashboard | KPIs, mapa, clima, timeline, IA preview |
| Cultivos | /dashboard/cultivos | Lote A y B con 160 plantas cada uno |
| Mapa | /dashboard/mapa | Mapa de OpenStreetMap con los 2 lotes |
| Finanzas | /dashboard/finanzas | Gastos de $2.45M en julio |
| Asistente IA | /dashboard/asistente | Chat funcional (requiere ANTHROPIC_API_KEY) |
| Alertas | /dashboard/alertas | 1 alerta de helada activa |
| Compradores | /dashboard/compradores | CoopAgroNS + Exports Colombia |
| Configuración | /dashboard/configuracion | Perfil, finca y umbrales de alertas |

---

## FASE 9: Configurar Kiro para el Desarrollo Continuo

### Paso 9.1 — Verificar los Steering Files
En el panel de Kiro, sección "Steering", deberías ver estos archivos:
- `product.md` — Qué es AgroTech y para quién
- `tech.md` — Stack tecnológico y convenciones
- `structure.md` — Estructura de archivos y patrones
- `agrotech-domain.md` — Schema BD, componentes, colores

Si no aparecen, ve al explorador de archivos → `.kiro/steering/` → haz clic en cada archivo.

### Paso 9.2 — Ver la Spec de Sprint 3
En el panel de Kiro, sección "Specs":
- Abre `.kiro/specs/sprint3/requirements.md` — qué falta por construir
- Abre `.kiro/specs/sprint3/tasks.md` — lista de tareas implementables

Para que Kiro implemente una tarea, simplemente pídeselo en el chat:
> "Implementa la Tarea 1 del Sprint 3: sidebar responsive para mobile"

### Paso 9.3 — Comandos útiles de Kiro en chat
Puedes pedirle a Kiro directamente en el chat:
- "Crea un componente para registrar ingresos de venta de aguacate"
- "Implementa la funcionalidad offline con service worker"
- "Agrega validación Zod al formulario de gastos"
- "Genera el PDF de resumen financiero del cultivo"

Los steering files ya le dan el contexto del proyecto, así que Kiro generará código que encaja con los patrones existentes.

---

## SOLUCIÓN DE PROBLEMAS FRECUENTES

### Error: `Cannot find module 'next-pwa'`
```bash
# Instalar la versión compatible con Next.js 15
npm install @ducanh2912/next-pwa
```
Luego en `next.config.ts`, cambia:
```typescript
// ANTES:
const withPWA = require("next-pwa")({...})
// DESPUÉS:
const withPWA = require("@ducanh2912/next-pwa").default({...})
```

### Error: `Error: P1001: Can't reach database server`
- Verifica que Docker Desktop está corriendo
- Ejecuta `docker-compose up -d` de nuevo
- Verifica: `docker-compose ps` — el contenedor `agro-tech-db` debe estar `Up`

### Error: `Port 5432 already in use`
Tienes PostgreSQL instalado localmente. Dos opciones:
1. Para el servicio local: `sudo systemctl stop postgresql` (Linux) o desde Servicios (Windows)
2. Cambia el puerto en `docker-compose.yml` de `5432:5432` a `5433:5432` y actualiza `DATABASE_URL`

### Error: `Port 3000 already in use`
```bash
npm run dev -- -p 3001
```
O cierra la app que usa el puerto 3000.

### El asistente IA no responde
- Verifica que `ANTHROPIC_API_KEY` está correctamente configurada en `.env`
- La key debe empezar con `sk-ant-`
- Verifica que tienes saldo en **https://console.anthropic.com**

### La app se ve diferente al mockup
- Ejecuta `npm run dev` y espera a que Tailwind compile los estilos
- Intenta hard refresh: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (macOS)

---

## COMANDOS DE REFERENCIA RÁPIDA

```bash
# Desarrollo
npm run dev                 # Iniciar servidor de desarrollo
npm run build               # Build de producción
npm run start               # Iniciar servidor de producción

# Base de datos
npm run db:generate         # Regenerar cliente Prisma después de cambios al schema
npm run db:push             # Sincronizar schema (sin migraciones)
npm run db:studio           # Abrir GUI de la BD en el navegador
npm run db:seed             # Volver a sembrar datos de la finca
npm run db:reset            # CUIDADO: borra TODO y re-siembra

# Docker
docker-compose up -d        # Levantar PostgreSQL y Redis
docker-compose down         # Detener los contenedores
docker-compose ps           # Ver estado de los contenedores
docker-compose logs -f      # Ver logs en tiempo real

# Código
npm run lint                # Revisar errores de TypeScript/ESLint
```

---

## ESTRUCTURA FINAL DEL PROYECTO

```
agro-tech/
├── .kiro/
│   ├── steering/         ← Contexto del proyecto para Kiro
│   │   ├── product.md    ← Visión y objetivos
│   │   ├── tech.md       ← Stack y convenciones
│   │   ├── structure.md  ← Organización de archivos
│   │   └── agrotech-domain.md ← BD, componentes, colores
│   └── specs/
│       └── sprint3/      ← Tareas del Sprint 3 para Kiro
├── prisma/               ← Schema de la BD
├── src/                  ← Todo el código
│   ├── app/              ← Páginas y API routes
│   ├── components/       ← Componentes React
│   ├── lib/              ← Utilidades, DB, IA, Clima
│   └── types/            ← TypeScript types
├── public/               ← PWA manifest e íconos
├── .env                  ← Variables de entorno (NO commitear)
└── docker-compose.yml    ← PostgreSQL + Redis
```

---

*AgroTech MVP v0.2.0 (Sprint 2) — Julio 2026*  
*Finca Álvarez Pacheco · Norte de Santander · Colombia 🇨🇴*
