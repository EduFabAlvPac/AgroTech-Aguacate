import { describe, it, expect } from "vitest";
import { limpiarValorEnv } from "@/lib/env-limpia";

describe("limpiarValorEnv", () => {
  it("deja intacto un valor normal", () => {
    expect(limpiarValorEnv("GOOGLE_CLIENT_ID", "123-abc.apps.googleusercontent.com")).toBe("123-abc.apps.googleusercontent.com");
  });
  it("recorta espacios y saltos de línea", () => {
    expect(limpiarValorEnv("X", "  abc\n")).toBe("abc");
  });
  it("quita comillas envolventes", () => {
    expect(limpiarValorEnv("X", '"abc"')).toBe("abc");
    expect(limpiarValorEnv("X", "'abc'")).toBe("abc");
  });
  it("quita el prefijo 'NOMBRE=' pegado por error (con o sin comillas)", () => {
    expect(limpiarValorEnv("GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET=GOCSPX-abc")).toBe("GOCSPX-abc");
    expect(limpiarValorEnv("GOOGLE_CLIENT_SECRET", 'GOOGLE_CLIENT_SECRET="GOCSPX-abc"')).toBe("GOCSPX-abc");
  });
  it("vacío o undefined → cadena vacía (provider no configurado)", () => {
    expect(limpiarValorEnv("X", undefined)).toBe("");
    expect(limpiarValorEnv("X", "   ")).toBe("");
  });
});
