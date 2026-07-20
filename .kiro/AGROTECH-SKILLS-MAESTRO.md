# 🌿 AgroTech — Catálogo Maestro de Skills
## Skills para el Crecimiento Exponencial de la Plataforma

**Proyecto:** AgroTech — Plataforma de Gestión Agrícola para Aguacate Hass  
**URL Producción:** agro-tech-aguacate.vercel.app  
**Repositorio:** github.com/EduFabAlvPac/AgroTech-Aguacate  
**Stack:** Next.js 15 · TypeScript · Prisma · PostgreSQL · Vercel · Groq IA  

---

## Estructura del Documento

Este catálogo organiza **37 Skills** en 9 categorías estratégicas, cada una lista para implementarse con `/skill-creator`. Las skills están diseñadas para potenciar AgroTech desde el conocimiento ancestral del campo hasta la inteligencia artificial más avanzada.

| # | Categoría | Skills |
|---|-----------|--------|
| 1 | Dominio Agrícola | 7 skills |
| 2 | Estrategia y Liderazgo | 5 skills |
| 3 | Producto y Gestión | 4 skills |
| 4 | Arquitectura Técnica | 3 skills |
| 5 | Desarrollo de Software | 6 skills |
| 6 | Operaciones y Calidad | 4 skills |
| 7 | Datos e Inteligencia Artificial | 4 skills |
| 8 | Comercio y Mercadeo | 3 skills |
| 9 | Sostenibilidad y Ambiente | 1 skill |

---

## CATEGORÍA 1 — Dominio Agrícola 🌱

---

### SKILL-01: Agricultor Colombiano — Conocimiento Ancestral y de Campo

```yaml
name: agrotech-agricultor-colombiano
description: >
  Experto en prácticas agrícolas tradicionales y ancestrales colombianas,
  combinando el saber campesino con técnicas modernas. Usar cuando el usuario
  necesite consejo práctico de campo, identificar problemas reales del cultivo
  desde la experiencia, interpretar señales naturales del aguacate, planificar
  según el calendario lunar y la sabiduría local de Norte de Santander,
  o cuando pregunte "¿qué haría un campesino experimentado ante esto?".
  También usar para validar que las recomendaciones técnicas sean aplicables
  en la realidad del campo colombiano.
```

**Propósito:** Humanizar la tecnología con el conocimiento que no está en los libros — el que se transmite de generación en generación en el campo colombiano.

**Conocimiento Clave:**
- Calendario lunar para siembra, poda y cosecha en aguacate
- Señales naturales de estrés hídrico, plagas y enfermedades visibles a ojo desnudo
- Prácticas de compostaje y abonos orgánicos tradicionales (bocashi, compost de pulpa)
- Asociación de cultivos en Norte de Santander (aguacate + plátano, aguacate + café)
- Manejo de pendientes en zonas montañosas de la región Andina colombiana
- Lectura del clima local: vientos, nubes, comportamiento de animales como indicadores
- Variedades locales y sus comportamientos en microclimas específicos
- Conocimiento de mercados locales: plazas de Ocaña, Cúcuta, Bucaramanga
- Expresiones y terminología del campo colombiano (orejero, palito, arbolito, mata)

**Outputs para AgroTech:**
- Recomendaciones de AgroIA con lenguaje y ejemplos campesinos
- Alertas basadas en señales naturales (no solo datos climáticos)
- Calendario de actividades según luna y tradición local
- Validación de que los formularios usen términos que el campesino entienda

**Integración AgroTech:**
- Alimentar el sistema prompt de AgroIA con conocimiento ancestral
- Módulo de "Sabiduría del Campo" con tips semanales
- Validación de UX: ¿lo entendería un productor sin estudios universitarios?

---

### SKILL-02: Ingeniero Agrónomo / Agroecólogo

```yaml
name: agrotech-agronomo
description: >
  Especialista en agronomía científica aplicada al aguacate Hass en Colombia
  (1.500-2.200 msnm). Usar cuando se necesite fundamentación técnica-científica
  sobre manejo fitosanitario, nutrición vegetal, fisiología del aguacate,
  manejo integrado de plagas (MIP), análisis de suelos, sistemas de riego
  tecnificado, o cuando el usuario presente síntomas de enfermedad y necesite
  diagnóstico preciso. También usar para diseñar protocolos técnicos que
  cumplan los estándares del ICA Colombia.
```

**Propósito:** Proveer el rigor científico que valida todas las recomendaciones de AgroIA y los módulos técnicos de la plataforma.

**Conocimiento Clave:**
- Fisiología del Persea americana var. drymifolia (aguacate Hass) en trópico alto
- Ciclo fenológico completo: brotación, floración, cuajado, desarrollo fruto, cosecha
- Nutrición mineral: macros (N-P-K-Ca-Mg-S) y micros (B-Zn-Fe-Mn) en aguacate
- Análisis foliar e interpretación: valores óptimos por etapa fenológica
- Manejo Integrado de Plagas (MIP): Phytophthora, Antracnosis, Thrips, Ácaros, Monalonion
- Sistemas de riego: goteo, microaspersión — caudales y frecuencias por etapa
- Podas de formación, producción y sanitaria en Hass
- Portainjertos: Duke 7, Martin Grande, Topa Topa, Mexicola — ventajas por altitud
- Certificaciones: Buenas Prácticas Agrícolas (BPA-ICA), GlobalG.A.P.
- Normativa ICA Colombia: registro de predios, fitosanitarios permitidos

**Outputs para AgroTech:**
- Protocolos técnicos de fertilización por etapa del cultivo
- Guías de diagnóstico visual de plagas y enfermedades con fotos
- Calendarios agronómicos mensuales para Norte de Santander
- Umbrales de acción para alertas fitosanitarias en AgroIA
- Fichas técnicas de productos agroquímicos permitidos en Colombia

**Integración AgroTech:**
- Knowledge base de AgroIA (RAG técnico agronómico)
- Módulo de diagnóstico de plagas con selección de síntomas
- Alertas fitosanitarias predictivas basadas en clima + etapa fenológica

---

### SKILL-03: Ingeniero Ambiental

```yaml
name: agrotech-ingeniero-ambiental
description: >
  Especialista en impacto ambiental, sostenibilidad y regulación ambiental
  para sistemas productivos agrícolas en Colombia. Usar cuando se requiera
  evaluar impacto ambiental del cultivo, gestionar residuos agroquímicos,
  planificar zonas de conservación, calcular huella de carbono, cumplir
  normativa ambiental (CORPORNOR, Ministerio de Ambiente), o cuando el
  usuario quiera obtener certificaciones ambientales para diferenciarse
  en el mercado de exportación de aguacate Hass.
```

**Propósito:** Asegurar que AgroTech promueva agricultura sostenible y ayude a los productores a cumplir regulaciones ambientales que abren puertas de mercado.

**Conocimiento Clave:**
- Normativa ambiental colombiana: Decreto 1076/2015, Ley 99/1993
- CORPORNOR: concesiones de agua, permisos de uso del suelo en Norte de Santander
- Gestión de envases y residuos de agroquímicos: CAMPO LIMPIO Colombia
- Huella de carbono en sistemas aguacateros: metodologías de cálculo
- Zonas de recarga hídrica y franjas de protección en sistemas montañosos
- Manejo de aguas residuales del beneficio del aguacate
- Indicadores de biodiversidad en sistemas agroforestales
- Carbono orgánico del suelo: secuestro y metodologías de medición
- Certificaciones: Rainforest Alliance, orgánico USDA, UTZ, Fairtrade
- Bonos de carbono: mercados voluntarios y metodologías para pequeños productores

**Outputs para AgroTech:**
- Checklist de cumplimiento ambiental para productores colombianos
- Calculadora de huella de carbono integrada en el módulo de finanzas
- Guía de buenas prácticas ambientales en aguacate Hass
- Alertas de cumplimiento ambiental periódico

**Integración AgroTech:**
- Módulo "Sostenibilidad" con indicadores ambientales del cultivo
- Integración con CORPORNOR para consulta de permisos (futuro)
- Dashboard de huella de carbono vs. finca promedio colombiana

---

### SKILL-04: Tecnólogo Agrícola / Asistente Técnico de Campo

```yaml
name: agrotech-asistente-tecnico
description: >
  Técnico de campo con conocimiento práctico de implementación agrícola,
  operación de equipos, aplicación de agroquímicos y registro de actividades.
  Usar cuando el usuario necesite instrucciones paso a paso para realizar
  actividades específicas (aplicar un fungicida, calibrar un equipo de riego,
  preparar una mezcla de fertilizantes), o cuando necesite convertir
  recomendaciones agronómicas en tareas concretas y registrables en AgroTech.
  También usar para diseñar los formularios y campos de registro de actividades.
```

**Propósito:** Traducir el conocimiento técnico en acciones concretas y registrables, siendo el puente entre la recomendación y la ejecución en campo.

**Conocimiento Clave:**
- Calibración y operación de equipos de fumigación (aspersoras de espalda, bombas)
- Preparación de caldos: dosis, mezclas, orden de adición de productos
- Equipos de protección personal (EPP) requeridos por producto
- Lectura de etiquetas de agroquímicos (INVIMA-ICA)
- Sistemas de riego por goteo: instalación, mantenimiento, cálculo de caudales
- Toma de muestras de suelo y tejido vegetal para análisis
- Registro de cuaderno de campo: qué datos capturar y cómo
- Bitácora de aplicaciones: producto, dosis, fecha, lote, operario
- Periodos de carencia y reentrada de agroquímicos
- Manejo post-cosecha básico: clasificación, empaque, cadena de frío

**Outputs para AgroTech:**
- Checklist de actividades de campo con campos de registro precisos
- Instrucciones de uso para cada tipo de registro en la app
- Validaciones de formularios (ej: dosis máxima, período de carencia)
- Guías rápidas de campo descargables en PDF

**Integración AgroTech:**
- Diseño de los campos del formulario "Nuevo registro de actividad"
- Módulo de "Cuaderno de Campo Digital" con firmas y evidencias fotográficas
- Alertas de período de carencia antes de la cosecha

---

### SKILL-05: Administrador de Empresas Agropecuarias / Agronegocios

```yaml
name: agrotech-admin-agropecuario
description: >
  Especialista en gestión empresarial de unidades productivas agrícolas
  en Colombia: costos, presupuestos, punto de equilibrio, análisis financiero
  y estructura organizacional de fincas. Usar cuando el usuario necesite
  estructurar el modelo de negocio de su finca, analizar rentabilidad por lote
  o variedad, calcular el punto de equilibrio del cultivo, planificar
  inversiones en nuevas hectáreas, o cuando quiera presentar su negocio
  a FINAGRO, bancos o inversores. También usar para diseñar los módulos
  financieros de AgroTech.
```

**Propósito:** Transformar la finca en una empresa rentable y sostenible, con indicadores de negocio claros que AgroTech visualice y proyecte.

**Conocimiento Clave:**
- Estructura de costos de producción aguacate Hass en Colombia (año 1, 2, 3+)
- Costos directos vs. indirectos en sistemas de producción familiar
- Punto de equilibrio: precio mínimo de venta para cubrir costos totales
- Análisis de rentabilidad: VPN, TIR, período de recuperación inversión
- Financiamiento agropecuario: FINAGRO, Banco Agrario, ICR
- Líneas de crédito para aguacate: montos, tasas, garantías
- Incentivos gubernamentales: AIS (Apoyos a la Industria Agropecuaria)
- Estructura de costos para exportación: BPA, certificaciones, logística
- Registro contable simplificado para productores (SIMPLE Colombia)
- Asociatividad: cooperativas, alianzas productivas, cadenas de valor

**Outputs para AgroTech:**
- Plantilla de presupuesto anual del cultivo (XLSX integrado)
- Calculadora de punto de equilibrio por lote y variedad
- Proyección financiera a 5 años con curva de producción Hass
- Scorecard financiero del negocio agropecuario
- Guía de acceso a crédito FINAGRO para aguacateros

**Integración AgroTech:**
- Módulo de "Análisis de Rentabilidad" con TIR y VPN
- Dashboard de indicadores de negocio (margen bruto, costo/kg, ROI)
- Exportación de estados financieros para presentar a bancos

---

### SKILL-06: Especialista en Comercio Exterior y Logística Agro

```yaml
name: agrotech-comercio-exterior
description: >
  Experto en exportación de aguacate Hass colombiano: requisitos sanitarios,
  logística de frío, incoterms, mercados internacionales y certificaciones
  de exportación. Usar cuando el productor quiera escalar al mercado de
  exportación (Europa, EE.UU., Canadá), necesite entender los requisitos
  fitosanitarios de cada país destino, planificar la cadena de frío
  postcosecha, o cuando AgroTech quiera agregar valor con información
  de precios internacionales y oportunidades de mercado.
```

**Propósito:** Conectar al pequeño productor colombiano con los mercados internacionales que pagan 3-4x el precio local, convirtiendo AgroTech en una plataforma de acceso al mercado global.

**Conocimiento Clave:**
- Requisitos fitosanitarios: UE (RASFF), EE.UU. (USDA-APHIS), Chile, Canadá
- Protocolo de exportación aguacate Hass Colombia: ICA, INVIMA, DIAN
- Certificaciones obligatorias para exportar: GlobalG.A.P., BPA-ICA, BASC
- Manejo postcosecha para exportación: temperatura (5-7°C), humedad relativa
- Logística refrigerada: contenedores reefer, cadena de frío Colombia-destino
- Incoterms: FOB, CIF, EXW — cuál conviene al pequeño productor
- Ventana de exportación Colombia: meses de mayor demanda en Europa
- Precios internacionales: cotizaciones Freshplaza, USDA, MinAgricultura
- Tratados de libre comercio: TLC Colombia-UE, Colombia-EE.UU., CAN
- Operadores logísticos especializados: DHL, Maersk, exportadores locales Ocaña

**Outputs para AgroTech:**
- Roadmap de certificaciones para exportación (12-24 meses)
- Calculadora de precio en planta para exportación (descontando costos logísticos)
- Dashboard de precios internacionales vs. precio local en tiempo real
- Checklist de requisitos por mercado destino
- Directorio de exportadores y compradores internacionales

**Integración AgroTech:**
- Módulo "Acceso a Mercados" con cotizaciones internacionales
- Comparador precio local vs. precio exportación con utilidad neta
- Alertas de ventana de exportación según pronóstico de cosecha

---

### SKILL-07: Auditor de Calidad y Medio Ambiente (BPA / GlobalG.A.P.)

```yaml
name: agrotech-auditor-calidad
description: >
  Especialista en auditorías de calidad agrícola y certificaciones ambientales
  para sistemas productivos de aguacate Hass. Usar cuando el productor necesite
  prepararse para una auditoría BPA del ICA, obtener la certificación
  GlobalG.A.P., implementar trazabilidad completa del cultivo, o cuando
  AgroTech quiera incorporar módulos de cumplimiento y trazabilidad que
  hagan la plataforma imprescindible para acceder a mercados premium.
```

**Propósito:** Hacer de AgroTech la herramienta de trazabilidad y cumplimiento que los productores necesitan para acceder a mercados de mayor valor.

**Conocimiento Clave:**
- BPA-ICA Colombia: 107 puntos de control, obligatorios vs. recomendados
- GlobalG.A.P.: checklist de 236 puntos para frutas y verduras
- Trazabilidad: lote → actividad → insumo → operario → fecha
- Registro de cuaderno de campo para auditoría: formato y contenido mínimo
- Manejo y almacenamiento seguro de agroquímicos: normativa colombiana
- Calibración y mantenimiento de equipos: registros requeridos
- Higiene del personal y bienestar laboral en fincas colombianas
- Análisis de agua de riego: parámetros y frecuencia requeridos
- Trazabilidad postcosecha: punto de cosecha → empaque → comercialización
- No conformidades frecuentes en auditorías colombianas de aguacate

**Outputs para AgroTech:**
- Checklist de preparación para auditoría BPA con estado actual
- Plan de acción para no conformidades identificadas
- Generador de registros de trazabilidad en formato auditable
- Dashboard de cumplimiento BPA con % de avance por módulo
- Alertas de vencimiento de registros y calibraciones

**Integración AgroTech:**
- Módulo "Trazabilidad" con cadena completa lote→comercialización
- Generación automática de registros en formato BPA-ICA
- Exportación de cuaderno de campo para presentar a auditores

---

## CATEGORÍA 2 — Estrategia y Liderazgo 🎯

---

### SKILL-08: CEO / Gerente General — Visión Estratégica AgroTech

```yaml
name: agrotech-ceo
description: >
  Asesor estratégico de alto nivel con visión de crecimiento empresarial
  para AgroTech. Usar cuando se necesite definir la estrategia de negocio,
  evaluar oportunidades de expansión (nuevas regiones, nuevos cultivos),
  diseñar el modelo de monetización y pricing, preparar la empresa para
  inversión o alianzas estratégicas, o cuando haya decisiones críticas
  que afecten la dirección completa del proyecto. También usar para
  preparar pitch decks y materiales para inversores o gobierno.
```

**Propósito:** Mantener la visión del horizonte mientras el equipo construye el producto, asegurando que cada decisión técnica esté alineada con los objetivos de negocio.

**Conocimiento Clave:**
- Análisis de mercado AgriTech en Colombia y LATAM: tamaño, jugadores, tendencias
- Modelo de negocio freemium para SaaS agropecuario: métricas clave (MRR, CAC, LTV)
- Ecosistema de financiamiento para AgriTech: iNNpulsa, Ruta N, Ventures
- Ciclo de adopción tecnológica en productores colombianos (Rogers Innovation Adoption)
- Alianzas estratégicas: cooperativas, gremios (SAC, ASOHOFRUCOL, ProColombia)
- Regulación FinTech/AgriTech en Colombia: leyes de emprendimiento
- Estrategia de expansión: aguacate Hass → otros cultivos permanentes
- Benchmarking internacional: Granular (EE.UU.), Agrospot (Brasil), Agro.club (Rusia)
- Economía de plataforma y efectos de red en marketplaces agrícolas
- Métricas de impacto social para reportes ESG e inversión de impacto

**Outputs para AgroTech:**
- Plan estratégico 2026-2028 con hitos de crecimiento
- Pitch deck para inversores (7-10 slides, estilo YC)
- Análisis de competidores AgriTech Colombia
- OKRs trimestrales alineados con la visión del producto
- Modelo de valoración de la startup en diferentes escenarios

**Integración AgroTech:**
- Dashboard de métricas de negocio (usuarios, MRR, churn, NPS)
- Roadmap estratégico del producto con decisiones de priorización
- Análisis de unit economics por segmento de cliente

---

### SKILL-09: CTO — Dirección Tecnológica y Arquitectura

```yaml
name: agrotech-cto
description: >
  Director de tecnología con visión de largo plazo para la evolución técnica
  de AgroTech. Usar cuando se necesite tomar decisiones de arquitectura
  que afecten la escalabilidad futura, evaluar nuevas tecnologías para
  incorporar (IoT, sensores, drones, visión por computador), diseñar la
  hoja de ruta técnica, gestionar la deuda técnica acumulada, o cuando
  el equipo necesite definir estándares de ingeniería y cultura de
  desarrollo. También usar para evaluar si el stack actual soportará
  el crecimiento proyectado.
```

**Propósito:** Asegurar que las decisiones técnicas de hoy no limiten el crecimiento de mañana, y que la arquitectura soporte escalar de 1 a 10.000 fincas.

**Conocimiento Clave:**
- Arquitectura multi-tenant para SaaS: Row-Level Security en PostgreSQL
- Estrategia de escalabilidad: serverless vs. contenedores para carga variable agro
- Integración IoT: protocolos MQTT, LoRaWAN para sensores de campo sin conectividad
- Computer vision para diagnóstico de plagas con imágenes del celular
- Análisis de datos agro: series de tiempo climáticas, modelos predictivos
- API design para integraciones: IDEAM, ICA, DANE, Bolsa Nacional Agropecuaria
- Offline-first architecture para zonas rurales sin internet estable
- Seguridad de datos agropecuarios: GDPR equivalente colombiano (Ley 1581)
- DevOps para aplicaciones agro: CI/CD, monitoring, alerting en producción
- Technical debt management: cuándo refactorizar vs. cuándo seguir construyendo

**Outputs para AgroTech:**
- Mapa de arquitectura técnica a 3 años
- Decisiones de arquitectura (ADRs) documentadas
- Plan de migración cuando el stack actual alcance sus límites
- Evaluación de tecnologías emergentes para agro: drones, sensores, satélites
- Roadmap de APIs públicas para ecosistema de integraciones

**Integración AgroTech:**
- Documento de visión técnica del producto
- Definición de estándares de código y convenciones
- Plan de evolución del schema de base de datos

---

### SKILL-10: Arquitecto Empresarial (TOGAF)

```yaml
name: agrotech-arquitecto-empresarial
description: >
  Especialista en arquitectura empresarial con marco TOGAF, alineando
  los procesos de negocio con la tecnología en AgroTech. Usar cuando
  se necesite modelar los procesos de negocio de la cadena de valor
  del aguacate Hass, identificar gaps entre capacidades actuales y
  requeridas, diseñar la hoja de ruta de transformación digital
  para fincas colombianas, o cuando AgroTech quiera expandirse a
  nuevos segmentos o cultivos con un framework estructurado.
```

**Propósito:** Asegurar coherencia entre la estrategia de negocio, los procesos y la tecnología, evitando construir funcionalidades que no se alinean con la cadena de valor real.

**Conocimiento Clave:**
- Framework TOGAF 9.2: ADM (Architecture Development Method)
- Capas de arquitectura: negocio, datos, aplicación, tecnología
- Modelado de procesos: BPMN 2.0 para cadena de valor aguacate
- Capacidades de negocio de una plataforma AgriTech: gestión, análisis, marketplace
- Integración de sistemas: API-first, event-driven, microservicios vs. monolito
- Gobierno de datos para información agrícola sensible
- Gestión del cambio en organizaciones rurales: resistencia a la tecnología
- Value Stream Mapping para la cadena aguacate: productor→acopiador→exportador
- Interoperabilidad con sistemas del estado: PIRS-ICA, SISPAP-MinAgricultura
- Arquitectura de referencia para plataformas AgriTech en mercados emergentes

**Outputs para AgroTech:**
- Mapa de capacidades de negocio de AgroTech
- Modelo BPMN de los procesos del ciclo productivo aguacate
- Architecture Canvas del ecosistema AgroTech
- Gap analysis: capacidades actuales vs. requeridas en 24 meses
- Hoja de ruta de transformación digital por fases

**Integración AgroTech:**
- Diagrama de arquitectura completa del sistema
- Catálogo de servicios de la plataforma
- Modelo de datos canónico para el dominio agropecuario

---

### SKILL-11: Arquitecto de Soluciones Empresariales para el Agro

```yaml
name: agrotech-arquitecto-soluciones-agro
description: >
  Especialista en diseñar soluciones tecnológicas específicas para el
  sector agropecuario colombiano, con profundo conocimiento de las
  limitaciones de conectividad, alfabetización digital y contexto rural.
  Usar cuando se necesite diseñar nuevas funcionalidades que deban
  funcionar en zonas rurales con conectividad limitada, evaluar
  integración con tecnologías de precisión (drones, sensores, satélites),
  o cuando una solución técnica urbana deba adaptarse para funcionar
  en el campo colombiano.
```

**Propósito:** Diseñar soluciones que realmente funcionen en el contexto real del campo colombiano — con lluvias, sin internet, con celulares de gama media y productores que no son nativos digitales.

**Conocimiento Clave:**
- Conectividad rural Colombia: cobertura 4G por departamento (MINTIC)
- Smartphones en el campo: gama media Android dominante (Samsung Galaxy A series)
- Offline-first: IndexedDB, Service Workers, sincronización diferida
- Agricultura de precisión: sensores de suelo, estaciones meteorológicas IoT
- Imágenes satelitales gratuitas: Sentinel-2, Landsat-8 para seguimiento de cultivos
- NDVI: índice de vegetación para monitoreo remoto de lotes
- Drones agrícolas en Colombia: DJI Agras, regulación AEROCIVIL
- Integración IDEAM: datos climáticos históricos y pronósticos para Colombia
- LoRaWAN y redes LPWAN para sensores sin conectividad celular
- Plataformas de datos abiertos: datos.gov.co, SIPSA (precios agropecuarios)

**Outputs para AgroTech:**
- Diseño de funcionalidad offline para registro de actividades en campo
- Especificación de integración con sensores IoT de bajo costo
- Evaluación de incorporar imágenes NDVI-Sentinel en el módulo Mapa
- Prototipo de alerta temprana con datos de estación meteorológica local
- Guía de usabilidad para productores con baja alfabetización digital

**Integración AgroTech:**
- Módulo de sincronización offline para registro de actividades
- Integración de imágenes satelitales en el módulo Mapa
- Dashboard de monitoreo remoto con sensores de campo

---

### SKILL-12: Gerente Agrícola — Gestión Operativa de la Finca

```yaml
name: agrotech-gerente-agricola
description: >
  Especialista en gestión operativa diaria de una empresa agrícola:
  planificación de actividades, gestión de mano de obra, compras de
  insumos y optimización de recursos. Usar cuando el productor necesite
  planificar la semana o el mes de trabajo en la finca, gestionar
  el equipo de trabajadores y jornales, optimizar el uso de insumos,
  planificar cosechas y volúmenes de producción, o cuando AgroTech
  quiera agregar módulos de gestión operativa más allá del registro.
```

**Propósito:** Convertir AgroTech en el copiloto operativo del productor, ayudándole a planificar, ejecutar y controlar las operaciones de la finca semana a semana.

**Conocimiento Clave:**
- Planificación de actividades agrícolas: Gantt de operaciones por lote
- Gestión de mano de obra: jornales, contratos por obra, nómina rural
- Legislación laboral rural colombiana: contratos, seguridad social, riesgos
- Gestión de inventarios de insumos: PEPS, puntos de reorden, proveedores
- Pronóstico de producción: curvas de producción Hass por año del árbol
- Planificación de cosecha: ventana de cosecha, índices de madurez (aceite, color)
- Cadena de abastecimiento: compras anticipadas de insumos para reducir costos
- Control de calidad operativo: rechazo en campo, clasificación por calibre
- KPIs operativos de la finca: kg/jornal, costo/ha, lotes pendientes

**Outputs para AgroTech:**
- Planificador semanal de actividades con asignación de recursos
- Control de jornales y nómina semanal por lote
- Inventario de insumos con alertas de stock mínimo
- Proyección de producción por lote y mes de cosecha
- Reporte de eficiencia operativa mensual

**Integración AgroTech:**
- Módulo "Planificación" con calendario de actividades programadas
- Control de costos de mano de obra integrado en finanzas
- Inventario de insumos con alertas de reabastecimiento

---

## CATEGORÍA 3 — Producto y Gestión de Proyectos 📋

---

### SKILL-13: Product Owner / Business Analyst

```yaml
name: agrotech-product-owner
description: >
  Responsable de maximizar el valor del producto AgroTech definiendo
  y priorizando el backlog desde la perspectiva del usuario agricultor.
  Usar cuando se necesite escribir historias de usuario para nuevas
  funcionalidades, priorizar el backlog usando frameworks (MoSCoW, RICE,
  Kano), definir criterios de aceptación, analizar feedback de usuarios
  para convertirlo en requerimientos, o cuando haya que tomar decisiones
  de qué construir a continuación con recursos limitados.
```

**Propósito:** Asegurar que cada funcionalidad construida en AgroTech resuelve un problema real del agricultor colombiano y genera valor de negocio medible.

**Conocimiento Clave:**
- User Story Mapping para el journey del productor de aguacate
- Frameworks de priorización: RICE Score, MoSCoW, Kano Model
- Jobs to Be Done (JTBD) aplicado a agricultura digital
- Definición de MVP vs. MBI (Minimum Business Increment)
- OKRs y métricas de producto: DAU, WAU, feature adoption rate
- Investigación de usuarios: entrevistas a productores, observación en campo
- Análisis de datos para decisiones de producto: funnel, retención, NPS
- Gestión de stakeholders: agricultores, cooperativas, entes gubernamentales
- Especificaciones funcionales y no funcionales para AgroTech
- A/B testing en aplicaciones con usuarios de baja frecuencia de uso

**Outputs para AgroTech:**
- Backlog priorizado con historias de usuario del próximo trimestre
- Definition of Done (DoD) para el equipo de desarrollo
- Documento de requerimientos para cada nueva funcionalidad
- Release notes en lenguaje que el agricultor entienda
- Análisis de valor vs. esfuerzo para el roadmap

**Integración AgroTech:**
- Roadmap del producto en formato Now-Next-Later
- Sprint backlog estructurado para Kiro IDE
- Métricas de adopción de funcionalidades en el dashboard de negocio

---

### SKILL-14: Scrum Master / Agile Project Manager

```yaml
name: agrotech-scrum-master
description: >
  Facilitador de procesos ágiles para el equipo de desarrollo de AgroTech.
  Usar cuando se necesite planificar un sprint, estimar el esfuerzo de
  tareas técnicas, gestionar impedimentos del equipo, preparar retrospectivas,
  calcular la velocidad del equipo con Kiro, o cuando haya conflictos de
  priorización entre funcionalidades del backlog. También usar para adaptar
  metodologías ágiles a un equipo unipersonal o pequeño con Kiro como asistente.
```

**Propósito:** Maximizar la productividad y la entrega de valor con recursos limitados, usando metodologías ágiles adaptadas a la realidad de un startup AgriTech.

**Conocimiento Clave:**
- Scrum para equipos pequeños (1-3 personas + IA asistente)
- Estimación: Planning Poker, T-Shirt Sizes, velocidad con Kiro
- Sprint Planning, Daily Standup, Sprint Review, Retrospectiva
- Kanban para gestión de flujo de trabajo en Kiro IDE
- Gestión de impedimentos: qué bloquea más un desarrollo con IA
- Definition of Ready (DoR) para tareas que va a ejecutar Kiro
- Métricas ágiles: velocity, burn-down, cycle time, lead time
- Gestión de deuda técnica dentro de los sprints
- Adaptación de Agile para: un solo desarrollador, herramientas IA, MVP rápido
- Scrum of Scrums para cuando el equipo crezca

**Outputs para AgroTech:**
- Sprint planning documentado para Kiro (próximas 2 semanas)
- Board Kanban con estado actual de todas las tareas
- Burn-down chart del sprint actual
- Retrospectiva del sprint con acciones concretas
- Velocity del equipo con métricas de Kiro

**Integración AgroTech:**
- Specs de Kiro estructuradas en formato Agile
- Seguimiento de progreso en el `.kiro/specs/` del proyecto
- Integración con GitHub Projects para gestión del backlog

---

### SKILL-15: Diseñador UX/UI — Experiencia de Usuario Agro

```yaml
name: agrotech-ux-ui
description: >
  Diseñador especializado en experiencias digitales para usuarios con
  baja o media alfabetización digital en contextos rurales colombianos.
  Usar cuando se necesite diseñar o revisar la experiencia de usuario
  de AgroTech, evaluar la usabilidad de formularios y flujos, diseñar
  el sistema visual (colores, tipografía, íconos) para el contexto
  agro, prototipar nuevas funcionalidades antes de desarrollarlas,
  o cuando se quiera hacer pruebas de usabilidad con productores.
```

**Propósito:** Hacer AgroTech tan intuitivo que un agricultor pueda usarlo en el campo sin manual de instrucciones, con guantes de trabajo y bajo el sol.

**Conocimiento Clave:**
- Diseño para usuarios con baja alfabetización digital (UX inclusivo)
- Patrones de diseño para aplicaciones de campo: touch targets mínimos 44px
- Sistema de diseño AgroTech: verde aguacate #639922, variables CSS, Tailwind
- Diseño responsive mobile-first para dispositivos Android gama media
- Pruebas de usabilidad con agricultores: guerrilla testing, think-aloud
- Iconografía agrícola: íconos universalmente comprensibles en campo
- Flujos de onboarding para usuarios no técnicos
- Accesibilidad WCAG 2.1 AA adaptada al contexto rural
- Microinteracciones para confirmar acciones críticas en campo
- UX writing en español colombiano para contexto agropecuario

**Outputs para AgroTech:**
- Wireframes de nuevas funcionalidades antes de desarrollarlas en Kiro
- Revisión de usabilidad de flujos existentes con puntos de dolor
- Sistema de diseño documentado (colores, espaciados, componentes)
- Guía de UX writing para mensajes de error y confirmación
- Protocolo de pruebas de usabilidad con 5 productores de aguacate

**Integración AgroTech:**
- Design tokens en `tailwind.config.ts` y `globals.css`
- Componentes UI documentados en `/src/components/ui/`
- Prototipo interactivo en Figma para validar antes de codificar

---

### SKILL-16: Especialista en Customer Success y Comunidad Agro

```yaml
name: agrotech-customer-success
description: >
  Especialista en adopción de producto y construcción de comunidad para
  usuarios agrícolas de AgroTech. Usar cuando se necesite diseñar el
  proceso de onboarding de nuevos productores, crear contenido de
  capacitación, gestionar la comunidad de usuarios, analizar y reducir
  el churn, o cuando se quiera implementar un programa de usuarios
  embajadores entre cooperativas y gremios. También usar para diseñar
  el sistema de soporte y FAQ de la plataforma.
```

**Propósito:** Asegurar que cada productor que prueba AgroTech se convierta en un usuario activo y evangelizador, construyendo comunidad alrededor de la plataforma.

**Conocimiento Clave:**
- Onboarding para usuarios rurales: tutoriales en video, guías PDF, WhatsApp
- Métricas de customer success: time-to-value, activation rate, DAU/MAU
- Reducción de churn en SaaS agropecuario: señales de abandono y rescate
- Comunidades de WhatsApp para agricultores: cómo gestionarlas
- Contenido de capacitación: videos cortos (Reels/TikTok) para campo
- NPS adaptado al contexto rural colombiano
- Programa de referidos entre productores: incentivos no monetarios
- Gestión de feedback: cómo recoger insights de usuarios en campo
- Health Score de usuarios: combinación de métricas de uso
- Soporte técnico para usuarios con poca experiencia digital

**Outputs para AgroTech:**
- Journey map de onboarding del nuevo usuario (7 primeros días)
- Guía rápida de inicio en formato A4 imprimible para el campo
- Videos tutoriales de 60 segundos por funcionalidad clave
- Plantilla de mensajes de WhatsApp para soporte de nivel 1
- Dashboard de health score de usuarios para identificar en riesgo de abandono

**Integración AgroTech:**
- Módulo de onboarding interactivo en la primera sesión
- Sistema de notificaciones push para re-engagement
- Integración con WhatsApp Business API para soporte

---

## CATEGORÍA 4 — Arquitectura Técnica 🏗️

---

### SKILL-17: Arquitecto de Software — AgroTech Platform

```yaml
name: agrotech-arquitecto-software
description: >
  Arquitecto responsable del diseño técnico de la plataforma AgroTech,
  asegurando escalabilidad, mantenibilidad y seguridad. Usar cuando
  se necesite diseñar nuevas funcionalidades complejas, decidir entre
  arquitecturas alternativas, refactorizar el código existente hacia
  mejores patrones, diseñar APIs para terceros, o cuando el código
  actual necesite evolucionar de un monolito Next.js hacia una
  arquitectura más escalable con el crecimiento de usuarios.
```

**Propósito:** Mantener la integridad arquitectural de AgroTech mientras crece, evitando que la acumulación de deuda técnica frene el crecimiento del producto.

**Conocimiento Clave:**
- Next.js 15 App Router: patrones avanzados de Server/Client Components
- Prisma 6 + PostgreSQL: optimización de queries, índices, relaciones N:M
- API design RESTful: naming conventions, versionado, paginación, rate limiting
- Autenticación avanzada: NextAuth v5 (Auth.js), refresh tokens, sesiones
- Patrones de diseño: Repository Pattern, Service Layer, Command Pattern en TypeScript
- Multi-tenancy en PostgreSQL: Row Level Security (RLS) para aislamiento de datos
- Caching strategy: Redis para sesiones y datos frecuentes en producción
- Edge Runtime vs. Node.js Runtime: cuándo usar cada uno en Vercel
- Event-driven architecture para notificaciones en tiempo real (WebSockets)
- Principios SOLID aplicados a Next.js App Router con TypeScript strict

**Stack AgroTech Actual:**
- Frontend: Next.js 15, React 19, TypeScript strict, Tailwind CSS 3.4
- Backend: API Routes Next.js, Edge Runtime para chat IA
- BD: PostgreSQL 16 + Prisma 6 ORM (Neon serverless en producción)
- Auth: NextAuth.js 4 con provider Credentials
- IA: Groq API (llama-3.1-8b-instant) via fetch directo
- Mapas: Leaflet + Leaflet.draw, vista satélite ESRI
- Gráficas: Recharts
- Deploy: Vercel Hobby + Neon Free tier

**Outputs para AgroTech:**
- Architecture Decision Records (ADRs) para decisiones técnicas clave
- Diagrama C4 de la arquitectura del sistema
- Plan de migración cuando se supere el free tier de Vercel/Neon
- Guía de patrones de código para mantener consistencia
- Evaluación de cuando migrar a microservicios o arquitectura serverless avanzada

**Integración AgroTech:**
- Steering files de Kiro actualizados con patrones arquitecturales
- Documentación técnica en `/docs/architecture/`
- Code review checklist para mantener calidad arquitectural

---

### SKILL-18: Especialista en Seguridad (Ciberseguridad Agro)

```yaml
name: agrotech-ciberseguridad
description: >
  Especialista en seguridad de aplicaciones web y protección de datos
  agrícolas sensibles. Usar cuando se necesite auditar la seguridad de
  AgroTech, implementar mejores prácticas de seguridad en el código,
  cumplir con la Ley 1581 de Colombia (protección de datos personales),
  diseñar la política de privacidad de la plataforma, o cuando se
  vaya a manejar datos financieros y de producción de múltiples fincas
  con implicaciones de confidencialidad comercial.
```

**Propósito:** Proteger los datos sensibles de los productores (producción, costos, compradores) que son información comercialmente valiosa y confidencial.

**Conocimiento Clave:**
- OWASP Top 10 para aplicaciones Next.js: XSS, CSRF, SQL Injection, IDOR
- Ley 1581/2012 Colombia: protección de datos personales, SIC
- Autenticación segura: bcrypt para passwords, JWT best practices, session management
- Autorización: Row Level Security en PostgreSQL, ownership verification en APIs
- HTTPS y headers de seguridad: CSP, HSTS, X-Frame-Options en Next.js
- Secrets management: variables de entorno, no commitear API keys
- Rate limiting en API routes: protección contra abuso
- Validación de inputs: Zod schemas, sanitización de datos
- Logs de auditoría: qué registrar, qué no registrar (PII)
- Backup y recuperación de datos: estrategia para Neon PostgreSQL

**Outputs para AgroTech:**
- Auditoría de seguridad del código actual con prioridades
- Política de privacidad en español accesible para productores
- Términos y condiciones del servicio
- Checklist de seguridad para cada nueva funcionalidad (security gate)
- Plan de respuesta a incidentes de seguridad

**Integración AgroTech:**
- Middleware de seguridad en Next.js (`middleware.ts`)
- Validación Zod en todas las API routes
- Headers de seguridad en `next.config.ts`
- Política de privacidad visible en la app

---

### SKILL-19: Ingeniero DevOps — Infraestructura AgroTech

```yaml
name: agrotech-devops
description: >
  Especialista en infraestructura, CI/CD y operaciones de AgroTech
  en producción. Usar cuando se necesite optimizar el pipeline de
  despliegue, monitorear la aplicación en producción, gestionar costos
  de infraestructura, planificar la migración fuera del free tier cuando
  crezca el número de usuarios, o cuando haya incidentes en producción
  que necesiten diagnóstico y resolución rápida.
```

**Propósito:** Mantener AgroTech disponible 24/7 con el menor costo posible, preparando la infraestructura para crecer de 1 a 10.000 usuarios sin re-arquitectar.

**Conocimiento Clave:**
- Vercel: configuraciones avanzadas, edge functions, cron jobs, analytics
- Neon PostgreSQL: connection pooling (pgBouncer), branching, backups
- CI/CD con GitHub Actions: tests automáticos antes de deployar
- Monitoring: Vercel Analytics, Sentry para errores, uptime monitoring
- Infraestructura como código: cuando migrar de Vercel a Railway/Fly.io
- Docker: containerización cuando sea necesario escalar fuera de Vercel
- Costos de infraestructura: optimización del free tier, proyección de costos con crecimiento
- Logs y observabilidad: qué loggear en producción, alertas de errores
- Performance: Core Web Vitals, optimización de imágenes, bundle size
- Backup strategy: pg_dump automático, retención de datos

**Stack de Infraestructura AgroTech:**
- Hosting: Vercel Hobby (free) → Plan Pro ($20/mes) cuando supere límites
- BD: Neon Free (0.5GB) → Neon Launch ($19/mes) al superar capacidad
- IA: Groq Free (30.000 tokens/día) → Pro cuando escale
- Repo: GitHub (público) con GitHub Actions
- Dominio: pendiente configurar dominio personalizado
- Monitoring: pendiente implementar

**Outputs para AgroTech:**
- Pipeline CI/CD con GitHub Actions (tests + deploy automático)
- Dashboard de monitoreo en producción (uptime, errores, performance)
- Runbook de incidentes: qué hacer cuando la app se cae
- Proyección de costos de infraestructura a 12 meses
- Plan de migración cuando se supere el free tier

**Integración AgroTech:**
- `.github/workflows/deploy.yml` para CI/CD automático
- Configuración de alertas de error en Sentry
- `railway.toml` o configuración para siguiente proveedor de hosting

---

## CATEGORÍA 5 — Desarrollo de Software 💻

---

### SKILL-20: Desarrollador Backend — APIs y Base de Datos AgroTech

```yaml
name: agrotech-backend-dev
description: >
  Desarrollador backend especializado en las API routes de Next.js,
  Prisma ORM y la lógica de negocio de AgroTech. Usar cuando se necesite
  crear nuevas API routes, optimizar queries de Prisma, agregar nuevos
  modelos al schema de base de datos, implementar lógica de negocio
  compleja (motores de alertas, cálculos financieros), o cuando haya
  errores en el servidor que necesiten diagnóstico y corrección.
```

**Propósito:** Construir las API routes y la lógica de negocio que hacen funcionar AgroTech, siguiendo los patrones establecidos en el proyecto.

**Conocimiento Clave del Proyecto:**
```typescript
// Patrón estándar de API route en AgroTech
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const data = await db.modelo.findMany({ where: { userId: session.user.id } });
  return NextResponse.json({ data });
}

// Modelos principales del schema Prisma
// User → Finca → Lote → Cultivo → RegistroCultivo
// Finca → Gasto / Ingreso
// User → Comprador
// AlertaClimatica (global)
// ChatMessage (por usuario)
```

**APIs Implementadas:**
- `/api/cultivos` (GET, POST), `/api/cultivos/[id]` (GET, PUT, DELETE)
- `/api/cultivos/[id]/registros` (GET, POST, PUT, DELETE)
- `/api/gastos`, `/api/ingresos`, `/api/compradores`
- `/api/lotes` (GET, POST, PUT, DELETE con validación de cultivos activos)
- `/api/alertas`, `/api/alertas/generate`
- `/api/weather` (OpenWeather con fallback mock)
- `/api/chat` (Groq API, Edge Runtime)
- `/api/configuracion` (perfil, finca, alertas)

**Patrones de Código:**
- Siempre verificar `session.user.id` en cada endpoint
- Verificar ownership antes de modificar registros ajenos
- Usar `NextResponse.json({ data: T })` para éxito
- Usar `NextResponse.json({ error: string }, { status: 4xx })` para errores

**Outputs para AgroTech:**
- Nuevas API routes siguiendo los patrones establecidos
- Optimización de queries Prisma con includes y selects específicos
- Nuevos modelos en `prisma/schema.prisma` con `npx prisma db push`
- Tests de integración para las APIs críticas

---

### SKILL-21: Desarrollador Frontend — React y UI AgroTech

```yaml
name: agrotech-frontend-dev
description: >
  Desarrollador frontend especializado en los componentes React de
  AgroTech con Next.js 15, Tailwind CSS y el design system establecido.
  Usar cuando se necesite crear nuevos componentes, mejorar la UI
  existente, agregar interactividad a páginas, corregir bugs visuales,
  o implementar nuevas pantallas siguiendo el sistema de diseño de
  AgroTech con sus colores y componentes UI definidos.
```

**Propósito:** Construir interfaces que sean hermosas, funcionales y usables para el agricultor colombiano, siguiendo el design system de AgroTech.

**Conocimiento Clave del Proyecto:**
```typescript
// Paleta de colores AgroTech
// agro: #639922 (primario), #3B6D11 (hover), #EAF3DE (fondo)
// harvest: #EF9F27 (warning), #BA7517 (texto warning)
// earth: #888780 (muted)

// Variables CSS clave
// var(--surface-card), var(--text-primary), var(--text-secondary)
// var(--border-subtle), var(--radius-md), var(--shadow-card)

// Componentes UI disponibles en @/components/ui/index.tsx
import { Button, Input, Select, Textarea, Modal, EmptyState } from "@/components/ui";

// Patrón Server → Client Component
// page.tsx: Server Component (fetcha datos)
// XxxClient.tsx: Client Component (interactividad con useState + fetch)

// Íconos: SOLO Lucide React
import { Leaf, MapPin, DollarSign } from "lucide-react";

// Notificaciones
import toast from "react-hot-toast";
toast.success("Operación exitosa");
toast.error("Error al procesar");
```

**Estructura de Componentes Existentes:**
- `/src/components/layout/` — Sidebar, Header
- `/src/components/ui/` — Button, Input, Select, Modal, EmptyState
- `/src/components/dashboard/` — KpiCards, WeatherWidget, MapPreview, etc.
- `/src/components/cultivos/` — CultivosList, RegistroForm, CultivoForm
- `/src/components/mapa/` — MapaContainer, LeafletMap, MapPreviewLeaflet
- `/src/components/finanzas/` — FinanzasClient
- `/src/components/asistente/` — ChatInterface

**Outputs para AgroTech:**
- Nuevos componentes React siguiendo el design system
- Correcciones de bugs visuales y de interacción
- Mejoras responsive para mobile (breakpoints Tailwind)
- Nuevas páginas siguiendo el patrón establecido

---

### SKILL-22: Desarrollador Full Stack — Implementación End-to-End

```yaml
name: agrotech-fullstack-dev
description: >
  Desarrollador full stack que implementa funcionalidades completas en
  AgroTech desde la base de datos hasta la UI, pasando por las API routes.
  Usar cuando una nueva funcionalidad requiere cambios en el schema de
  Prisma, nuevas API routes Y nuevos componentes de UI simultáneamente,
  o cuando se necesite implementar un módulo completo nuevo de principio
  a fin. Este es el perfil principal que usa Kiro para construir features.
```

**Propósito:** Implementar funcionalidades completas de forma rápida y consistente, usando Kiro como asistente de codificación.

**Flujo de Implementación AgroTech:**
1. Modificar `prisma/schema.prisma` si necesita nuevas tablas/campos
2. Ejecutar `npx prisma db push` + `npm run db:generate`
3. Crear/actualizar API routes en `src/app/api/`
4. Actualizar tipos en `src/types/index.ts` si es necesario
5. Crear Server Component (page.tsx) que fetche los datos
6. Crear Client Component (XxxClient.tsx) para interactividad
7. Integrar en el Sidebar si es módulo nuevo

**Checklist de Implementación:**
- [ ] Schema actualizado y sincronizado
- [ ] API routes con autenticación y ownership check
- [ ] Tipos TypeScript en `src/types/index.ts`
- [ ] Server Component fetcha datos con `getServerSession`
- [ ] Client Component con CRUD completo y toasts de feedback
- [ ] Responsive: funciona en mobile 375px y desktop 1440px
- [ ] Sin errores de TypeScript strict
- [ ] Sin errores de ESLint

**Outputs para AgroTech:**
- Funcionalidades completas end-to-end siguiendo todos los patrones
- Código limpio y mantenible con TypeScript strict
- Documentación inline del código complejo

---

### SKILL-23: Ingeniero de Calidad (QA) — Testing AgroTech

```yaml
name: agrotech-qa-engineer
description: >
  Especialista en testing y aseguramiento de calidad para AgroTech.
  Usar cuando se necesite diseñar el plan de pruebas de una nueva
  funcionalidad, implementar tests automatizados (unitarios, integración,
  e2e), definir los criterios de aceptación de las historias de usuario,
  o cuando se encuentren bugs en producción y se necesite un proceso
  sistemático de diagnóstico y corrección con pruebas de regresión.
```

**Propósito:** Asegurar que AgroTech funciona correctamente en todos los escenarios, incluyendo los casos de borde que ocurren en el campo real.

**Conocimiento Clave:**
- Testing pyramid: unitarios (Jest) > integración > e2e (Playwright/Cypress)
- Testing en Next.js App Router: Server Components, API routes, Client Components
- Mocking de Prisma Client para tests de API routes
- Testing de Leaflet: mocking de mapas en jsdom
- Casos de prueba específicos para AgroTech:
  - Registro de actividad sin cultivo activo (error esperado)
  - Crear lote cuando finca no tiene coordenadas GPS
  - Chat de IA cuando Groq no responde (timeout)
  - Mapa offline cuando no hay conexión
- Pruebas de accesibilidad: axe-core, keyboard navigation
- Performance testing: Core Web Vitals para conexiones lentas rurales
- Smoke tests para verificar el deployment en producción

**Outputs para AgroTech:**
- Suite de tests para las API routes críticas (Jest + supertest)
- Tests e2e para los flujos principales (Playwright)
- Reporte de bugs encontrados con pasos de reproducción
- Regresion test suite después de cada sprint
- Guía de testing para desarrolladores

**Integración AgroTech:**
- `/__tests__/` para tests unitarios e integración
- `test/e2e/` para tests end-to-end con Playwright
- GitHub Actions corriendo tests en cada PR

---

### SKILL-24: Ingeniero de Datos — Analytics AgroTech

```yaml
name: agrotech-data-engineer
description: >
  Especialista en transformación de datos agrícolas en insights accionables
  para productores y para la empresa AgroTech. Usar cuando se necesite
  diseñar el modelo analítico de la plataforma, crear reportes avanzados
  de productividad por lote, analizar patrones de uso de la plataforma,
  calcular métricas de negocio para el dashboard ejecutivo de AgroTech,
  o cuando se quiera implementar análisis predictivo de cosechas o precios.
```

**Propósito:** Convertir los datos que los productores registran en AgroTech en inteligencia que mejore sus decisiones y aporte valor a la plataforma.

**Conocimiento Clave:**
- Modelo de datos analítico para AgroTech (star schema sobre PostgreSQL)
- KPIs agronómicos: kg/ha, kg/árbol, intervalo entre cosechas, % merma
- KPIs financieros: costo/kg producido, margen bruto, ROI por lote
- Análisis de series de tiempo: clima vs. producción, correlaciones
- Agregaciones en Prisma: groupBy, _avg, _sum, _count para reportes
- Visualización de datos: Recharts configuración avanzada, colores semánticos
- Benchmarking: productor vs. promedio regional vs. mejor práctica
- Datos externos para enriquecer: SIPSA (precios), IDEAM (clima), DANE (agro)
- Machine Learning básico: regresión para predicción de producción
- Privacy by design: anonimización para benchmarks inter-finca

**Outputs para AgroTech:**
- Dashboard analítico de productividad por lote y variedad
- Reporte de rentabilidad con drill-down hasta nivel de actividad
- Benchmark de la finca vs. promedio del sector (anonimizado)
- Modelo predictivo de producción basado en clima e historial
- API de analytics para dashboard de negocio de AgroTech

**Integración AgroTech:**
- Módulo "Analítica" con gráficas avanzadas de producción y costos
- Exportación de datos en Excel/CSV para análisis externo
- Integración con SIPSA para comparar precios de mercado

---

## CATEGORÍA 6 — Operaciones y Calidad 🔧

---

### SKILL-25: Especialista en Operaciones de Plataforma

```yaml
name: agrotech-operaciones
description: >
  Responsable de las operaciones diarias de la plataforma AgroTech
  en producción. Usar cuando se necesite gestionar incidentes en
  producción, monitorear el health de la aplicación, gestionar los
  costos de infraestructura, o planificar el mantenimiento y las
  actualizaciones sin afectar a los usuarios activos.
```

**Conocimiento Clave:**
- Gestión de incidentes: clasificación P1-P4, tiempo de respuesta esperado
- Monitoreo: Vercel Analytics, logs de Edge Functions, alertas de error
- Gestión de actualizaciones: deploys sin downtime en Vercel
- Base de datos: mantenimiento de Neon, connection pooling, vacuuming
- Comunicación de incidentes: cómo notificar a usuarios de una caída
- Runbook de operaciones comunes: reset de contraseña, datos corruptos, etc.
- SLA para AgroTech: disponibilidad objetivo 99.5% (≈22h caída/año)
- Cron jobs: generación automática de alertas climáticas cada 6 horas
- Gestión de API keys: rotación periódica, revocación de compromisadas

**Outputs:**
- Status page de AgroTech para comunicar incidentes a usuarios
- Runbook de operaciones documentado
- Dashboard de costos de infraestructura mensual
- Plan de mantenimiento preventivo trimestral

---

### SKILL-26: Especialista en Normativas ICA / INVIMA / Certificaciones Colombia

```yaml
name: agrotech-normativa-colombia
description: >
  Experto en normativa agropecuaria colombiana relevante para productores
  de aguacate Hass. Usar cuando el usuario necesite entender qué
  registros son obligatorios por ley, qué certificaciones obtener para
  vender en cadenas de supermercados o exportar, cómo registrar
  el predio ante el ICA, o cuando AgroTech quiera incorporar
  alertas de cumplimiento normativo en la plataforma.
```

**Conocimiento Clave:**
- ICA: registro de predios productores (RPP), reglamentación fitosanitaria
- INVIMA: normativa para beneficio y empaque de aguacate
- Resolución ICA 30021/2017: uso adecuado de plaguicidas
- Ley 811/2003: organizaciones de cadena agropecuaria (ASOHOFRUCOL)
- Plan Nacional de Fomento Hortofrutícola (PNFH) del MinAgricultura
- Subsidios y beneficios para productores: PSA, ADR, UPRA
- Registro INVIMA para procesados de aguacate (guacamole, pulpa)
- Normativa de exportación: requisitos DIAN, ICA, Cancillería

**Outputs para AgroTech:**
- Checklist de cumplimiento normativo para fincas aguacateras colombianas
- Alertas de fechas de renovación de registros ICA
- Guía de trámites para registro de predio ante ICA
- Módulo de "Cumplimiento Legal" con estado de certificaciones

---

### SKILL-27: Especialista en Financiamiento Agropecuario (FINAGRO)

```yaml
name: agrotech-financiamiento-agro
description: >
  Experto en líneas de crédito y financiamiento para el sector
  agropecuario colombiano. Usar cuando el productor necesite acceder
  a crédito para establecer o ampliar su cultivo de aguacate, entender
  las líneas de FINAGRO disponibles para aguacate Hass, calcular
  la cuota de un crédito agropecuario, o cuando AgroTech quiera
  agregar un módulo de acceso a financiamiento como servicio de valor.
```

**Conocimiento Clave:**
- FINAGRO: líneas de crédito para cultivos permanentes (aguacate)
  - LEC Capital de trabajo: hasta $65M COP, plazo 1 año
  - LEC Inversión: hasta $600M COP, plazo hasta 12 años aguacate
- Incentivo a la Capitalización Rural (ICR): 20-40% de bonificación
- Banco Agrario: microcréditos rurales, requisitos para pequeños productores
- Fondo Agropecuario de Garantías (FAG): avales para sin colateral
- DRE (Desarrollo Rural con Equidad): tasas subsidiadas para pequeños
- Proyecto de Inversión: cómo estructurar uno para presentar al banco
- BPIN: qué es, cómo acceder, tipos de proyectos elegibles
- Documentación requerida: escrituras, matrícula IGAC, plan de inversión

**Outputs para AgroTech:**
- Calculadora de crédito FINAGRO integrada en el módulo de finanzas
- Simulador de ICR: cuánto te devuelve el gobierno de tu inversión
- Directorio de entidades financieras con líneas agropecuarias en Norte de Santander
- Plantilla de Plan de Inversión para presentar a banco

---

### SKILL-28: Especialista en Gestión de la Innovación AgriTech

```yaml
name: agrotech-innovacion
description: >
  Asesor en innovación y tendencias tecnológicas para el sector
  AgriTech. Usar cuando se necesite evaluar nuevas tecnologías
  para incorporar en AgroTech (drones, sensores, blockchain para
  trazabilidad, NFTs para certificados de origen), identificar
  oportunidades de innovación que la competencia no está aprovechando,
  o cuando se quiera participar en convocatorias de innovación
  de iNNpulsa, MinCiencias o fondos internacionales de AgriTech.
```

**Conocimiento Clave:**
- Tendencias AgriTech 2026: Precision Agriculture, AI for Crops, AgriFinTech
- Ecosistema de startups AgriTech LATAM: Agrofy, Agrospot, Granular, Taranis
- Blockchain en trazabilidad agrícola: IBM Food Trust, OriginTrail
- Computer Vision para detección de plagas en imágenes de celular
- Sensores de suelo bajo costo: Xiaomi Mi Flora, Capo sensors, DIY Arduino
- Imágenes satelitales gratuitas: Sentinel Hub, Planet Labs, NASA Harvest
- Voice interfaces para agricultores: WhatsApp bots, IVR para zonas sin datos
- Convocatorias de financiamiento: iNNpulsa Colombia, BID Lab, CGIAR
- Propiedad intelectual en software AgriTech: patentes, modelos de utilidad
- Ecosistema universitario: UNAL, Unipamplona para investigación en Norte de Santander

**Outputs para AgroTech:**
- Radar de tecnologías emergentes para incorporar en el roadmap
- Propuesta de proyecto para convocatoria iNNpulsa o BID Lab
- Evaluación de incorporar sensores IoT de bajo costo en AgroTech
- Análisis de viabilidad de módulo de trazabilidad blockchain

---

## CATEGORÍA 7 — Datos e Inteligencia Artificial 🤖

---

### SKILL-29: Especialista en IA / ML para AgroTech

```yaml
name: agrotech-ia-especialista
description: >
  Científico de datos especializado en aplicaciones de IA y Machine
  Learning para agricultura. Usar cuando se necesite mejorar AgroIA
  con capacidades más avanzadas, implementar modelos predictivos de
  plagas o producción, diseñar el sistema de RAG (Retrieval Augmented
  Generation) con conocimiento agronómico profundo, o cuando se
  quiera incorporar visión por computador para diagnóstico de plagas
  desde fotos del celular.
```

**Conocimiento Clave:**
- LLMs para AgriTech: GPT-4, Claude Sonnet, Llama 3 — comparativa para español
- RAG (Retrieval Augmented Generation): chunking, embeddings, vector stores
- Modelos de lenguaje especializados en agronomía: AgriLLM, FarmGPT
- Fine-tuning de modelos para dialectos regionales colombianos
- Computer Vision: YOLOv8 para detección de plagas en imágenes de campo
- Modelos predictivos: random forest para predicción de producción aguacate
- Series de tiempo: LSTM para predicción climática en zonas montañosas
- APIs de IA gratuitas para MVP: Groq, Together AI, Replicate
- Embeddings: Sentence Transformers para búsqueda semántica en conocimiento agro
- Agentes IA: AutoGen, CrewAI para asistentes agrícolas autónomos

**AgroIA Actual (AgroTech):**
- Modelo: Groq llama-3.1-8b-instant (gratuito, 30K tokens/día)
- Enfoque: sistema prompt con conocimiento técnico embebido
- Pendiente: RAG con base de conocimiento agronómico expandida
- Pendiente: contexto dinámico de la finca (etapa actual, clima, alertas)

**Outputs para AgroTech:**
- Sistema RAG con 200+ chunks de conocimiento agronómico técnico
- Modelo de predicción de heladas para Norte de Santander
- Clasificador de plagas desde foto con 80%+ de precisión
- AgroIA con contexto dinámico de la finca en cada respuesta
- Evaluación y benchmarking de modelos de IA para español colombiano rural

**Integración AgroTech:**
- Mejora del knowledge base en `src/lib/knowledge/base.ts`
- Integración de RAG con vector store (Pinecone o pgvector)
- Módulo "Diagnóstico Visual" con upload de foto y clasificación de plaga

---

### SKILL-30: Especialista en GIS y Geomática para Agro

```yaml
name: agrotech-gis-geomatica
description: >
  Especialista en sistemas de información geográfica aplicados a
  la gestión de cultivos. Usar cuando se necesite mejorar el módulo
  de mapas de AgroTech, incorporar imágenes satelitales para monitoreo
  de cultivos (NDVI), calcular áreas y perímetros de lotes con precisión
  geodésica, integrar datos de suelos del IGAC, o cuando se quiera
  implementar agricultura de precisión basada en zonas del lote.
```

**Conocimiento Clave:**
- Sistemas de coordenadas: WGS84, MAGNA-SIRGAS (sistema colombiano)
- Cálculo de área en polígonos georreferenciados: fórmula Haversine, Shoelace
- NDVI: cálculo e interpretación para seguimiento de cultivos desde satélite
- Sentinel-2: acceso gratuito, resolución 10m, revisita 5 días
- IGAC Colombia: mapas de suelos, clasificación agrológica de tierras
- Leaflet avanzado: heatmaps, capas WMS, plugins de análisis espacial
- GeoJSON: estructura, validación, operaciones espaciales (PostGIS)
- Topografía básica: pendiente, aspecto, cuencas hidrográficas en Norte de Santander
- Interpolación espacial: kriging para datos de suelo en lotes
- Digitalización de predios: cómo vectorizar un lote desde imagen satélite

**Outputs para AgroTech:**
- Integración de imágenes NDVI-Sentinel en el módulo Mapa
- Cálculo preciso de área de polígonos dibujados en Leaflet
- Mapa de zonas de manejo diferenciado dentro de un lote
- Integración de mapa de suelos del IGAC por municipio
- Análisis de pendiente y aspecto por lote (importado de DEM)

**Integración AgroTech:**
- Layer de NDVI en el módulo Mapa (toggle satelite/NDVI/OSM)
- Reporte de "Salud del Cultivo" basado en imágenes satelitales
- Precisión del cálculo de área al dibujar polígonos en Leaflet

---

## CATEGORÍA 8 — Comercio y Mercadeo 📊

---

### SKILL-31: Especialista en Marketing Digital AgriTech

```yaml
name: agrotech-marketing-digital
description: >
  Experto en estrategias de marketing digital para llegar a productores
  agrícolas colombianos con AgroTech. Usar cuando se necesite diseñar
  la estrategia de adquisición de usuarios (CAC objetivo), crear
  contenido para redes sociales dirigido a agricultores, diseñar
  campañas en WhatsApp y Facebook (principales canales rurales),
  o cuando se quiera crecer la base de usuarios más allá del piloto.
```

**Conocimiento Clave:**
- Canales digitales rurales Colombia: Facebook Grupos, WhatsApp, YouTube
- SEO para términos agrícolas: "app para finca", "manejo aguacate Hass Colombia"
- Contenido para agricultores: videos cortos de consejos prácticos
- Partnerships con ASOHOFRUCOL, SAC, cooperativas para distribución masiva
- Growth hacking para AgriTech: modelo viral cooperativa → miembros
- Métricas de marketing: CAC, LTV, ROAS para producto freemium
- Eventos sectoriales: Agroexpo, Congreso Aguacatero Nacional
- Influencers agrícolas en Colombia (YouTube: "El Profe Agrícola", etc.)
- Email marketing para productores: segmentación por cultivo y región
- Programa de referidos: modelo de incentivos no monetarios (capacitaciones)

**Outputs para AgroTech:**
- Plan de marketing de lanzamiento (0 → 100 usuarios activos)
- Calendario de contenido mensual para redes sociales
- Estrategia de partnerships con cooperativas y gremios
- Landing page optimizada para conversión de productores
- Medición de CAC por canal y optimización del embudo

---

### SKILL-32: Especialista en Ventas B2B — Cooperativas y Gremios

```yaml
name: agrotech-ventas-b2b
description: >
  Especialista en ventas empresariales para AgroTech dirigidas a
  cooperativas, gremios, empresas agroexportadoras e instituciones
  gubernamentales (ADR, MADR). Usar cuando se necesite diseñar la
  propuesta de valor para el Plan Cooperativa, preparar una presentación
  comercial para vender AgroTech a una organización de productores,
  negociar contratos enterprise, o cuando se quiera escalar rápidamente
  a través de alianzas con organizaciones que tengan cientos de
  productores asociados.
```

**Conocimiento Clave:**
- Propuesta de valor para cooperativas: ROI medible en digitalización
- Ciclo de ventas B2B en el sector agrícola colombiano: 3-12 meses
- Stakeholders en cooperativas: gerente, junta directiva, técnicos de campo
- Demo y piloto: cómo estructurar un piloto gratuito convincente
- Contratos SaaS para entidades colombianas: CDP, SECOP II
- Organizaciones objetivo: ASOHOFRUCOL, cooperativas Norte de Santander
- Gobierno colombiano como cliente: ADR, Ministerio de Agricultura, UPRA
- Programas de cofinanciación: MADR puede pagar suscripciones de productores
- Propuesta económica: precio por usuario vs. precio por organización
- Testimonios y casos de éxito: cómo documentar el caso piloto Eduard

**Outputs para AgroTech:**
- Pitch deck comercial para cooperativas (8 slides)
- Plantilla de propuesta económica para Plan Cooperativa
- Estrategia de entrada a las cooperativas de Norte de Santander
- Script de demo de AgroTech para presentar en 15 minutos
- Métricas de ROI cuantificables que el gerente de cooperativa puede ver

---

### SKILL-33: Especialista en Sostenibilidad y ESG para AgroTech

```yaml
name: agrotech-sostenibilidad-esg
description: >
  Especialista en sostenibilidad ambiental, social y de gobernanza (ESG)
  aplicada a AgroTech y a los productores usuarios de la plataforma.
  Usar cuando se quiera medir y reportar el impacto social de AgroTech
  (cuántos productores mejoró, cuántos ingresos adicionales generó),
  diseñar la estrategia de sostenibilidad ambiental del cultivo,
  acceder a fondos de inversión de impacto, o certificar a AgroTech
  como empresa B (B Corp) para diferenciarse en el mercado.
```

**Conocimiento Clave:**
- ODS (Objetivos de Desarrollo Sostenible) 2030 relevantes: ODS2 (Hambre Cero), ODS8, ODS15
- Métricas de impacto social: número de productores beneficiados, ingresos incrementales
- Huella de carbono de plataformas digitales: alcance 1, 2 y 3
- Agricultura regenerativa: prácticas de secuestro de carbono en aguacate
- Certificación B Corp para startups colombianas: proceso y beneficios
- Fondos de inversión de impacto: BID Lab, Acumen, Omidyar Network
- SBTI (Science Based Targets initiative) para la agricultura
- GRI (Global Reporting Initiative): reporte de sostenibilidad para startups
- Economía circular en la cadena del aguacate: aprovechamiento de subproductos
- Impacto de género: mujeres productoras, empoderamiento rural femenino

**Outputs para AgroTech:**
- Reporte de impacto social de AgroTech (anual)
- Métricas ESG del cultivo por finca (módulo de sostenibilidad)
- Calculadora de huella de carbono del cultivo de aguacate
- Propuesta para fondo de inversión de impacto LATAM
- Roadmap de certificación B Corp para AgroTech

---

## RESUMEN DE IMPLEMENTACIÓN

### Priorización por Impacto en AgroTech

| Prioridad | Skill | Impacto |
|-----------|-------|---------|
| 🔴 ALTA | Skill-02: Agrónomo | Calidad de AgroIA y alertas |
| 🔴 ALTA | Skill-07: Auditor BPA | Trazabilidad y acceso a mercados |
| 🔴 ALTA | Skill-21: Frontend Dev | Calidad de UX |
| 🔴 ALTA | Skill-22: Full Stack | Velocidad de desarrollo |
| 🔴 ALTA | Skill-29: IA Especialista | Potencia de AgroIA |
| 🟡 MEDIA | Skill-01: Agricultor Colombiano | Autenticidad del lenguaje |
| 🟡 MEDIA | Skill-05: Admin Agropecuario | Módulo financiero avanzado |
| 🟡 MEDIA | Skill-08: CEO | Estrategia de crecimiento |
| 🟡 MEDIA | Skill-15: UX/UI | Usabilidad rural |
| 🟡 MEDIA | Skill-31: Marketing Digital | Adquisición de usuarios |
| 🟢 LARGO | Skill-06: Comercio Exterior | Mercados premium |
| 🟢 LARGO | Skill-30: GIS/Geomática | Mapas avanzados |
| 🟢 LARGO | Skill-33: ESG | Inversión de impacto |

### Comandos para Crear Skills en Kiro

Para crear cada skill individualmente en Kiro, usa el comando:

```
/skill-creator [nombre-del-skill]
```

Ejemplo:
```
/skill-creator agrotech-agronomo
```

Kiro tomará la descripción y el conocimiento de este documento como base.

### Estructura de Directorio de Skills

```
.kiro/
├── steering/
│   ├── product.md
│   ├── tech.md
│   ├── structure.md
│   └── agrotech-domain.md
└── skills/
    ├── domain/
    │   ├── agrotech-agricultor-colombiano/SKILL.md
    │   ├── agrotech-agronomo/SKILL.md
    │   ├── agrotech-ingeniero-ambiental/SKILL.md
    │   ├── agrotech-asistente-tecnico/SKILL.md
    │   ├── agrotech-admin-agropecuario/SKILL.md
    │   ├── agrotech-comercio-exterior/SKILL.md
    │   └── agrotech-auditor-calidad/SKILL.md
    ├── strategy/
    │   ├── agrotech-ceo/SKILL.md
    │   ├── agrotech-cto/SKILL.md
    │   ├── agrotech-arquitecto-empresarial/SKILL.md
    │   ├── agrotech-arquitecto-soluciones-agro/SKILL.md
    │   └── agrotech-gerente-agricola/SKILL.md
    ├── product/
    │   ├── agrotech-product-owner/SKILL.md
    │   ├── agrotech-scrum-master/SKILL.md
    │   ├── agrotech-ux-ui/SKILL.md
    │   └── agrotech-customer-success/SKILL.md
    ├── architecture/
    │   ├── agrotech-arquitecto-software/SKILL.md
    │   ├── agrotech-ciberseguridad/SKILL.md
    │   └── agrotech-devops/SKILL.md
    ├── development/
    │   ├── agrotech-backend-dev/SKILL.md
    │   ├── agrotech-frontend-dev/SKILL.md
    │   ├── agrotech-fullstack-dev/SKILL.md
    │   ├── agrotech-qa-engineer/SKILL.md
    │   └── agrotech-data-engineer/SKILL.md
    ├── operations/
    │   ├── agrotech-operaciones/SKILL.md
    │   ├── agrotech-normativa-colombia/SKILL.md
    │   ├── agrotech-financiamiento-agro/SKILL.md
    │   └── agrotech-innovacion/SKILL.md
    ├── ai-data/
    │   ├── agrotech-ia-especialista/SKILL.md
    │   └── agrotech-gis-geomatica/SKILL.md
    └── commerce/
        ├── agrotech-marketing-digital/SKILL.md
        ├── agrotech-ventas-b2b/SKILL.md
        └── agrotech-sostenibilidad-esg/SKILL.md
```

---

*AgroTech — Del campo colombiano al mundo 🌍*  
*Finca El Juncal · Ocaña · Norte de Santander · Colombia 🇨🇴*  
*Versión: 1.0 · Julio 2026*
