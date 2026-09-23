import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";
import {
  encriptarSecreto,
  desencriptarSecreto,
  generarSecretoTOTP,
  generarUriQR,
  verificarCodigoTOTP,
  generarCodigosRespaldo,
  hashCodigoRespaldo,
  verificarYConsumirCodigoRespaldo,
} from "@/lib/mfa";
import { generate as generarTOTP } from "otplib";

/**
 * ADR-011 Sprint 6 — núcleo puro de MFA (sin BD, sin sesión). `otplib` 13
 * reescribió su API respecto a las versiones 10-12 (ya no existe el
 * singleton `authenticator`, ahora es un set de funciones y `verify` es
 * async) — confirmado con QA real en este sprint, no solo con los tipos:
 * estos tests generan un código TOTP real con la propia librería y lo
 * verifican con `verificarCodigoTOTP`, en vez de mockear la librería.
 */
beforeAll(() => {
  // Clave fija de prueba — 32 bytes en hex, mismo formato que
  // `openssl rand -hex 32` produciría en producción (ver mfa.ts: se cambió
  // de base64 a hex tras un hallazgo real de un `+` corrompido al pegar la
  // clave en el panel de Vercel).
  process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
});

describe("encriptarSecreto / desencriptarSecreto", () => {
  it("round-trip: desencriptar(encriptar(x)) === x", () => {
    const secreto = generarSecretoTOTP();
    const cifrado = encriptarSecreto(secreto);
    expect(desencriptarSecreto(cifrado)).toBe(secreto);
  });

  it("produce un iv distinto en cada llamada (mismo secreto, cifrado distinto)", () => {
    const secreto = generarSecretoTOTP();
    expect(encriptarSecreto(secreto)).not.toBe(encriptarSecreto(secreto));
  });

  it("detecta manipulación del ciphertext (auth tag de GCM)", () => {
    const cifrado = encriptarSecreto(generarSecretoTOTP());
    const [iv, authTag, ciphertext] = cifrado.split(":");
    const ultimoChar = ciphertext.at(-1);
    const alterado = ciphertext.slice(0, -1) + (ultimoChar === "a" ? "b" : "a");
    expect(() => desencriptarSecreto(`${iv}:${authTag}:${alterado}`)).toThrow();
  });

  it("sin MFA_ENCRYPTION_KEY configurada, lanza un error claro en vez de un secreto vacío", () => {
    const original = process.env.MFA_ENCRYPTION_KEY;
    delete process.env.MFA_ENCRYPTION_KEY;
    try {
      expect(() => encriptarSecreto("x")).toThrow(/MFA_ENCRYPTION_KEY/);
    } finally {
      process.env.MFA_ENCRYPTION_KEY = original;
    }
  });
});

describe("TOTP", () => {
  it("un código generado con el secreto real es aceptado", async () => {
    const secreto = generarSecretoTOTP();
    const codigo = await generarTOTP({ secret: secreto });
    expect(await verificarCodigoTOTP(secreto, codigo)).toBe(true);
  });

  it("rechaza un código incorrecto", async () => {
    const secreto = generarSecretoTOTP();
    expect(await verificarCodigoTOTP(secreto, "000000")).toBe(false);
  });

  it("rechaza un código con formato inválido sin lanzar", async () => {
    const secreto = generarSecretoTOTP();
    await expect(verificarCodigoTOTP(secreto, "no-es-un-numero")).resolves.toBe(false);
  });

  it("genera una URI otpauth:// con el emisor y el correo", () => {
    const uri = generarUriQR(generarSecretoTOTP(), "dueno@germia.co");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(decodeURIComponent(uri)).toContain("dueno@germia.co");
    expect(decodeURIComponent(uri)).toContain("GermIA");
  });
});

describe("códigos de respaldo", () => {
  it("genera la cantidad pedida, todos distintos entre sí", () => {
    const codigos = generarCodigosRespaldo(10);
    expect(codigos).toHaveLength(10);
    expect(new Set(codigos).size).toBe(10);
  });

  it("un código válido se consume: sirve una vez, no una segunda", () => {
    const codigos = generarCodigosRespaldo(5);
    const hashes = codigos.map(hashCodigoRespaldo);

    const primero = verificarYConsumirCodigoRespaldo(hashes, codigos[2]);
    expect(primero.valido).toBe(true);
    expect(primero.codigosRestantes).toHaveLength(4);
    expect(primero.codigosRestantes).not.toContain(hashCodigoRespaldo(codigos[2]));

    const segundo = verificarYConsumirCodigoRespaldo(primero.codigosRestantes, codigos[2]);
    expect(segundo.valido).toBe(false);
    // No perdió ningún código más al fallar el segundo intento.
    expect(segundo.codigosRestantes).toHaveLength(4);
  });

  it("un código que nunca existió no coincide con ninguno", () => {
    const hashes = generarCodigosRespaldo(3).map(hashCodigoRespaldo);
    const resultado = verificarYConsumirCodigoRespaldo(hashes, "ZZZZ-ZZZZ");
    expect(resultado.valido).toBe(false);
    expect(resultado.codigosRestantes).toEqual(hashes);
  });

  it("no distingue mayúsculas/minúsculas al transcribir el código a mano", () => {
    const codigos = generarCodigosRespaldo(3);
    const hashes = codigos.map(hashCodigoRespaldo);
    const resultado = verificarYConsumirCodigoRespaldo(hashes, codigos[0].toLowerCase());
    expect(resultado.valido).toBe(true);
  });
});
