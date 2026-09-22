import { describe, it, expect } from "vitest";
import { generarToken, expiraEnHoras, tokenExpirado, tokenVigenteOGenerar, hashToken } from "@/lib/tokens";

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

  describe("tokenVigenteOGenerar (reenviar sin invalidar correos anteriores)", () => {
    it("reutiliza el token si todavía está vigente", () => {
      const expira = expiraEnHoras(5);
      const r = tokenVigenteOGenerar("token-existente", expira, 24);
      expect(r.token).toBe("token-existente");
      expect(r.esNuevo).toBe(false);
      expect(r.expira).toBe(expira);
    });

    it("genera uno nuevo si el actual ya venció", () => {
      const r = tokenVigenteOGenerar("token-viejo", new Date(Date.now() - 1000), 24);
      expect(r.token).not.toBe("token-viejo");
      expect(r.esNuevo).toBe(true);
      expect(r.expira.getTime()).toBeGreaterThan(Date.now());
    });

    it("genera uno nuevo si no hay token (o falta su fecha de expiración)", () => {
      expect(tokenVigenteOGenerar(null, null, 24).esNuevo).toBe(true);
      expect(tokenVigenteOGenerar("token-sin-fecha", null, 24).esNuevo).toBe(true);
      expect(tokenVigenteOGenerar(null, expiraEnHoras(5), 24).esNuevo).toBe(true);
    });
  });

  describe("hashToken (ADR-011 Sprint 1 — TokenAuth/Sesion guardan el hash, nunca el crudo)", () => {
    it("es determinístico: el mismo token siempre produce el mismo hash", () => {
      const token = generarToken();
      expect(hashToken(token)).toBe(hashToken(token));
    });

    it("tokens distintos producen hashes distintos", () => {
      const a = generarToken();
      const b = generarToken();
      expect(hashToken(a)).not.toBe(hashToken(b));
    });

    it("produce un hex de 64 caracteres (sha256)", () => {
      const hash = hashToken(generarToken());
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
