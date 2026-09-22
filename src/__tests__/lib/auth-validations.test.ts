import { describe, it, expect } from "vitest";
import { registroSchema, recuperarSchema, restablecerSchema } from "@/lib/validations";

describe("registroSchema (self-signup, Fase 1 SaaS Tanda 2)", () => {
  const base = {
    nombre: "Juan Pérez",
    email: "juan@ejemplo.com",
    password: "contraseña-segura-123",
  };

  it("rechaza si no se aceptan los Términos (false)", () => {
    const result = registroSchema.safeParse({ ...base, aceptaTerminos: false });
    expect(result.success).toBe(false);
  });

  it("rechaza si aceptaTerminos viene ausente", () => {
    const result = registroSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it("acepta un registro válido con aceptaTerminos: true", () => {
    const result = registroSchema.safeParse({ ...base, aceptaTerminos: true });
    expect(result.success).toBe(true);
  });

  it("rechaza contraseñas menores a 8 caracteres", () => {
    const result = registroSchema.safeParse({ ...base, password: "corta", aceptaTerminos: true });
    expect(result.success).toBe(false);
  });

  it("rechaza un correo con formato inválido", () => {
    const result = registroSchema.safeParse({ ...base, email: "no-es-un-correo", aceptaTerminos: true });
    expect(result.success).toBe(false);
  });
});

describe("recuperarSchema / restablecerSchema", () => {
  it("recuperarSchema exige un correo válido", () => {
    expect(recuperarSchema.safeParse({ email: "juan@ejemplo.com" }).success).toBe(true);
    expect(recuperarSchema.safeParse({ email: "no-valido" }).success).toBe(false);
  });

  it("restablecerSchema exige token y contraseña de al menos 8 caracteres", () => {
    expect(restablecerSchema.safeParse({ token: "abc", password: "12345678" }).success).toBe(true);
    expect(restablecerSchema.safeParse({ token: "", password: "12345678" }).success).toBe(false);
    expect(restablecerSchema.safeParse({ token: "abc", password: "corta" }).success).toBe(false);
  });
});
