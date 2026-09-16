# ADR-006: Arquitectura de la interfaz móvil (GermIA)  
# Estado: Propuesto Fecha: 2026-08-13 Decide: Eduard Álvarez Pacheco Se relaciona con: ADR-001 (modelo de datos multi-tenant), ADR-004 (RBAC), ADR-005 (offline-first / service worker)  
#    
# 1. Contexto  
# GermIA tiene hoy, o está diseñando, tres superficies de interacción distintas:  

| Superficie | Público | Alcance funcional | Canal |
| ----------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| GermIA PRO (actual WEB) | Productor tecnificado, técnico, cooperativa | Completo: Todas las funcionalidades que ya tenemos implementadas a hoy | Web/PWA, layout de escritorio (sidebar) |
| GermIA(nuevo, este ADR) | El mismo público de GermIA PRO, en el celular Campesino de baja alfabetización digital | El mismo alcance funcional — Inicio, Finca, Cultivos, Finanzas, IA, diagnóstico por foto/voz, recomendación de cultivo, avisos de clima | Web/PWA, layout móvil (navegación inferior) |
  
**El punto central de este ADR: GermIA no introduce ninguna entidad, regla de negocio o dato que no exista ya en GermIA PRO. Cambia la jerarquía visual (tarjetas en vez de tablas densas), el patrón de navegación (barra inferior de 5 pestañas en vez de sidebar) y la densidad de información — no cambia ****qué**** hace la aplicación, solo ****cómo se ve**** en una pantalla pequeña.**  
# La pregunta aquí es exclusivamente GermIA PRO vs. GermIA, que son la misma aplicación vista desde dos diseños y anchos de pantalla distintos.  
# Restricciones relevantes:  
# · Equipo de desarrollo pequeño (Eduard) — el costo de mantener dos bases de código con la misma lógica de negocio no es trivial para este equipo.  
# · Infraestructura free-tier (Vercel, Neon free, Groq free) — dos despliegues duplican consumo de cuota.  
# · RBAC real todavía no aplicado a nivel de endpoints (Fase 2 del roadmap técnico) — cualquier decisión que dependa de roles debe construirse *sobre* ese trabajo, no en paralelo a él.  
# · Offline-first real está deshabilitado y planificado para la Fase 6 — es relevante porque una de las razones típicas para justificar un proyecto nativo separado (mejor soporte offline) todavía no está resuelta ni siquiera en la app actual.  
#    
# 2. Pregunta a decidir  
# ¿Se construye GermIA como (A) un proyecto/repositorio nuevo que reutiliza el backend existente, o (B) una capa de presentación dentro del mismo proyecto GermIA, que se activa por ancho de pantalla y/o por una regla de negocio (rol de usuario, preferencia)?  
#    
# 3. Opciones consideradas  
# Opción A — Proyecto nuevo, backend compartido  
# Un segundo proyecto Next.js (o incluso React Native si se buscara nativo real), consumiendo la misma base de datos/API que GermIA PRO.  

| Pros | Contras |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Libertad total de diseño sin restricciones del layout de escritorio | Duplica la lógica de negocio (validaciones, cálculo de ROI, reglas de RBAC) salvo que se invierta tiempo extra en extraerla a un paquete compartido |
| Si se justificara nativo real: acceso más profundo a cámara/GPS/notificaciones push | Dos despliegues, dos pipelines de CI, dos superficies de autenticación que sincronizar |
| — | Cada cambio de regla de negocio (ej. cómo se calcula el punto de equilibrio) hay que replicarlo o refactorizar dos veces |
| — | Para un equipo de 2-3 personas, esto es el error clásico de fragmentar mantenimiento antes de tener tracción comercial validada (Fase 0-1 del plan comercial todavía no se ha ejecutado) |
  
****Opción B — Misma aplicación, layout condicionado por ancho de pantalla (responsive puro)****  
# GermIA se implementa como el layout que se renderiza automáticamente por debajo de un breakpoint (ej. < 768px), usando el mismo código de datos y las mismas rutas.  

| Pros | Contras |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cero duplicación de lógica — una sola fuente de verdad | Un usuario avanzado en su celular queda forzado al modo simple aunque prefiera la vista densa |
| Un solo despliegue, un solo dominio, una sola base de datos | Un usuario nuevo en un computador grande no se beneficia de la simplicidad de GermIA aunque la necesite |
| Encaja de forma natural con la arquitectura PWA ya elegida | No resuelve el caso de uso real: no es "escritorio vs. celular", es "productor tecnificado vs. productor que apenas empieza" — la variable correcta no es el tamaño de pantalla |
  
****Opción C — Misma aplicación, modo de vista controlado por una regla de negocio (rol o preferencia), independiente del tamaño de pantalla****  
# Se agrega un campo de preferencia de interfaz al perfil de usuario, con un valor por defecto según el rol RBAC (ADR-004), y un interruptor manual en Configuración para cambiarlo en cualquier momento.  

| Pros | Contras |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Resuelve la variable real: quién es el usuario, no qué pantalla tiene | Depende de que el RBAC (Fase 2 técnica) avance para tener roles reales sobre los cuales definir el default |
| Un técnico de cooperativa puede usar el modo completo incluso en su celular; un productor nuevo puede usar el modo simple incluso en un computador prestado | Requiere una migración de datos pequeña (un campo nuevo) |
| Se apoya directamente en el trabajo de roles que ya está en el roadmap — no es esfuerzo adicional aislado | — |
  
****Opción D — B + C combinadas (recomendada)****  
# Un valor por defecto razonable según el ancho de pantalla (Opción B, para que funcione bien desde el primer uso sin configuración), pero siempre anulable por la preferencia explícita del usuario o el default de su rol (Opción C).  
#    
# 4. Decisión  
# Se recomienda la Opción D: la misma aplicación GermIA, con GermIA como una capa de presentación alternativa activada por un valor de preferencia (vistaPreferida: 'simple' | 'completa'), con un valor inicial sugerido por el ancho de pantalla y por el rol del usuario, y siempre anulable manualmente.  
# Es decir: no un proyecto nuevo. Sí una funcionalidad invocada por regla — pero la regla correcta es una combinación de rol de usuario + preferencia explícita, con el tamaño de pantalla solo como sugerencia inicial, no como el único criterio.  
Por qué no la Opción A (proyecto nuevo)  
# El costo de mantener dos bases de código con la misma lógica de negocio, para un equipo de 2-3 personas que todavía no ha validado tracción comercial (Fase 0 del plan comercial sigue pendiente de ejecución), es un riesgo de ejecución mayor que el beneficio de diseño que obtendría.  
Por qué no la Opción B sola (responsive puro)  
# Resolvería el problema equivocado. La brecha que motivó el rediseño de GermIA no es "esto se ve mal en un celular" — es "esto es demasiado denso para cierto tipo de usuario". Un técnico de cooperativa con un celular de gama media sigue siendo un usuario que se beneficia del modo completo; un pantallazo pequeño no lo convierte en un usuario que necesita menos información.  
#    
# 5. Consecuencias  
# · Refactor requerido antes de construir GermIA: separar la lógica de datos de la presentación. Hoy, muy probablemente, los componentes de GermIA PRO mezclan ambas cosas. Se necesita un juego de hooks (useDashboardData, useCultivosData, useFinanzasData, useFincaData) que devuelvan datos ya procesados, consumibles indistintamente por el layout completo o el layout simple.  
# · Modelo de datos: agregar vistaPreferida al perfil de usuario (enum simple | completa | auto), con auto como default que decide por rol + ancho de pantalla.  
# · Deuda de diseño a resolver antes de escribir código: la paleta de colores y estilos de GermIA. Esto no es un detalle menor — si GermIA y GermIA PRO conviven en la misma aplicación como dos modos del mismo usuario, deben compartir un solo sistema de color, o la marca se percibe como dos productos distintos dentro de uno.  
# · RBAC (ADR-004): el default por rol de vistaPreferida es una razón adicional para priorizar completar la Fase 2 técnica (RBAC real), no solo para el caso de uso de cooperativas ya identificado en el plan comercial.  
#    
# 6. Hoja de ruta técnica  

| Fase | Contenido | Depende de |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 0 | Confirmar la paleta única de marca (GermIA vs. GermIA) | Decisión de producto, no de ingeniería |
| 1 | Extraer hooks de datos desacoplados de los componentes de presentación actuales | Ninguna — se puede empezar ya |
| 2 | Construir los componentes de presentación "modo simple" (las 6 pantallas ya prototipadas) consumiendo esos hooks | Fase 1 |
| 3 | Agregar vistaPreferida al modelo de usuario + interruptor en Configuración | Fase 1 |
| 4 | Calcular el default automático por rol + ancho de pantalla | Fase 2 técnica del roadmap general (RBAC real) |
| 5 | QA de paridad funcional: todo lo que se puede hacer en modo completo debe poder hacerse en modo simple (o redirigir con claridad al modo completo para esa acción puntual) | Fases 2-3 |
  
****7. Cuándo esta decisión debería revisarse****  
# Un proyecto separado (o una app nativa real) volvería a ser la opción correcta si, más adelante:  
# · GermIA necesita una función de hardware que un PWA no puede dar con calidad suficiente (notificaciones push confiables en iOS, cámara/GPS con background real).  
# · El modo simple empieza a acumular reglas de negocio que no existen en el modo completo (en ese momento ya no sería un modo de presentación — sería un producto distinto).  
# Si ninguna de las dos ocurre, mantenerlo como un solo proyecto es la decisión correcta indefinidamente.  
#    
# 8. Paleta de colores para GermIA Pro y GermIAPaleta principal  

| Color | HEX | RGB | Uso |
| ------------ | ------- | ----------- | --------------------------------------------- |
| Germ Deep | #003F32 | 0, 63, 50 | Color institucional, sidebar, títulos fuertes |
| Germ Green | #087F45 | 8, 127, 69 | Primary, botones, navegación activa |
| Growth Green | #57B91A | 87, 185, 26 | Acentos, estados positivos, crecimiento |
| IA Lime | #9BE500 | 155, 229, 0 | IA, highlights, elementos innovadores |
| Pure White | #FFFFFF | 255,255,255 | Fondo principal |
| Soft Gray | #F5F7F6 | 245,247,246 | Fondos secundarios |
| Text Dark | #102A25 | 16,42,37 | Texto principal |
| Text Gray | #61736E | 97,115,110 | Texto secundario |
| Border | #DDE7E3 | 221,231,227 | Bordes y separadores |
  
**** ****  
# 9. Tipografía principal: Manrope  
# Para GermIA Pro y GermIA me gusta muchísimo más Manrope que una tipografía excesivamente corporativa.  
# Tiene una estética:  
# · moderna  
# · tecnológica  
# · elegante  
# · amigable  
# · geométrica  
# · excelente para SaaS  
# Y combina muy bien con el logo.  
