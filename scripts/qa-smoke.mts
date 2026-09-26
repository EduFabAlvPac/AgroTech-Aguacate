/**
 * QA de humo (smoke) — recorre las pantallas clave como Super Admin y falla si
 * ve: errores de consola / de React (hidratación #418, etc.), excepciones no
 * capturadas, respuestas HTTP >= 400 de la propia app, o páginas de error.
 * Se corre ANTES de abrir cada PR (ver docs/PROCESO-CALIDAD.md):
 *
 *   npm run dev                       # en otra terminal
 *   npm run qa:smoke                  # contra http://localhost:3000
 *   npm run qa:smoke -- --url=https://agro-tech-aguacate.vercel.app --email=... --password=...
 *
 * Solo LEE (navega y mira): no crea, edita ni borra nada. Usa el navegador de
 * Playwright, sin extensiones, así que el ruido de `runtime.lastError` de
 * Chrome no aparece aquí — lo que salga es de la app.
 */
import { chromium, devices } from "playwright";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=") ?? d;
const BASE = arg("url", "http://localhost:3000").replace(/\/$/, "");
const EMAIL = arg("email", "info@fincaalvarezpacheco.co");
const PASSWORD = arg("password", "agro2026");

const RUTAS = [
  "/dashboard", "/dashboard/cultivos", "/dashboard/mapa", "/dashboard/finanzas", "/dashboard/inversionistas",
  "/dashboard/asistente", "/dashboard/alertas", "/dashboard/compradores", "/dashboard/seguros", "/dashboard/equipo",
  "/dashboard/configuracion?tab=profile", "/dashboard/configuracion?tab=finca", "/dashboard/configuracion?tab=organizacion",
  "/dashboard/configuracion?tab=seguridad", "/dashboard/configuracion?tab=alertas", "/dashboard/configuracion?tab=privacidad",
  "/dashboard/admin/fichas-tecnicas", "/dashboard/admin/precios-mercado", "/dashboard/admin/productos-tienda",
  "/dashboard/admin/organizaciones", "/dashboard/admin/auditoria",
];
const PUBLICAS = ["/login", "/registro", "/registrarse-colectivo", "/recuperar", "/terminos", "/privacidad"];

// Ruido esperado que NO es un fallo de la app.
const IGNORAR_CONSOLA = [/Download the React DevTools/i, /\[Fast Refresh\]/i, /favicon/i];
const IGNORAR_HTTP = [/\/api\/auth\/(session|csrf|providers|_log)/, /\/_next\/(static|image)/, /\.(png|jpg|jpeg|svg|ico|webp|woff2?)($|\?)/];

interface Hallazgo { pantalla: string; tipo: string; detalle: string }
const hallazgos: Hallazgo[] = [];

async function revisar(page: import("playwright").Page, ruta: string, etiqueta: string) {
  const errores: string[] = [];
  const onConsole = (m: import("playwright").ConsoleMessage) => {
    if (m.type() === "error" && !IGNORAR_CONSOLA.some((r) => r.test(m.text()))) errores.push(m.text().slice(0, 220));
  };
  const onPageError = (e: Error) => errores.push(`EXCEPCIÓN: ${e.message.slice(0, 220)}`);
  const onResponse = (r: import("playwright").Response) => {
    const url = r.url();
    if (!url.startsWith(BASE) || r.status() < 400 || IGNORAR_HTTP.some((re) => re.test(url))) return;
    hallazgos.push({ pantalla: etiqueta, tipo: `HTTP ${r.status()}`, detalle: `${r.request().method()} ${url.replace(BASE, "")}` });
  };
  page.on("console", onConsole); page.on("pageerror", onPageError); page.on("response", onResponse);
  try {
    const res = await page.goto(`${BASE}${ruta}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(700);
    if (res && res.status() >= 400) hallazgos.push({ pantalla: etiqueta, tipo: `HTTP ${res.status()}`, detalle: ruta });
    const cuerpo = await page.locator("body").innerText().catch(() => "");
    if (/Application error|This page could not be found|Internal Server Error|Unhandled Runtime Error/i.test(cuerpo)) {
      hallazgos.push({ pantalla: etiqueta, tipo: "PÁGINA DE ERROR", detalle: cuerpo.slice(0, 120).replace(/\s+/g, " ") });
    }
  } catch (e) {
    hallazgos.push({ pantalla: etiqueta, tipo: "NO CARGÓ", detalle: (e as Error).message.split("\n")[0] });
  } finally {
    page.off("console", onConsole); page.off("pageerror", onPageError); page.off("response", onResponse);
  }
  for (const e of errores) hallazgos.push({ pantalla: etiqueta, tipo: "CONSOLA", detalle: e });
}

const browser = await chromium.launch();
try {
  // Pantallas públicas (sin sesión)
  const pub = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  for (const r of PUBLICAS) await revisar(pub, r, `público ${r}`);

  // Escritorio autenticado
  for (const [nombre, opts] of [["escritorio", { viewport: { width: 1440, height: 900 } }], ["celular", { ...devices["iPhone 13"] }]] as const) {
    const ctx = await browser.newContext(opts as any); const p = await ctx.newPage();
    await p.goto(`${BASE}/login`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
    await p.click("text=Productor o cooperativa"); await p.fill('input[type="email"]', EMAIL); await p.fill('input[type="password"]', PASSWORD);
    await p.click('button[type="submit"]');
    try { await p.waitForURL(/\/dashboard/, { timeout: 20000 }); } catch { hallazgos.push({ pantalla: nombre, tipo: "LOGIN", detalle: "No se pudo iniciar sesión con las credenciales dadas" }); continue; }
    for (const r of RUTAS) await revisar(p, r, `${nombre} ${r}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

if (hallazgos.length === 0) {
  console.log(`✅ QA de humo OK — ${PUBLICAS.length + RUTAS.length * 2} pantallas sin errores.`);
  process.exit(0);
}
const porPantalla = new Map<string, Hallazgo[]>();
for (const h of hallazgos) porPantalla.set(h.pantalla, [...(porPantalla.get(h.pantalla) ?? []), h]);
console.log(`❌ QA de humo: ${hallazgos.length} hallazgo(s) en ${porPantalla.size} pantalla(s)\n`);
for (const [pantalla, lista] of porPantalla) {
  console.log(`• ${pantalla}`);
  for (const h of lista) console.log(`    [${h.tipo}] ${h.detalle}`);
}
process.exit(1);
