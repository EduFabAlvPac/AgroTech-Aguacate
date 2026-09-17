import { describe, it, expect } from "vitest";
import { generarToken, expiraEnHoras, tokenExpirado } from "@/lib/tokens";

describe("tokens (self-signup / recuperar contraseña)", () => {
  it("generarToken produce strings distintos y suficientemente largos", () => {
    const a = generarToken();
    const b = generarToken();
    expect(a).not.toBe(b);
    // 32 bytes en base64url son 43 caracteres (sin padding).
    expect(a.length).toBeGreaterThanOrEqual(40);
  });

  it("expiraEnHoras devuelve una fecha futura acorde a las horas pedidas", () => {
    const antes = Date.now();
    const expira = expiraEnHoras(1);
    const despues = Date.now();
    const unaHoraMs = 60 * 60 * 1000;
    expect(expira.getTime()).toBeGreaterThanOrEqual(antes + unaHoraMs - 100);
    expect(expira.getTime()).toBeLessThanOrEqual(despues + unaHoraMs + 100);
  });

  it("tokenExpirado detecta null, fechas pasadas y fechas futuras correctamente", () => {
    expect(tokenExpirado(null)).toBe(true);
    expect(tokenExpirado(new Date(Date.now() - 1000))).toBe(true);
    expect(tokenExpirado(new Date(Date.now() + 60_000))).toBe(false);
  });

  it("reset de contraseña (1h) vence antes que verificación de correo (24h) — más sensible, ventana más corta", () => {
    const resetExpira = expiraEnHoras(1);
    const verificacionExpira = expiraEnHoras(24);
    expect(resetExpira.getTime()).toBeLessThan(verificacionExpira.getTime());
  });
});
