import { describe, it, expect } from "vitest";
import {
  registroSchema,
  recuperarSchema,
  restablecerSchema,
  invitarMiembroSchema,
  aceptarInvitacionNuevoUsuarioSchema,
} from "@/lib/validations";

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

// ADR-011 Sprint 3 — invitaciones por correo
describe("invitarMiembroSchema", () => {
  const base = { email: "colaborador@ejemplo.co", rolFinca: "OPERARIO" as const, fincaId: "finca-1" };

  it("acepta ADMIN y OPERARIO", () => {
    expect(invitarMiembroSchema.safeParse(base).success).toBe(true);
    expect(invitarMiembroSchema.safeParse({ ...base, rolFinca: "ADMIN" }).success).toBe(true);
  });

  it("rechaza LECTURA — el enum IAM que guarda la invitación no lo distingue de OPERARIO (ver comentario en validations.ts)", () => {
    expect(invitarMiembroSchema.safeParse({ ...base, rolFinca: "LECTURA" }).success).toBe(false);
  });

  it("rechaza un correo inválido o sin fincaId", () => {
    expect(invitarMiembroSchema.safeParse({ ...base, email: "no-valido" }).success).toBe(false);
    expect(invitarMiembroSchema.safeParse({ ...base, fincaId: "" }).success).toBe(false);
  });

  it("mensajePersonal es opcional", () => {
    expect(invitarMiembroSchema.safeParse(base).success).toBe(true);
    expect(invitarMiembroSchema.safeParse({ ...base, mensajePersonal: "Bienvenido al equipo" }).success).toBe(true);
  });
});

describe("aceptarInvitacionNuevoUsuarioSchema", () => {
  it("exige token, nombre y contraseña de al menos 8 caracteres", () => {
    const base = { token: "abc", nombre: "Juan Pérez", password: "12345678" };
    expect(aceptarInvitacionNuevoUsuarioSchema.safeParse(base).success).toBe(true);
    expect(aceptarInvitacionNuevoUsuarioSchema.safeParse({ ...base, nombre: "" }).success).toBe(false);
    expect(aceptarInvitacionNuevoUsuarioSchema.safeParse({ ...base, password: "corta" }).success).toBe(false);
  });
});
