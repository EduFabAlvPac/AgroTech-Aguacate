// ─── AgroTech · Base de conocimiento técnico ─────────────────────────────────
// Aguacate Hass · Condiciones Andinas Colombianas · 1.500–2.200 msnm
// Fuentes: ICA, Corpohass, SENA Agro, CENICAFÉ adaptado aguacate

export type Category =
  | "plagas"
  | "riego"
  | "nutricion"
  | "clima"
  | "etapas"
  | "agronomia"
  | "cosecha"
  | "financiero";

export type KnowledgeChunk = {
  id: string;
  category: Category;
  subcategory: string;
  keywords: string[];
  title: string;
  content: string;
};

export const knowledgeBase: KnowledgeChunk[] = [

  // ── PLAGAS Y ENFERMEDADES ──────────────────────────────────────────────────

  {
    id: "p01",
    category: "plagas",
    subcategory: "antracnosis",
    keywords: ["antracnosis", "mancha negra", "fruto", "hongo", "colletotrichum", "lluvia", "postcosecha"],
    title: "Antracnosis del aguacate (Colletotrichum gloeosporioides)",
    content: `La antracnosis es la enfermedad más común del aguacate Hass en Colombia. Causada por el hongo Colletotrichum gloeosporioides.

SÍNTOMAS: Manchas negras hundidas en frutos maduros. En hojas: manchas café con halo amarillo. El daño es mayor en poscosecha; las lesiones latentes activan al madurar el fruto.

CONDICIONES FAVORABLES: Temperatura 25–30°C con humedad relativa >80%. Las lluvias frecuentes en floración y desarrollo del fruto son el principal factor de riesgo. Norte de Santander: época de mayor riesgo abril–junio y septiembre–noviembre.

CONTROL PREVENTIVO (aplicar desde floración):
- Mancozeb 80% WP: 2,5 g/litro, cada 15 días en época lluviosa
- Clorotalonil 720 SC: 2 mL/litro como alternativa
- Aplicar en horas de la mañana, sin lluvia durante 4 horas

CONTROL CURATIVO:
- Propiconazol 25 EC: 0,5 mL/litro (sistémico, penetra tejido)
- Azoxistrobina + Difenoconazol (Amistar Top): 0,75 mL/litro
- Trifloxistrobina (Flint): 0,15 g/litro — excelente para plántulas en establecimiento

PARA PLÁNTULAS RECIÉN SEMBRADAS: aplicar Trichoderma harzianum (biocontrolador) en drench al suelo, 50 g por planta disuelta en 2 litros de agua, cada 30 días.

COSTO REFERENCIAL: Mancozeb x 1 kg ≈ $18.000–25.000 COP. Tratamiento preventivo 320 plantas ≈ 8 kg ≈ $160.000 por aplicación.`,
  },

  {
    id: "p02",
    category: "plagas",
    subcategory: "phytophthora",
    keywords: ["phytophthora", "pudricion raiz", "root rot", "marchitez", "marchitamiento", "raiz negra", "amarillamiento", "muerte"],
    title: "Pudrición de raíz (Phytophthora cinnamomi) — La más destructiva",
    content: `Phytophthora cinnamomi es el patógeno más peligroso del aguacate en Colombia. Puede eliminar una plantación completa en pocas semanas.

SÍNTOMAS: 
- Estadio inicial: hojas pequeñas, pálidas, con nervaduras amarillas
- Estadio avanzado: marchitez general, muerte de ramas desde la punta hacia abajo
- Raíces: cortas, negras, frágiles, sin raíces finas activas
- Frutos: caída prematura

FACTORES DE RIESGO:
- Suelos con mal drenaje o zonas de acumulación de agua
- pH ácido (<5,5) — favorece el patógeno
- Temperaturas del suelo 15–25°C con humedad alta
- Heridas en raíces por maquinaria o laboreo

PREVENCIÓN (CRÍTICA en plántulas):
- Seleccionar terrenos con buen drenaje natural (pendientes >5%)
- pH suelo ideal 6,0–6,5 (encalar si es necesario)
- No encharcamiento: hacer zanjas de drenaje alrededor de cada lote
- Uso de porta-injertos tolerantes (Martin Grande, Duke 7) si consigues material certificado

CONTROL:
- Fosetil-aluminio (Aliette 80 WP): 2 g/litro, aplicar cada 30 días preventivo, cada 15 días si hay síntomas
- Metalaxil-M (Ridomil Gold): 2,5 g/litro, drench al suelo (500 mL/planta) — SOLO en infección activa
- Propamocarb (Previcur N): 2 mL/litro, drench en plántulas

PARA NORTE DE SANTANDER: en altitudes 1800–2000 msnm con lluvias > 1200 mm anuales, es OBLIGATORIO aplicar Fosetil-aluminio preventivo cada mes durante establecimiento.`,
  },

  {
    id: "p03",
    category: "plagas",
    subcategory: "trips",
    keywords: ["trips", "frankliniella", "brotes", "flores", "deformacion", "plateado", "raspado"],
    title: "Trips del aguacate (Frankliniella spp.)",
    content: `Los trips son insectos diminutos (1–2 mm) que causan daño principalmente en brotes tiernos, flores y frutos jóvenes del aguacate.

SÍNTOMAS:
- Hojas tiernas: deformadas, encrespadas, con áreas plateadas o bronceadas
- Flores: aborto floral, reducción en amarre
- Frutos jóvenes: cicatrices corchosas o plateadas (daño cosmético permanente)
- Brotes terminales: necrosis y deformación

PERÍODO CRÍTICO: floración y brotación (noviembre–febrero y junio–agosto para primera brotación post-siembra).

MONITOREO: Colocar trampas adhesivas azules a altura de la copa. Umbral de acción: >10 trips por trampa por semana.

CONTROL:
- Spinosad (Tracer 120 SC): 0,4 mL/litro — excelente selectividad, no daña abejas cuando seco
- Imidacloprid (Confidor 350 SC): 0,5 mL/litro — sistémico, buena residualidad
- Abamectina (Vertimec 1,8%): 0,8 mL/litro — acaricida + insecticida

PARA PLÁNTULAS EN ESTABLECIMIENTO: con bajo follaje, usar Imidacloprid en drench (0,5 mL/litro, 200 mL por planta) — protección sistémica por 45–60 días.

BIOLOGICAL CONTROL: Amblyseius cucumeris (ácaro depredador) funciona bien en vivero pero difícil en campo abierto.

COSTO: Spinosad 250 mL ≈ $45.000 COP. 1 fumigada de 320 plantas: aprox. 3 litros de mezcla = $540 COP.`,
  },

  {
    id: "p04",
    category: "plagas",
    subcategory: "acaros",
    keywords: ["acaros", "oligonychus", "aranas", "hoja", "bronceado", "telaraña", "spider mite"],
    title: "Ácaros del aguacate (Oligonychus perseae y O. yothersi)",
    content: `Los ácaros fitófagos son plagas secundarias que se vuelven problema principal en épocas secas o cuando se eliminan sus enemigos naturales con insecticidas de amplio espectro.

SÍNTOMAS:
- Oligonychus perseae: manchas bronceadas en el haz de las hojas, agrupados en la nervadura central
- O. yothersi (ácaro del aguacate): telarañas finas en envés, bronceado y caída de hoja

CONDICIONES FAVORABLES: Temperatura >28°C, humedad relativa <60%. Norte de Santander: meses más secos (enero–marzo y julio–agosto).

MONITOREO: Revisar 20 hojas del tercio medio por lote. Umbral: >10 ácaros por hoja.

CONTROL:
- Abamectina (Vertimec 1,8%): 0,8 mL/litro — el más usado en Colombia
- Spiromesifeno (Oberon 240 SC): 0,5 mL/litro — excelente para huevos y ninfas
- Bifenazato (Floramite SC): 0,6 mL/litro — muy efectivo, poca resistencia
- Aceite de neem 3%: preventivo, 5 mL/litro cada 15 días

CLAVE: Rotar grupos químicos cada 2 aplicaciones para evitar resistencia. Nunca repetir la misma molécula más de 2 veces seguidas.`,
  },

  {
    id: "p05",
    category: "plagas",
    subcategory: "barrenador",
    keywords: ["barrenador", "stenoma", "semilla", "fruto", "larva", "gusano", "orificios"],
    title: "Barrenador de la semilla (Stenoma catenifer)",
    content: `El barrenador de la semilla es una polilla cuya larva penetra el fruto y destroza la semilla, causando pérdidas importantes en la cosecha.

SÍNTOMAS: Frutos caídos prematuramente. Al abrirlos: galerías en la semilla con aserrín y excremento. Orificio de entrada diminuto en la cáscara.

CICLO: La polilla coloca huevos en el pedúnculo o cáscara. La larva penetra y llega a la semilla en 2–4 semanas. Un fruto afectado = pérdida total.

CONTROL:
- Clorpirifos 48% EC (Lorsban): 1,5 mL/litro — aspersión al fruto y ramas, cada 30 días desde amarre
- Spinosad (Tracer): 0,4 mL/litro — más amigable, excelente control
- Trampas con feromonas: 1 trampa/ha para monitoreo
- Recolectar y destruir (enterrar a 50 cm) todos los frutos caídos

PARA PLÁNTULAS: no es problema en plantas jóvenes sin producción. Iniciar control en la época de floración (mes 18 post-siembra aproximadamente).`,
  },

  {
    id: "p06",
    category: "plagas",
    subcategory: "cercospora-rona",
    keywords: ["cercospora", "roña", "manchas", "hoja", "fruto", "corteza", "sphaceloma", "scab"],
    title: "Cercospora y Roña del aguacate (Cercospora purpurea / Sphaceloma perseae)",
    content: `CERCOSPORA (Cercospora purpurea):
Síntomas: manchas angulares de color café-grisáceo en hojas adultas. Pueden causar defoliación severa. Más común en épocas húmedas y cálidas.
Control: Mancozeb 2,5 g/L + Clorotalonil 2 mL/L alternados. Azoxistrobina en casos severos.

ROÑA (Sphaceloma perseae):
Síntomas: lesiones corchosas superficiales en frutos jóvenes (no penetra la pulpa). Apariencia "sarnosa" en cáscara. Daño cosmético que afecta el precio de mercado local.
Condiciones: lluvias frecuentes + frutos jóvenes (primeros 60 días post-amarre).
Control: Mancozeb preventivo en frutos jóvenes. Clorothalonil 720 SC: 2 mL/litro si hay alta presión.

PARA NORTE DE SANTANDER: con lluvias bimodales, los picos de mayor riesgo coinciden con los periodos lluviosos. Mantener programa preventivo con mancozeb.

IMPORTANTE: ambas enfermedades se controlan con el mismo programa de fungicidas que la antracnosis. Un buen programa preventivo cubre las tres.`,
  },

  // ── RIEGO ──────────────────────────────────────────────────────────────────

  {
    id: "r01",
    category: "riego",
    subcategory: "establecimiento",
    keywords: ["riego", "agua", "litros", "frecuencia", "semana", "establecimiento", "siembra", "plántula", "primeras", "semanas"],
    title: "Riego en establecimiento (primeros 90 días post-siembra)",
    content: `El riego en las primeras semanas es CRÍTICO para la supervivencia de las plántulas. El aguacate tiene raíces superficiales y muy sensibles al estrés hídrico.

REQUERIMIENTOS POR PERÍODO:

SEMANAS 1–4 (arraigo):
- Regar cada 2–3 días en época seca
- Cantidad: 3–4 litros por planta por riego
- Para 320 plantas: 960–1.280 litros por riego
- Objetivo: mantener suelo húmedo (no encharcado) en los primeros 30 cm

SEMANAS 5–8 (crecimiento de raíz):
- Regar cada 3–4 días
- Cantidad: 4–6 litros por planta
- Para 320 plantas: 1.280–1.920 litros por riego
- Señal correcta: suelo húmedo a 20 cm de profundidad al insertar el dedo

SEMANAS 9–12 (establecimiento):
- Regar cada 4–5 días según lluvia
- Cantidad: 6–8 litros por planta
- Suspender si llueve > 20 mm en el día

SEÑALES DE ESTRÉS HÍDRICO (regar inmediatamente):
- Hojas colgantes al mediodía (recuperación en la tarde = moderado; no recupera = severo)
- Color verde apagado, mate
- Hojas del tercio inferior que amarillan y caen

SEÑALES DE EXCESO DE AGUA (detener riego):
- Hojas amarillas generalizadas con nervaduras verdes
- Pudrición del cuello de la planta
- Olor a podrido en el suelo

NORTE DE SANTANDER: si hay lluvias, suspender riego ese día y el siguiente. Revisar humedad del suelo antes de regar.`,
  },

  {
    id: "r02",
    category: "riego",
    subcategory: "sistemas",
    keywords: ["riego", "goteo", "aspersión", "microaspersion", "sistema", "instalacion", "manguera", "cinta"],
    title: "Sistemas de riego para aguacate Hass",
    content: `RIEGO POR GOTEO (recomendado para aguacate):
- Emisores: goteros de 2–4 L/hora, 2 por planta
- Ubicación: a 30 cm del tronco, bajo el follaje
- Ventajas: ahorra agua 40–60%, controla Phytophthora (no moja el cuello), fertilización integrada (fertirriego)
- Costo instalación 1 ha ≈ $1.500.000–2.500.000 COP (kit básico)

RIEGO POR MICROASPERSIÓN:
- Microaspersores de 40–80 L/hora, radio 2–3 m
- 1 microaspersor por cada 2 plantas
- Más económico que goteo pero gasta más agua
- Riesgo: moja cuello de planta (Phytophthora) — instalar con cuidado

RIEGO MANUAL CON MANGUERA (viable en etapa inicial con pocas plantas):
- Usar balde de 10 litros por planta para control preciso
- Tiempo: aprox. 2 jornales para 320 plantas (400 m²)
- Para 2 ha con 320 plantas: 1 jornal adicional de labores de riego = $50.000–60.000/día

CAPTACIÓN DE AGUA DE LLUVIA:
- Con canales en los linderos de los lotes se puede captar agua de lluvia
- Tanque de 5.000 litros en fibra de vidrio ≈ $800.000 COP — suficiente para 1 semana de riego
- Bomba de presión: $250.000–400.000 COP

PARA FINCA ÁLVAREZ PACHECO:
Con fuente hídrica natural en la finca, conectar bomba de presión y sistema de manguera es la solución más económica para el arranque: estimado $600.000–900.000 COP para los 2 lotes.`,
  },

  {
    id: "r03",
    category: "riego",
    subcategory: "helada-riego",
    keywords: ["helada", "frio", "temperatura", "riego nocturno", "proteccion", "hielo", "8 grados"],
    title: "Riego nocturno contra heladas en plántulas",
    content: `Cuando se pronostican temperaturas < 12°C (especialmente < 8°C), el riego nocturno es la técnica más efectiva y económica para proteger plántulas de aguacate.

CÓMO FUNCIONA: Al congelarse el agua alrededor de la planta, se libera calor latente de fusión (80 cal/g). Este calor protege el tejido vegetal de temperaturas bajo cero.

CUÁNDO APLICAR:
- Inicio: cuando la temperatura baja de 12°C (generalmente entre 22:00 y 06:00)
- Continuar: hasta que el sol caliente y la temperatura suba sobre 10°C
- Para Norte de Santander 1800 msnm: riesgo en enero–febrero y julio

TÉCNICA:
1. Regar generosamente toda la planta (follaje incluido) desde las 21:00
2. Aplicar 5–8 litros por planta formando un "paraguas" de agua
3. Si hay microaspersión: activarla y dejarla corriendo toda la noche
4. Sin riego: cubrir cada planta con bolsas de polipropileno (tela agrocover) o sacos de fique

PROTECCIÓN ADICIONAL:
- Colocar coberturas de rastrojo o paja en el suelo: 10 cm de espesor alrededor del tronco
- Las coberturas evitan que el suelo pierda el calor acumulado durante el día

SEÑALES DE DAÑO POR HELADA:
- Brotes tiernos con apariencia acuosa al día siguiente
- Brotes que ennegrecen y se secan en 24–48 horas
- Hojas "cocinadas" (verde acuoso → marrón en días)

SI YA HAY DAÑO: no podar inmediatamente. Esperar 2–3 semanas para ver qué recupera. Podar solo tejido completamente muerto. Aplicar fungicida cúprico en los cortes.`,
  },

  // ── NUTRICIÓN ─────────────────────────────────────────────────────────────

  {
    id: "n01",
    category: "nutricion",
    subcategory: "establecimiento",
    keywords: ["fertilizante", "abono", "nutricion", "establecimiento", "siembra", "primera", "aplicacion", "8-20-20", "fosforado"],
    title: "Fertilización en establecimiento (meses 0–6)",
    content: `El objetivo en establecimiento es promover el desarrollo RADICAL (raíces), no el follaje. Se usan fertilizantes con alta proporción de fósforo (P).

FÓRMULA RECOMENDADA: 8-20-20 (NPK) o similar (10-30-10)
- El fósforo (20) estimula crecimiento de raíces
- El potasio (20) mejora resistencia al estrés y enfermedades

PROGRAMA PARA 160 PLANTAS/HECTÁREA:

MES 1 (siembra): NO fertilizar. Dejar que la planta se adapte.

MES 2 (primera fertilización):
- Dosis: 50 g de 8-20-20 por planta (16 kg/ha)
- Forma: aplicar en corona circular a 20 cm del tronco, no en contacto con tallo
- Incorporar al suelo con azadón y regar después
- Costo: 8-20-20 x 50 kg ≈ $75.000 COP → por hectárea = $24.000 COP

MES 4:
- Dosis: 100 g por planta (16 kg/ha)
- Agregar 10 g de Sulfato de Zinc por planta (deficiencia muy común en aguacate)

MES 6:
- Dosis: 150 g por planta (24 kg/ha)
- Evaluar con análisis foliar si es posible
- Comenzar transición a fertilizante más balanceado (15-15-15)

MICRONUTRIENTES (aplicar desde mes 2):
- Boro: foliar con Solubor 0,5 g/litro cada 45 días — crítico para floración futura
- Zinc: Sulfato de Zinc 10 g/planta suelo, o foliar con Nutri-Zinc 2 g/litro
- Manganeso: Sulfato de Manganeso 5 g/planta suelo si el suelo es >6,5 pH

COSTO TOTAL FERTILIZACIÓN AÑO 1 (2 ha / 320 plantas): aprox. $350.000–500.000 COP`,
  },

  {
    id: "n02",
    category: "nutricion",
    subcategory: "foliar",
    keywords: ["foliar", "foliar fertilizacion", "spray", "aspersion", "calcio", "boro", "zinc", "manganes", "micronutriente"],
    title: "Fertilización foliar en aguacate Hass",
    content: `La fertilización foliar complementa la nutrición del suelo y corrige deficiencias rápidamente. El aguacate responde muy bien a aplicaciones foliares.

CUÁNDO APLICAR:
- Brotaciones nuevas (mayor absorción en hoja tierna)
- Después de lluvias fuertes que lavan el suelo
- Cuando hay síntomas visuales de deficiencia

MEZCLA FOLIAR BÁSICA para plántulas en establecimiento:
- Calcio (Nitrato de Calcio): 2 g/litro
- Boro (Solubor o Bórax): 0,5 g/litro
- Zinc (Sulfato de Zinc): 2 g/litro
- Manganeso (Sulfato de Manganeso): 1 g/litro
- Adherente (Cosmofit Plus): 0,5 mL/litro

FRECUENCIA: cada 30–45 días durante establecimiento.

SÍNTOMAS DE DEFICIENCIAS COMUNES:
- Zinc: hojas pequeñas, internudos cortos, mosaico, reducción del tamaño foliar ("hoja pequeña")
- Boro: deformación de hojas nuevas, engrosamiento de nervaduras, corcho en frutos
- Calcio: punta y borde de hojas quemadas, frutos con grietas internas
- Manganeso: amarillamiento internervial en hojas jóvenes (pH suelo > 7)
- Hierro: clorosis intervenas severa en hojas muy nuevas (pH suelo > 7)

MEZCLA COMERCIAL SIMPLIFICADA:
- Nutrifol (fertilizante foliar completo) 3 g/litro — solución práctica y económica
- Bayfolan (Bayer) 3 mL/litro — ampliamente disponible en Colombia
- Costo: 500 mL Bayfolan ≈ $18.000 COP → 1.000 litros de mezcla = $36.000 COP`,
  },

  // ── CLIMA ──────────────────────────────────────────────────────────────────

  {
    id: "c01",
    category: "clima",
    subcategory: "temperatura",
    keywords: ["temperatura", "frio", "calor", "rango", "optima", "clima", "altitud", "msnm"],
    title: "Temperatura óptima para aguacate Hass",
    content: `El aguacate Hass tiene requerimientos térmicos específicos para su desarrollo óptimo.

RANGOS PARA NORTE DE SANTANDER (1.800–2.000 msnm):
- Temperatura óptima: 18–24°C
- Temperatura mínima tolerable (plantas establecidas): 10°C
- Temperatura mínima tolerable (plántulas): 12°C — por debajo hay daño foliar
- Temperatura máxima tolerable: 32°C
- Temperatura que detiene crecimiento: <10°C o >35°C

EFECTOS DE LAS TEMPERATURAS:
< 8°C: daño severo en plántulas. Posible muerte de ápices y brotes tiernos.
8–12°C: crecimiento se detiene. Plántulas vulnerables, especialmente con viento.
12–18°C: crecimiento lento. Ideal para coloración del fruto maduro.
18–24°C: ÓPTIMO. Crecimiento vegetativo activo, buena absorción de nutrientes.
24–30°C: crecimiento moderado. Aumenta transpiración y requerimiento hídrico.
>30°C: estrés calórico. Aumenta vulnerabilidad a ácaros y thrips.

ALTITUD ÓPTIMA EN COLOMBIA:
- Hass: 1.500–2.100 msnm (su hábitat natural en California es 800–1.500 m)
- A mayor altitud: más tiempo de llenado del fruto (mayor calidad de aceite)
- A menor altitud: mayor riesgo de antracnosis y Phytophthora

NORTE DE SANTANDER A 1.800–1.850 msnm: condiciones casi perfectas para Hass.
La temperatura nocturna (15–18°C) favorece la inducción floral.`,
  },

  {
    id: "c02",
    category: "clima",
    subcategory: "lluvia",
    keywords: ["lluvia", "precipitacion", "mm", "exceso", "encharcamiento", "drenaje", "sequia", "seco"],
    title: "Manejo de lluvia y sequía en aguacate Hass",
    content: `El agua es el factor limitante más importante en aguacate Hass. El exceso y el déficit son igualmente dañinos.

REQUERIMIENTO HÍDRICO ANUAL: 900–1.200 mm bien distribuidos

LLUVIA EXCESIVA (> 30 mm en 24 horas):
- Riesgos: encharcamiento, activación de Phytophthora, lavado de nutrientes
- Acciones inmediatas:
  1. Revisar drenajes — asegurarse que el agua escurre
  2. Suspender riego por 3–5 días
  3. Aplicar Fosetil-aluminio preventivo 2 semanas después
  4. Inspeccionar cuello de plantas para detectar daño temprano

SEQUÍA (> 15 días sin lluvia con temperatura > 25°C):
- Riesgos: caída de hojas, muerte de raíces finas, vuelo de plaga
- El aguacate NO tiene raíces profundas — agota el agua del suelo rápidamente
- Señal: hojas colgantes a las 10 AM (regar ese mismo día)

NORTE DE SANTANDER: régimen bimodal (dos épocas de lluvia: marzo–mayo y septiembre–noviembre; dos épocas secas: diciembre–febrero y junio–agosto). Las épocas secas son críticas para el riego.

PARA ÉPOCAS SECAS PROLONGADAS:
- Aumentar frecuencia de riego a cada 2 días
- Aplicar coberturas de 10 cm de rastrojo o pasto seco alrededor de las plantas
- Monitorear humedad del suelo diariamente (palo de madera a 20 cm)`,
  },

  {
    id: "c03",
    category: "clima",
    subcategory: "viento",
    keywords: ["viento", "vientos", "rafagas", "daño", "ramaje", "rotura", "barrera", "cortavientos"],
    title: "Daño por viento en aguacate y cortavientos",
    content: `El aguacate Hass es muy sensible al daño mecánico por viento. El viento seco también aumenta la evapotranspiración y el estrés hídrico.

DAÑOS DEL VIENTO:
- Vientos > 40 km/h: caída de flores y frutos jóvenes, ramas partidas
- Vientos secos con baja humedad (<40% HR): deshidratación de flores, aborto floral
- En plántulas: vuelco, daño en cuello, deshidratación

CORTAVIENTOS (muy importantes en Norte de Santander):
- Especies recomendadas para la región: Guamos (Inga spp.), Eucaliptos, Cipreses, Saucos
- Distancia entre cortaviento y primer árbol: 3–4 metros
- Altura del cortaviento: 2× la altura deseada de protección

PROTECCIÓN TEMPORAL DE PLÁNTULAS:
- Para los primeros 6 meses: colocar estacas y atar con cinta plástica NO ajustada
- Cubrir con cañas o guadua en el lado del viento predominante
- Usar botellas plásticas cortadas sobre cada planta como paravientos individual (económico)

EVALUACIÓN DE DAÑO:
- Después de vientos fuertes: revisar 10% de plantas
- Ramas > 2 cm de diámetro con fracturas: cortar limpio y aplicar pasta cicatrizante
- Plantas volcadas en primeras semanas: reubicar y reforzar`,
  },

  // ── ETAPAS ────────────────────────────────────────────────────────────────

  {
    id: "e01",
    category: "etapas",
    subcategory: "siembra",
    keywords: ["siembra", "plantacion", "hoyo", "distancia", "profundidad", "transplante", "bolsa", "vivero"],
    title: "Siembra correcta de plántulas de aguacate Hass",
    content: `La siembra correcta determina el 60% del éxito del cultivo. Errores en esta etapa son costosos de corregir.

PREPARACIÓN DEL HOYO:
- Dimensiones: 50×50×50 cm (mínimo)
- Tiempo de anticipación: 30 días antes de la siembra
- Dejar que el suelo se airee y exponga a la luz solar

MEZCLA DE LLENADO DEL HOYO:
- 50% tierra del sitio
- 30% material orgánico (compost, lombricomposta o gallinaza bien compostada)
- 10% arena de río (mejora drenaje)
- 10% cal dolomita (si el pH < 5,5)
- Mezclar bien y llenar el hoyo dejando un montículo de 10 cm

DISTANCIA DE SIEMBRA:
- Estándar: 8×8 m (156 plantas/ha) — para Lote A y B de Finca Álvarez Pacheco
- Intensivo: 6×6 m (278 plantas/ha) — requiere podas más frecuentes
- Semi-intensivo: 7×7 m (204 plantas/ha) — buen compromiso

TÉCNICA DE SIEMBRA:
1. Hacer hoyo central del tamaño de la bolsa de vivero
2. Cortar la bolsa con bisturí por la base y un lado — retirar con cuidado
3. Revisar que el cepellón esté íntegro — no romper
4. Colocar planta de modo que el cuello (unión raíz-tallo) quede al nivel del suelo
5. NO enterrar más de 2 cm sobre el injerto
6. Compactar suelo alrededor sin presionar el cepellón
7. Hacer plateo (área plana) de 60 cm de radio alrededor de la planta
8. Aplicar mulching (rastrojo, paja) de 5–8 cm en el plateo

INJERTO: asegurarse que el punto de injerto quede 10–15 cm sobre el nivel del suelo para evitar que la variedad haga raíces propias y se pierda la ventaja del portainjerto.

PRIMER RIEGO: inmediatamente después de sembrar, 5 litros por planta.`,
  },

  {
    id: "e02",
    category: "etapas",
    subcategory: "podas",
    keywords: ["poda", "formacion", "copa", "ramas", "brotes", "altura", "estructura"],
    title: "Poda de formación en aguacate Hass",
    content: `La poda de formación en los primeros 2 años determina la arquitectura del árbol y su productividad a largo plazo.

OBJETIVO: Crear una copa equilibrada con 3–4 ramas principales, bien distribuidas, que permita la entrada de luz y ventilación.

PRIMERA PODA (mes 4–6 post-siembra):
- Altura de corte del tallo principal: 50–60 cm del suelo
- Eliminar brotes laterales en los primeros 30 cm del tallo
- Seleccionar 3 ramas laterales vigorosas y bien distribuidas (120° entre ellas)
- Eliminar todas las demás con tijera podadora desinfectada

SEGUNDA PODA (mes 10–12):
- Despuntar ramas principales al llegar a 80–100 cm de longitud
- Fomentar ramificaciones secundarias
- Eliminar ramas que crucen hacia el centro de la copa

HERRAMIENTAS:
- Tijeras podadoras: limpias y desinfectadas con alcohol al 70% entre plantas
- Serrucho para ramas > 3 cm diámetro
- Pasta cicatrizante (Mastic o Alginure): aplicar en todos los cortes > 1 cm

CUIDADOS POST-PODA:
- Aplicar fungicida sistémico al árbol dentro de las 24 horas siguientes
- Evitar podas en época lluviosa (mayor riesgo de infección)
- No podar en días de alta humedad o lluvia

PARA PLÁNTULAS EN PRIMER MES: NO podar. Dejar crecer libremente para establecer el sistema radical. Solo eliminar ramas dañadas.`,
  },

  // ── AGRONOMÍA ─────────────────────────────────────────────────────────────

  {
    id: "a01",
    category: "agronomia",
    subcategory: "malezas",
    keywords: ["malezas", "arvenses", "hierba", "pasto", "control", "machete", "herbicida", "guadaña"],
    title: "Control de malezas en aguacate",
    content: `El control de malezas es CRÍTICO en los primeros 12 meses. Las malezas compiten por agua, nutrientes y pueden albergar plagas.

ÁREA CRÍTICA: plateo de la planta (radio de 60–80 cm del tronco). Aquí la competencia es más intensa y NO se puede aplicar herbicida.

CONTROL MANUAL (recomendado en plateo):
- Limpiar el plateo cada 30–45 días con machete o guadañadora
- NO disturbar el suelo cerca del tronco (raíces superficiales)
- Dejar los residuos de malezas como cobertura (conserva humedad)

ENTRE LAS FILAS: control con guadaña o herbicida sistémico
- Glifosato 48% (Roundup): 5–8 mL/litro — aplicar en calma y sin viento
- Paraquat: solo mochila calibrada, muy tóxico, no aplicar cerca de troncos
- Proteger el tronco con un tubo PVC 20 cm de diámetro al aplicar herbicidas

COBERTURAS (mejor solución a largo plazo):
- Sembrar Kudzu tropical (Pueraria phaseoloides) o Maní forrajero entre los árboles
- Suprimen malezas, fijan nitrógeno y conservan la humedad
- Costo: semilla Maní forrajero 3 kg/ha ≈ $45.000 COP

MULCHING ORGÁNICO:
- 5–8 cm de rastrojo o paja en el plateo: reduce malezas 70%, conserva humedad
- Material: pasto seco, cascarilla de arroz, compostaje
- Renovar cada 3 meses

JORNALES ESTIMADOS: Control manual 2 ha ≈ 3–4 jornales cada 45 días ≈ $150.000–200.000 COP por limpia.`,
  },

  // ── COSECHA ──────────────────────────────────────────────────────────────

  {
    id: "h01",
    category: "cosecha",
    subcategory: "madurez",
    keywords: ["cosecha", "punto de corte", "madurez", "dias", "floración", "aceite", "peso", "calibre"],
    title: "Punto de cosecha y madurez en aguacate Hass",
    content: `Cosechar en el momento correcto es fundamental para calidad y precio. La cosecha temprana da fruto que nunca madura bien; la tardía causa pérdidas en árbol.

INDICADORES DE MADUREZ PARA HASS:

1. DÍAS DESPUÉS DE ANTESIS (DDA): principal indicador
   - Norte de Santander a 1.800 msnm: 240–280 días después de floración
   - Primer año de producción: monitorear desde día 210

2. CAMBIO DE COLOR DE LA PIEL:
   - Hass INICIA cambio de verde a morado-negro al madurar EN el árbol
   - Cuando el 50% de los frutos muestran manchas moradas → probar cosecha

3. DENSIDAD (prueba del agua):
   - Fruto maduro para cosechar FLOTA ligeramente en agua o se hunde lentamente
   - Fruto inmaduro: se hunde rápido
   - No confiable solo, usar junto con otro indicador

4. CONTENIDO DE ACEITE (para exportación):
   - Mínimo 8% de aceite (base materia fresca)
   - Laboratorio o refractómetro de campo

5. MADURACIÓN POSCOSECHA (prueba organoléptica):
   - Cosechar 3 frutos de muestra, dejar madurar a temperatura ambiente (7–10 días)
   - Si maduran con piel verde = inmaduros
   - Si maduran con piel negro y pulpa verde cremosa = punto óptimo

PARA MERCADO LOCAL COLOMBIANO:
- El consumidor local prefiere aguacate verde-negro, casi negro
- Cosechar y llevar a mercado: el fruto termina de madurar en tránsito (3–5 días)
- NO cosechar frutos con manchas de antracnosis o daños mecánicos

PRIMERA COSECHA ESTIMADA FINCA ÁLVAREZ PACHECO: enero 2028
- Producción primer año: 3–5 kg/árbol (menor a la producción plena)
- Total estimado: 320 árboles × 4 kg = 1.280 kg ≈ 1.3 toneladas
- A $3.200/kg: ≈ $4.096.000 COP primer año
- Producción plena (año 4–6): 15–25 kg/árbol`,
  },

  // ── FINANCIERO ────────────────────────────────────────────────────────────

  {
    id: "f01",
    category: "financiero",
    subcategory: "costos-establecimiento",
    keywords: ["costo", "presupuesto", "inversion", "gastos", "establecimiento", "año 1", "primer año", "presupuesto", "cuanto", "precio"],
    title: "Presupuesto de establecimiento aguacate Hass en Colombia (por hectárea)",
    content: `COSTOS APROXIMADOS DE ESTABLECIMIENTO POR HECTÁREA (valores 2026):

INSUMOS BÁSICOS:
- Plántulas certificadas (160/ha): 160 × $5.000–8.000 = $800.000–1.280.000 COP
- Fertilizantes año 1: $300.000–450.000 COP
- Fungicidas y pesticidas año 1: $250.000–400.000 COP
- Materiales riego básico: $400.000–800.000 COP
- Cal y enmiendas: $80.000–150.000 COP

MANO DE OBRA:
- Preparación terreno (subsolado, nivelación): $350.000–600.000 COP/ha
- Trazado y hoyado (160 hoyos): 3–4 jornales = $180.000–240.000 COP
- Siembra (incluyendo mezcla de suelo): 2–3 jornales = $120.000–180.000 COP
- Riego manual (durante establecimiento): 2 jornales/semana × 52 = $5.200.000 COP (si no hay sistema automático)
- Limpias (malezas) 8 veces × 2 jornales = $800.000–960.000 COP

MAQUINARIA:
- Subsolado (1 pasada): $300.000–500.000 COP/ha
- Transporte insumos: $100.000–200.000 COP

TOTAL ESTIMADO AÑO 1 POR HECTÁREA: $3.500.000–6.000.000 COP

PARA 2 HECTÁREAS (Finca Álvarez Pacheco): $7.000.000–12.000.000 COP

RETORNO ESPERADO:
- Año 2: cosecha parcial ($2.000.000–4.000.000/ha)
- Año 3: $5.000.000–10.000.000/ha
- Año 4–6 (producción plena): $15.000.000–25.000.000/ha/año

TIR (Tasa Interna de Retorno) estimada: 25–35% anual a partir del año 4
TIEMPO DE RECUPERACIÓN DE INVERSIÓN: 4–5 años`,
  },

];

// ── Export utility ─────────────────────────────────────────────────────────────
export const getAllCategories = (): Category[] => [
  "plagas", "riego", "nutricion", "clima", "etapas", "agronomia", "cosecha", "financiero"
];

export const getChunkById = (id: string) =>
  knowledgeBase.find((c) => c.id === id);

export const getChunksByCategory = (category: Category) =>
  knowledgeBase.filter((c) => c.category === category);
