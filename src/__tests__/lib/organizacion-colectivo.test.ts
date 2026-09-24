import { describe, it, expect } from "vitest";
import { normalizarNit } from "@/lib/organizacion-colectivo";

describe("normalizarNit", () => {
  it("'900.123.456-7' y '9001234567' son el mismo NIT (evita duplicar una cooperativa por el formato)", () => {
    expect(normalizarNit("900.123.456-7")).toBe("9001234567");
    expect(normalizarNit(" 9001234567 ")).toBe("9001234567");
  });
  it("conserva una K de verificación en mayúscula", () => {
    expect(normalizarNit("800.111.222-k")).toBe("800111222K");
  });
});
