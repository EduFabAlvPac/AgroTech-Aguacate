import type { CurrentWeather } from "@/lib/weather";

/**
 * Consejo del día — 1 sola frase corta y accionable sobre el clima actual
 * (mockup validado 2026-08-26). Reglas if/else inspiradas en el ESTILO de
 * src/lib/alert-engine.ts (umbrales climáticos → mensaje con manejo
 * concreto) pero orientadas a tono positivo/informativo, no de alerta — es
 * lógica nueva, no una llamada a ese motor.
 *
 * Antes mezclaba también un aparte de fase lunar — se quitó (2026-08-29) al
 * darle a la fase lunar su propia tarjeta completa con recomendación por
 * fase (ver src/lib/consejo-lunar.ts), para no repetir el mismo contenido
 * dos veces en /campesino/clima.
 */
export function obtenerConsejoDelDia(clima: CurrentWeather | null): string {
  if (!clima) return "Revisa tus cultivos hoy y anota cómo los ves — es el mejor hábito para detectar problemas a tiempo.";

  const lluviaFuerte = (clima.rain1h ?? 0) > 10;
  const vientoFuerte = clima.windSpeed > 30;
  const calorFuerte = clima.temp > 32;
  const frioFuerte = clima.temp < 12;

  if (lluviaFuerte) {
    return "Hoy no es buen día para fumigar ni fertilizar — la lluvia fuerte puede lavar el producto antes de que haga efecto.";
  }
  if (vientoFuerte) {
    return "Hay mucho viento hoy — mejor no fumigues, el producto se puede desviar y no llegar a la planta.";
  }
  if (calorFuerte) {
    return "Hace mucho calor hoy — riega temprano en la mañana o al final de la tarde para no estresar la planta.";
  }
  if (frioFuerte) {
    return "Puede hacer bastante frío — si tienes plantas jóvenes o sensibles, protégelas esta noche.";
  }
  return "Es un buen día para aplicar fertilizantes y hacer manejo de arvenses — poco viento y sin lluvia fuerte a la vista.";
}
