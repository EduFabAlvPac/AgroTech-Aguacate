import { describe, it, expect } from "vitest";
import { verificarLimite, CONFIGS_LIMITE, RateLimitError } from "@/lib/rate-limit";

describe("rate-limit", () => {
  it("sin UPSTASH_REDIS_REST_URL/TOKEN configuradas, deja pasar todo (no bloquea el desarrollo local)", async () => {
    // Este entorno de test nunca tiene credenciales reales de Upstash (no se
    // cargan por dotenv en setup.ts) — es exactamente el caso que este
    // comportamiento por diseño debe cubrir: sin cuenta creada todavía, la
    // app sigue funcionando en vez de tirar 500 por una dependencia externa
    // no configurada.
    expect(process.env.UPSTASH_REDIS_REST_URL).toBeUndefined();
    for (let i = 0; i < 20; i++) {
      await expect(verificarLimite("loginPassword", "test@ejemplo.com")).resolves.toBeUndefined();
    }
  });

  it("cada caso de uso tiene una ventana y un máximo positivo", () => {
    for (const config of Object.values(CONFIGS_LIMITE)) {
      expect(config.maximo).toBeGreaterThan(0);
      expect(config.ventana.length).toBeGreaterThan(0);
    }
  });

  it("login es más estricto o igual que IA — el costo de un falso negativo en login es mayor", () => {
    expect(CONFIGS_LIMITE.loginPassword.maximo).toBeLessThanOrEqual(CONFIGS_LIMITE.ia.maximo);
  });

  it("RateLimitError trae status 429 y un mensaje accionable", () => {
    const error = new RateLimitError();
    expect(error.status).toBe(429);
    expect(error.message.length).toBeGreaterThan(10);
  });
});
