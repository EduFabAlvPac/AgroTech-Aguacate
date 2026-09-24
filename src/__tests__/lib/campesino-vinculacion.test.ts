import { describe, it, expect, beforeAll } from "vitest";
import {
  generarCodigoVinculacion,
  normalizarCodigo,
  hashCodigoVinculacion,
  codigoCoincide,
  leerCookieDispositivo,
  COOKIE_DISPOSITIVO,
} from "@/lib/campesino-vinculacion";

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "secreto-de-prueba-para-vitest";
});

describe("generarCodigoVinculacion", () => {
  it("siempre son 6 dígitos (con ceros a la izquierda si hace falta)", () => {
    for (let i = 0; i < 500; i++) expect(generarCodigoVinculacion()).toMatch(/^\d{6}$/);
  });

  it("no repite siempre el mismo valor", () => {
    const codigos = new Set(Array.from({ length: 50 }, generarCodigoVinculacion));
    expect(codigos.size).toBeGreaterThan(40);
  });
});

describe("normalizarCodigo", () => {
  it("quita espacios y guiones que el campesino teclea de más", () => {
    expect(normalizarCodigo(" 004 821 ")).toBe("004821");
    expect(normalizarCodigo("004-821")).toBe("004821");
  });
});

describe("hashCodigoVinculacion / codigoCoincide", () => {
  it("el mismo código en dos usuarios produce hashes distintos", () => {
    expect(hashCodigoVinculacion("user-a", "123456")).not.toBe(hashCodigoVinculacion("user-b", "123456"));
  });

  it("es determinístico y tolera formato distinto del mismo código", () => {
    expect(hashCodigoVinculacion("u", "123456")).toBe(hashCodigoVinculacion("u", "123 456"));
  });

  it("coincide con el correcto y rechaza uno distinto", () => {
    const guardado = hashCodigoVinculacion("u", "123456");
    expect(codigoCoincide(guardado, hashCodigoVinculacion("u", "123456"))).toBe(true);
    expect(codigoCoincide(guardado, hashCodigoVinculacion("u", "123457"))).toBe(false);
  });

  it("un hash vacío o de largo distinto nunca coincide (sin lanzar)", () => {
    expect(codigoCoincide("", "")).toBe(false);
    expect(codigoCoincide("abcd", "abcdef")).toBe(false);
  });

  it("sin NEXTAUTH_SECRET lanza un error claro", () => {
    const original = process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    try {
      expect(() => hashCodigoVinculacion("u", "123456")).toThrow(/NEXTAUTH_SECRET/);
    } finally {
      process.env.NEXTAUTH_SECRET = original;
    }
  });
});

describe("leerCookieDispositivo", () => {
  it("extrae el valor entre otras cookies", () => {
    expect(leerCookieDispositivo(`a=1; ${COOKIE_DISPOSITIVO}=tok_xyz; b=2`)).toBe("tok_xyz");
  });

  it("devuelve null si no está, o si el header no existe / viene vacío", () => {
    expect(leerCookieDispositivo("a=1; b=2")).toBeNull();
    expect(leerCookieDispositivo(undefined)).toBeNull();
    expect(leerCookieDispositivo(`${COOKIE_DISPOSITIVO}=`)).toBeNull();
  });

  it("no confunde otra cookie cuyo nombre solo contiene el nuestro", () => {
    expect(leerCookieDispositivo(`x_${COOKIE_DISPOSITIVO}=malo`)).toBeNull();
  });
});
