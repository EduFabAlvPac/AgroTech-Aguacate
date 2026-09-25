import { describe, it, expect, beforeAll } from "vitest";
import { firmarPruebaGoogle, verificarPruebaGoogle, PRUEBA_GOOGLE_VIGENCIA_MS } from "@/lib/google-mfa";

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "secreto-de-prueba-vitest";
});

describe("prueba de Google para el paso de MFA", () => {
  it("una prueba recién firmada devuelve el userId", () => {
    expect(verificarPruebaGoogle(firmarPruebaGoogle("user-1"))).toBe("user-1");
  });

  it("vence a los 5 minutos", () => {
    const t0 = 1_000_000;
    const p = firmarPruebaGoogle("user-1", t0);
    expect(verificarPruebaGoogle(p, t0 + PRUEBA_GOOGLE_VIGENCIA_MS - 1)).toBe("user-1");
    expect(verificarPruebaGoogle(p, t0 + PRUEBA_GOOGLE_VIGENCIA_MS + 1)).toBeNull();
  });

  it("rechaza una prueba alterada (cambiar el userId sin poder refirmar)", () => {
    const [payload, sig] = firmarPruebaGoogle("user-1").split(".");
    const otro = Buffer.from(JSON.stringify({ u: "user-2", exp: Date.now() + 60_000 })).toString("base64url");
    expect(verificarPruebaGoogle(`${otro}.${sig}`)).toBeNull();
    expect(verificarPruebaGoogle(`${payload}.${sig.slice(0, -2)}xx`)).toBeNull();
  });

  it("rechaza una prueba firmada con otro secreto", () => {
    const p = firmarPruebaGoogle("user-1");
    process.env.NEXTAUTH_SECRET = "otro-secreto";
    try {
      expect(verificarPruebaGoogle(p)).toBeNull();
    } finally {
      process.env.NEXTAUTH_SECRET = "secreto-de-prueba-vitest";
    }
  });

  it("basura, vacío o null no lanzan: devuelven null", () => {
    for (const x of [null, undefined, "", "abc", "a.b", "..."]) expect(verificarPruebaGoogle(x as string)).toBeNull();
  });
});
