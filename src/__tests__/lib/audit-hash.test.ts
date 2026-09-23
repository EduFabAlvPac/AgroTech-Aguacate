import { describe, it, expect } from "vitest";
import { verificarCadena, calcularHash, contenidoParaHash, GENESIS, type FilaCadena } from "@/lib/audit";

/**
 * ADR-011 Sprint 5 — núcleo puro del encadenamiento hash (sin BD, sin
 * next/headers, sin Prisma.$transaction — por eso se prueba acá en vez de
 * en registrarAuditoria() directamente). Construye cadenas sintéticas con
 * las mismas funciones que usa la implementación real (calcularHash/
 * contenidoParaHash/GENESIS, exportadas justamente para esto), así que no
 * hay lógica duplicada entre el código y el test.
 */

interface FilaBase extends Omit<FilaCadena, "hashPrevio" | "hashActual" | "detalle"> {
  detalle: Record<string, unknown>;
}

function filaBase(overrides: Partial<FilaBase> = {}): FilaBase {
  return {
    id: "fila-1",
    actorId: "user-1",
    actorEmail: "dueno@ejemplo.co",
    accion: "equipo.editar",
    detalle: { campo: "valor" },
    organizacionId: "org-1",
    recurso: "Membresia",
    recursoId: "membresia-1",
    resultado: "EXITO",
    ipAddress: "127.0.0.1",
    userAgent: "vitest",
    createdAt: new Date("2026-09-23T10:00:00.000Z"),
    ...overrides,
  };
}

/** Arma una cadena de N filas válida, encadenando cada una con la anterior —
 * misma operación que hace registrarAuditoria() fila por fila. */
function construirCadena(cantidad: number): FilaCadena[] {
  const filas: FilaCadena[] = [];
  let hashPrevio = GENESIS;
  for (let i = 0; i < cantidad; i++) {
    const base = filaBase({
      id: `fila-${i + 1}`,
      detalle: { indice: i },
      createdAt: new Date(2026, 8, 23, 10, i),
    });
    const contenido = contenidoParaHash(base);
    const hashActual = calcularHash(hashPrevio, contenido);
    filas.push({ ...base, hashPrevio, hashActual });
    hashPrevio = hashActual;
  }
  return filas;
}

describe("verificarCadena — cadena íntegra", () => {
  it("una cadena de una sola fila, encadenada desde GENESIS, es íntegra", () => {
    const [fila] = construirCadena(1);
    expect(fila.hashPrevio).toBe(GENESIS);
    expect(verificarCadena([fila])).toEqual({ integra: true });
  });

  it("una cadena de varias filas es íntegra — cada hashPrevio es el hashActual de la anterior", () => {
    const filas = construirCadena(5);
    expect(filas[2].hashPrevio).toBe(filas[1].hashActual);
    expect(verificarCadena(filas)).toEqual({ integra: true });
  });

  it("una cadena vacía es íntegra (nada que romper)", () => {
    expect(verificarCadena([])).toEqual({ integra: true });
  });
});

describe("verificarCadena — detecta alteraciones", () => {
  it("alterar el detalle de una fila después de escrita rompe la verificación EN esa fila", () => {
    const filas = construirCadena(3);
    filas[1] = { ...filas[1], detalle: { indice: "manipulado" } };
    expect(verificarCadena(filas)).toEqual({ integra: false, filaRota: "fila-2" });
  });

  it("alterar hashPrevio a mano (sin tocar el contenido) también se detecta", () => {
    const filas = construirCadena(3);
    filas[1] = { ...filas[1], hashPrevio: "hash-inventado" };
    expect(verificarCadena(filas)).toEqual({ integra: false, filaRota: "fila-2" });
  });

  it("insertar una fila fuera de orden (createdAt desordenado respecto al encadenamiento real) rompe la cadena", () => {
    const filas = construirCadena(3);
    const [primera, segunda, tercera] = filas;
    // segunda y tercera intercambiadas: la que ahora va segunda no encadena
    // con lo que sigue.
    expect(verificarCadena([primera, tercera, segunda]).integra).toBe(false);
  });
});

describe("verificarCadena — filas sin encadenar (organizacionId null en su momento)", () => {
  it("una fila con hashActual null no rompe la cadena, solo se salta", () => {
    const filas = construirCadena(2);
    const filaSinEncadenar: FilaCadena = {
      ...filaBase({ id: "fila-sin-encadenar", organizacionId: null }),
      hashPrevio: null,
      hashActual: null,
    };
    // Se intercala entre las dos filas reales de la cadena.
    expect(verificarCadena([filas[0], filaSinEncadenar, filas[1]])).toEqual({ integra: true });
  });
});

describe("calcularHash", () => {
  it("es determinístico: mismo hashPrevio + mismo contenido siempre da el mismo hash", () => {
    const contenido = contenidoParaHash(filaBase());
    expect(calcularHash(GENESIS, contenido)).toBe(calcularHash(GENESIS, contenido));
  });

  it("un contenido distinto da un hash distinto", () => {
    const a = contenidoParaHash(filaBase({ detalle: { x: 1 } }));
    const b = contenidoParaHash(filaBase({ detalle: { x: 2 } }));
    expect(calcularHash(GENESIS, a)).not.toBe(calcularHash(GENESIS, b));
  });

  it("produce un hex de 64 caracteres (sha256)", () => {
    expect(calcularHash(GENESIS, "cualquier contenido")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("contenidoParaHash — invariante al orden de las claves (regresión de QA real)", () => {
  // Bug real encontrado probando en local (no en mocks): Postgres `jsonb` NO
  // conserva el orden de inserción de las claves de un objeto — las
  // reordena al guardar. Sin esto, el hash calculado al escribir (sobre el
  // objeto en memoria) nunca volvía a coincidir al verificar (sobre el
  // mismo objeto releído de la BD, con las claves reordenadas), y
  // `verificarCadena()` reportaba manipulación en filas que nunca se
  // tocaron. Este test no toca Postgres — reproduce el síntoma exacto
  // construyendo el mismo `detalle` con las claves en dos órdenes
  // distintos, tal como jsonb podría devolverlas.
  it("un mismo detalle con las claves en otro orden produce el mismo contenido para hash", () => {
    const enOrdenA = filaBase({ detalle: { nombre: "Finca X", nit: "123", ciudad: "Ocaña" } });
    const enOrdenB = filaBase({ detalle: { ciudad: "Ocaña", nombre: "Finca X", nit: "123" } });
    expect(contenidoParaHash(enOrdenA)).toBe(contenidoParaHash(enOrdenB));
  });

  it("lo mismo, anidado (un objeto dentro de detalle) — mismo caso real de organizacion.editar", () => {
    const enOrdenA = filaBase({ detalle: { cambios: { nombre: "A", nit: "1", ciudad: "B" } } });
    const enOrdenB = filaBase({ detalle: { cambios: { ciudad: "B", nombre: "A", nit: "1" } } });
    expect(contenidoParaHash(enOrdenA)).toBe(contenidoParaHash(enOrdenB));
  });

  it("un detalle con una clave en null (no undefined) sí importa — no es lo mismo que ausente", () => {
    const conNull = filaBase({ detalle: { celularContacto: null } });
    const sinClave = filaBase({ detalle: {} });
    expect(contenidoParaHash(conNull)).not.toBe(contenidoParaHash(sinClave));
  });
});
