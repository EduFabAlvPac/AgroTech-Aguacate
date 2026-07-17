#!/usr/bin/env node
/**
 * Genera íconos PNG para la PWA de AgroTech.
 * Color de fondo: #639922 (verde aguacate primario)
 * Dibuja un ícono de hoja (leaf) blanca centrada sobre fondo verde redondeado.
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SIZES = [72, 96, 128, 192, 512];
const OUT_DIR = path.join(__dirname, "../public/icons");

// Asegurar que el directorio existe
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

/**
 * Genera el SVG de un ícono de hoja (leaf) para el tamaño dado.
 * El path de la hoja está normalizado en un viewport de 100x100 y se escala al tamaño.
 */
function buildSvg(size) {
  const radius = Math.round(size * 0.22); // esquinas redondeadas ~22%
  // Leaf path: hoja estilizada dentro de un viewBox 24x24 (Lucide-style)
  // Escalado para ocupar ~60% del ícono, centrado
  const leafScale = (size * 0.6) / 24;
  const offsetX = (size - 24 * leafScale) / 2;
  const offsetY = (size - 24 * leafScale) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Fondo verde redondeado -->
  <rect width="${size}" height="${size}" rx="${radius}" fill="#639922"/>
  <!-- Ícono de hoja (leaf) blanco, basado en Lucide leaf path, escalado -->
  <g transform="translate(${offsetX}, ${offsetY}) scale(${leafScale})">
    <path
      d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
      fill="white"
    />
    <path
      d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
      stroke="white"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
  </g>
</svg>`;
}

async function generateIcon(size) {
  const svg = buildSvg(size);
  const outFile = path.join(OUT_DIR, `icon-${size}.png`);

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outFile);

  const stats = fs.statSync(outFile);
  console.log(`✅ icon-${size}.png  (${(stats.size / 1024).toFixed(1)} KB)`);
}

(async () => {
  console.log("🌿 Generando íconos PWA para AgroTech (leaf design)...\n");
  for (const size of SIZES) {
    await generateIcon(size);
  }
  console.log("\n✨ Todos los íconos generados en public/icons/");
})();
