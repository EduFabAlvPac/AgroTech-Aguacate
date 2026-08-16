#!/usr/bin/env node
/**
 * Driver de QA para GermIA (AgroTech-Aguacate) — login + navegación +
 * detección de modo simple/completo + captura de pantalla, contra dev
 * local o producción real, emulando celular o escritorio.
 *
 * Nace de un patrón repetido a mano ~15 veces en una sola sesión de
 * depuración (2026-08-15): cada bug de "cómo se ve en el celular" o
 * "qué pasa en producción" necesitaba el mismo login + emulación de
 * iPhone + a veces forzar Simple/Completa antes de mirar algo. Ver
 * SKILL.md para el porqué de cada flag.
 *
 * Uso: node driver.mjs [flags]
 *   --url=<base>          default http://localhost:3000
 *   --device=iphone|desktop   default iphone (iPhone 13, Playwright devices[])
 *   --email=<email>       default info@fincaalvarezpacheco.co (cuenta demo sembrada)
 *   --password=<pass>     default agro2026
 *   --route=<path>        ruta tras login, default /dashboard
 *   --set-vista=SIMPLE|COMPLETA|AUTO   fuerza la preferencia antes de navegar a --route
 *   --screenshot=<path>   si se da, guarda una captura de --route
 *   --full-page           captura de página completa (default: viewport)
 *   --json                imprime un solo JSON con { modo, url, title } en vez de líneas sueltas
 *
 * Ejemplos:
 *   node driver.mjs --device=iphone --screenshot=/tmp/inicio.png
 *   node driver.mjs --url=https://agro-tech-aguacate.vercel.app --set-vista=SIMPLE
 *   node driver.mjs --route=/dashboard/mapa --device=iphone --screenshot=/tmp/mapa.png --full-page
 */
import { chromium, devices } from "playwright";

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) out[m[1]] = m[2] ?? true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const url = args.url || "http://localhost:3000";
  const email = args.email || "info@fincaalvarezpacheco.co";
  const password = args.password || "agro2026";
  const route = args.route || "/dashboard";
  const deviceName = args.device === "desktop" ? null : "iPhone 13";

  const browser = await chromium.launch();
  const context = deviceName
    ? await browser.newContext({ ...devices[deviceName] })
    : await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  // --- login ---
  await page.goto(`${url}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 45000 });
  await page.waitForTimeout(800);

  // --- forzar vista preferida (opcional) ---
  if (args["set-vista"]) {
    const valor = String(args["set-vista"]).toUpperCase();
    const label = { SIMPLE: "Simple", COMPLETA: "Completa", AUTO: "Automático" }[valor];
    if (!label) throw new Error(`--set-vista inválido: ${args["set-vista"]} (usa SIMPLE|COMPLETA|AUTO)`);
    await page.goto(`${url}/dashboard/configuracion`);
    await page.waitForTimeout(700);
    const yaEsta = await page.getByRole("radio", { name: label, checked: true }).count();
    if (!yaEsta) {
      await page.getByRole("radio", { name: label }).click();
      await page.waitForTimeout(1200);
    }
  }

  // --- navegar a la ruta pedida ---
  await page.goto(`${url}${route}`);
  await page.waitForTimeout(1000);

  // --- detectar modo: el nav inferior de modo simple tiene un link de
  // texto EXACTO "IA"; el sidebar de modo completo dice "Asistente IA"
  // (no matchea exact:true) — mismo check usado a mano toda la sesión. ---
  const esSimple = (await page.getByRole("link", { name: "IA", exact: true }).count()) > 0;
  const modo = esSimple ? "simple" : "completa";
  const title = await page.title();
  const finalUrl = page.url();

  if (args.screenshot) {
    await page.screenshot({ path: args.screenshot, fullPage: !!args["full-page"] });
  }

  if (args.json) {
    console.log(JSON.stringify({ modo, url: finalUrl, title, consoleErrors }));
  } else {
    console.log("Modo detectado:", modo);
    console.log("URL final:", finalUrl);
    console.log("Título:", title);
    console.log("Errores de consola:", consoleErrors.length ? consoleErrors : "ninguno");
    if (args.screenshot) console.log("Captura guardada en:", args.screenshot);
  }

  await browser.close();
}

main().catch((e) => {
  console.error("FALLÓ:", e.message);
  process.exit(1);
});
