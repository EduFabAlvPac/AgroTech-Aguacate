import { describe, it, expect } from "vitest";
import { obtenerConsejoDelDia } from "@/lib/consejo-del-dia";
import type { CurrentWeather } from "@/lib/weather";

const climaBase: CurrentWeather = {
  temp: 22,
  feelsLike: 22,
  humidity: 60,
  windSpeed: 10,
  windDeg: 0,
  description: "Cielo despejado",
  icon: "01d",
  clouds: 10,
  pressure: 1013,
  city: "Ocaña",
  country: "CO",
  dt: 0,
};

describe("obtenerConsejoDelDia", () => {
  it("advierte contra fumigar/fertilizar con lluvia fuerte", () => {
    const consejo = obtenerConsejoDelDia({ ...climaBase, rain1h: 15 });
    expect(consejo).toMatch(/no es buen día/i);
  });

  it("advierte contra fumigar con viento fuerte", () => {
    const consejo = obtenerConsejoDelDia({ ...climaBase, windSpeed: 45 });
    expect(consejo).toMatch(/viento/i);
  });

  it("sugiere regar temprano/tarde con calor fuerte", () => {
    const consejo = obtenerConsejoDelDia({ ...climaBase, temp: 35 });
    expect(consejo).toMatch(/calor/i);
  });

  it("sugiere proteger cultivos sensibles con frío fuerte", () => {
    const consejo = obtenerConsejoDelDia({ ...climaBase, temp: 8 });
    expect(consejo).toMatch(/frío/i);
  });

  it("da un consejo positivo genérico con clima tranquilo", () => {
    const consejo = obtenerConsejoDelDia(climaBase);
    expect(consejo).toMatch(/buen día/i);
  });

  it("funciona sin datos de clima (null)", () => {
    const consejo = obtenerConsejoDelDia(null);
    expect(consejo.length).toBeGreaterThan(0);
  });
});
