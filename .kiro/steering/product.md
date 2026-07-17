---
inclusion: always
---

# AgroTech — Plataforma de Gestión Agrícola

## Visión del Producto
AgroTech es una PWA (Progressive Web App) para la gestión integral del cultivo de **Aguacate Hass** en Colombia. Democratiza la tecnología agrícola para pequeños y medianos productores, empezando como proyecto piloto en la **Finca Álvarez Pacheco, Norte de Santander**.

## Propuesta de Valor
- Seguimiento del ciclo completo del cultivo (siembra → cosecha)
- Gestión financiera especializada (gastos e ingresos del cultivo)
- Mapa interactivo georreferenciado de los lotes
- Asistente IA (AgroIA) especializado en aguacate Hass colombiano, con RAG técnico
- Alertas climáticas automáticas (OpenWeather + IDEAM)
- Red de compradores para comercialización local en Colombia

## Usuarios Objetivo
- **Productor principal**: Eduard Álvarez Pacheco (piloto, 2 ha, Norte de Santander)
- **Productores pequeños y medianos** de aguacate Hass en Colombia
- **Asesores técnicos agrícolas** (rol futuro)
- **Compradores/distribuidores** (rol futuro en marketplace)

## Modelo de Negocio
- **Plan Semilla (Free)**: 1 finca, hasta 2 lotes, 20 consultas IA/mes
- **Plan Cosecha (Premium)**: $25.000 COP/mes — ilimitado + IA + alertas avanzadas
- **Plan Cooperativa**: $15.000 COP/usuario/mes (mínimo 5 usuarios)

## Estado Actual del Proyecto
- Sprint 0 ✅: Fundación — Next.js 15, Prisma, Docker, Auth, DB schema, seed data
- Sprint 1 ✅: Core MVP — CRUD cultivos, finanzas, compradores, mapa Leaflet, alertas, asistente IA
- Sprint 2 ✅: IA + Clima — RAG con knowledge base aguacate, OpenWeather, motor de alertas, configuración
- Sprint 3 🏗️: Refinamiento — Responsive mobile, testing, optimización, deploy

## Restricciones Importantes
- Presupuesto $0 para infraestructura en MVP (free tiers)
- Mercado objetivo actual: solo Colombia, sin exportación
- El agente IA (AgroIA) responde siempre en español colombiano
- Todos los valores monetarios en COP (pesos colombianos)
