---
inclusion: always
---

# Estructura del Proyecto AgroTech

## Árbol de directorios principal
```
agro-tech/
├── prisma/
│   ├── schema.prisma        ← Modelos de BD (User, Finca, Lote, Cultivo, Gasto, etc.)
│   └── seed.ts              ← Datos reales de Finca Álvarez Pacheco
├── public/
│   ├── manifest.json        ← PWA manifest
│   └── icons/               ← Íconos PWA (deben generarse)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/           ← Requiere sesión activa
│   │   │   ├── layout.tsx         ← Sidebar + SessionProvider
│   │   │   ├── page.tsx           ← Dashboard principal
│   │   │   ├── cultivos/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx  ← Detalle de cultivo
│   │   │   ├── mapa/page.tsx
│   │   │   ├── finanzas/page.tsx
│   │   │   ├── asistente/page.tsx
│   │   │   ├── alertas/page.tsx
│   │   │   ├── compradores/page.tsx
│   │   │   └── configuracion/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── cultivos/
│   │   │   │   ├── route.ts              ← GET list, POST create
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          ← GET, PUT, DELETE
│   │   │   │       └── registros/route.ts ← GET, POST
│   │   │   ├── gastos/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── compradores/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── alertas/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── generate/route.ts     ← POST dispara motor de alertas
│   │   │   ├── weather/route.ts          ← GET ?type=current|daily|forecast
│   │   │   ├── chat/route.ts             ← POST streaming con RAG
│   │   │   └── configuracion/route.ts    ← GET, PUT (section: profile|finca|alertas)
│   │   ├── globals.css
│   │   ├── layout.tsx          ← Root layout: HTML, fonts, Toaster
│   │   └── page.tsx            ← Redirect a /dashboard o /login
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx     ← Navegación principal
│   │   │   └── Header.tsx      ← Barra superior con fecha y notificaciones
│   │   ├── ui/
│   │   │   └── index.tsx       ← Button, Input, Select, Textarea, Modal, EmptyState
│   │   ├── providers/
│   │   │   └── SessionProvider.tsx
│   │   ├── dashboard/          ← Widgets del dashboard principal
│   │   │   ├── KpiCards.tsx
│   │   │   ├── MapPreview.tsx
│   │   │   ├── WeatherWidget.tsx
│   │   │   ├── CropTimeline.tsx
│   │   │   ├── AiChatPreview.tsx
│   │   │   ├── FinancialChart.tsx
│   │   │   └── BuyersPreview.tsx
│   │   ├── cultivos/
│   │   │   ├── CultivosList.tsx
│   │   │   ├── CultivoDetail.tsx
│   │   │   └── RegistroForm.tsx
│   │   ├── finanzas/
│   │   │   └── FinanzasClient.tsx
│   │   ├── compradores/
│   │   │   └── CompradoresClient.tsx
│   │   ├── mapa/
│   │   │   ├── MapaContainer.tsx  ← SSR-safe wrapper
│   │   │   └── LeafletMap.tsx     ← "use client", dynamic import
│   │   ├── alertas/
│   │   │   └── AlertasClient.tsx
│   │   ├── asistente/
│   │   │   └── ChatInterface.tsx  ← "use client", useChat hook
│   │   └── configuracion/
│   │       └── ConfigClient.tsx
│   ├── lib/
│   │   ├── db.ts               ← Singleton Prisma client
│   │   ├── auth.ts             ← NextAuth options
│   │   ├── utils.ts            ← cn(), formatCOP(), formatDate()
│   │   ├── weather.ts          ← OpenWeather API client
│   │   ├── rag.ts              ← RAG retrieval engine
│   │   ├── alert-engine.ts     ← Motor de alertas climáticas
│   │   └── knowledge/
│   │       └── base.ts         ← Knowledge base aguacate Hass (18 chunks)
│   └── types/
│       └── index.ts            ← Todos los tipos TS y labels de enums
├── .kiro/
│   ├── steering/               ← Archivos de contexto para Kiro
│   └── specs/                  ← Specs de features por sprint
├── .env                        ← Variables de entorno (NO commitear)
├── .env.example                ← Template de variables
├── docker-compose.yml          ← PostgreSQL + Redis
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Patrones de Importación
```typescript
// Siempre usar alias @/ para src/
import { db } from "@/lib/db";
import { Button, Modal } from "@/components/ui";
import { formatCOP } from "@/lib/utils";
import type { Cultivo, EtapaCultivo } from "@prisma/client";
import type { CultivoWithRelations } from "@/types";
```

## Patrón Server Component → Client Component
```typescript
// PÁGINA (Server Component) — fetchea datos
export default async function FooPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const data = await db.foo.findMany({ where: { userId: session.user.id } });
  return <FooClient data={data} />;
}

// COMPONENTE (Client Component) — interactividad
"use client";
export function FooClient({ data }: { data: Foo[] }) {
  const [items, setItems] = useState(data);
  // ... CRUD con fetch a /api/foo
}
```

## Patrón API Route
```typescript
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // verificar ownership antes de operar
  // return NextResponse.json({ data: result });
}
```

## Convenciones de Nombres
- Páginas: `page.tsx` (minúsculas)
- Componentes: `PascalCase.tsx`
- Hooks personalizados: `useXxx.ts`
- Utilidades: `camelCase.ts`
- API routes: `route.ts` (minúsculas)
- Enums Prisma: `SCREAMING_SNAKE_CASE` (definidos en schema)
- Labels de enums: exportados desde `@/types` como `ETAPA_LABELS`, etc.
