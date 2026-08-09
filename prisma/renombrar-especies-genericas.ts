/**
 * Corrige el nombre de las 4 EspecieCultivo sembradas originalmente con la
 * variedad embebida (ej. "Aguacate Hass") a su nombre genérico ("Aguacate")
 * — ver CLAUDE.md §2.2 y docs/REQUERIMIENTOS.md ADR-002 ("deuda documentada").
 *
 * La variedad específica ya vive en el registro Variedad hijo (creado por
 * prisma/migrar-fichas-tecnicas.ts) — este script solo corrige el nombre del
 * padre para que la jerarquía Especie→Variedad sea coherente en el panel
 * Super Admin (una especie puede tener Hass, Papelillo, Choquette, etc.).
 *
 * Idempotente: si una especie ya tiene el nombre genérico, se omite.
 *
 * Uso: npx tsx prisma/renombrar-especies-genericas.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RENOMBRES: Record<string, { nombre: string; slug: string }> = {
  "aguacate-hass": { nombre: "Aguacate", slug: "aguacate" },
  "cafe-caturra": { nombre: "Café", slug: "cafe" },
  "cacao-ccu51": { nombre: "Cacao", slug: "cacao" },
  "limon-tahiti": { nombre: "Limón", slug: "limon" },
};

async function main() {
  console.log("🏷️  Renombrando especies a nombre genérico");

  for (const [slugViejo, { nombre, slug: slugNuevo }] of Object.entries(RENOMBRES)) {
    const especie = await prisma.especieCultivo.findUnique({ where: { slug: slugViejo } });
    if (!especie) {
      console.log(`  – ${slugViejo}: no existe, se omite.`);
      continue;
    }
    if (especie.nombre === nombre && especie.slug === slugNuevo) {
      console.log(`  ✓ ${slugNuevo}: ya está en formato genérico.`);
      continue;
    }

    // Si ya existe una especie con el slug genérico (creada a mano por
    // error, como pasó en pruebas locales), no se puede renombrar sin
    // colisionar — se reporta para resolver manualmente en vez de arriesgar
    // fusionar datos silenciosamente.
    if (slugNuevo !== especie.slug) {
      const colision = await prisma.especieCultivo.findUnique({ where: { slug: slugNuevo } });
      if (colision) {
        console.warn(`  ⚠️  Ya existe una especie con slug '${slugNuevo}' (id ${colision.id}) — resolver manualmente antes de renombrar '${slugViejo}'.`);
        continue;
      }
    }

    await prisma.especieCultivo.update({
      where: { id: especie.id },
      data: { nombre, slug: slugNuevo },
    });
    console.log(`  → ${especie.nombre} (${slugViejo}) → ${nombre} (${slugNuevo})`);
  }

  console.log("✅ Listo.");
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
