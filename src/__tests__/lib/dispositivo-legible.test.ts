import { describe, it, expect } from "vitest";
import { describirDispositivo } from "@/lib/dispositivo-legible";

const UA = {
  chromeMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeAndroid: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  edgeWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
  chromeIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1",
};

describe("describirDispositivo", () => {
  it("reconoce navegador y sistema de los casos comunes", () => {
    expect(describirDispositivo(UA.chromeMac)).toBe("Chrome en Mac");
    expect(describirDispositivo(UA.safariIphone)).toBe("Safari en iPhone");
    expect(describirDispositivo(UA.chromeAndroid)).toBe("Chrome en Android");
    expect(describirDispositivo(UA.firefoxLinux)).toBe("Firefox en Linux");
  });

  it("Edge no se confunde con Chrome, ni iPhone con Mac (ambos comparten texto en el UA)", () => {
    expect(describirDispositivo(UA.edgeWindows)).toBe("Edge en Windows");
    expect(describirDispositivo(UA.chromeIos)).toBe("Chrome en iPhone");
  });

  it("sin User-Agent (o irreconocible) no lanza y dice que es desconocido", () => {
    expect(describirDispositivo(null)).toBe("Dispositivo desconocido");
    expect(describirDispositivo(undefined)).toBe("Dispositivo desconocido");
    expect(describirDispositivo("curl/8.0")).toBe("Dispositivo desconocido");
  });
});
