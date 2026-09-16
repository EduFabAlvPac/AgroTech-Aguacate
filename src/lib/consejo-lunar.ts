import type { NombreFaseLunar } from "@/lib/fase-lunar";

export interface ConsejoLunar {
  /** Corto, para el encabezado de la tarjeta — ej. "Bueno para sembrar". */
  actividad: string;
  /** Explicación completa, en el mismo tono campesino que el resto de la app. */
  texto: string;
}

/**
 * Calendario lunar tradicional (siembra en creciente, poda en menguante,
 * cosecha en llena/menguante según qué se coseche) — sabiduría de campo muy
 * extendida en Colombia y el resto de Latinoamérica, no una invención
 * propia (ver persona `agrotech-agricultor-colombiano`: "Calendario lunar
 * para siembra, poda y cosecha"). Es tradición, no ciencia verificada — se
 * presenta como tal, sin pretender ser una recomendación técnica de GermIA.
 */
export const CONSEJO_LUNAR: Record<NombreFaseLunar, ConsejoLunar> = {
  LUNA_NUEVA: {
    actividad: "Día de descanso",
    texto: "Según la tradición, no es el mejor momento para sembrar. Aprovecha para preparar el terreno, limpiar herramientas y dejar todo listo para cuando entre la luna creciente.",
  },
  CRECIENTE: {
    actividad: "Bueno para sembrar",
    texto: "La savia de las plantas empieza a subir — es un buen momento para sembrar, trasplantar e injertar. Las plantas absorben mejor el agua y los nutrientes en esta fase.",
  },
  CUARTO_CRECIENTE: {
    actividad: "Bueno para sembrar y abonar",
    texto: "Sigue siendo buena fase para sembrar y trasplantar. También es un buen momento para abonar — la planta aprovecha bien lo que le des ahora.",
  },
  GIBOSA_CRECIENTE: {
    actividad: "Últimos días para sembrar",
    texto: "Si te falta sembrar algo, estos son los últimos días antes de la luna llena. También es buen momento para fertilizar tus cultivos.",
  },
  LUNA_LLENA: {
    actividad: "Bueno para cosechar y abonar",
    texto: "Es el momento de mayor energía del ciclo lunar — buena fase para cosechar lo que vas a consumir pronto y para abonar tus cultivos.",
  },
  GIBOSA_MENGUANTE: {
    actividad: "Empieza a bajar la savia",
    texto: "La savia de las plantas empieza a bajar — es un buen momento para ir empezando a podar, porque la planta sangra menos y cicatriza mejor.",
  },
  CUARTO_MENGUANTE: {
    actividad: "Bueno para podar",
    texto: "Según la tradición, esta es la mejor fase para podar ramas y controlar plagas — la planta está en su punto más bajo de savia y se recupera más rápido.",
  },
  MENGUANTE: {
    actividad: "Bueno para cosechar semillas",
    texto: "Buen momento para cosechar granos y semillas que vas a guardar o secar — tienen menos humedad en esta fase — y para seguir con el control de plagas.",
  },
};
