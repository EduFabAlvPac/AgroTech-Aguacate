---
name: run-agrotech-qa
description: Levanta GermIA (Next.js) o apunta a producción real, inicia sesión, fuerza modo Simple/Completa/Automático, navega a una ruta y toma una captura emulando celular o escritorio — para QA manual, reproducir bugs de "cómo se ve en el celular", o verificar un fix contra producción. Úsalo cuando pidan "probar en el celular", "verificar en producción", "reproducir el bug", "tomar captura de", "revisar modo simple/completo".
---

Todos los paths de abajo son relativos a la raíz del repo (`AgroTech-Aguacate/`).

## Por qué existe

En la sesión del 2026-08-15 (ADR-006, migración modo simple/completo a
GermIA) casi cada bug reportado por el usuario era "así se ve/se
comporta en mi celular" — y verificarlo significaba, cada vez: iniciar
sesión, emular un iPhone, a veces forzar Simple/Completa antes de
mirar algo, navegar a la ruta específica, tomar captura, mirarla. Ese
guion se escribió a mano en `/tmp` unas 15 veces. `driver.mjs` es ese
guion, ya no ad-hoc.

## Prerrequisito (ya hecho en este repo, no repetir)

Playwright se instaló como devDependency real — antes se intentaba
apuntar `NODE_PATH` al caché de `npx`, pero **eso no funciona con
`import` de ESM** (solo con `require` de CommonJS; `NODE_PATH` es una
limitación conocida de Node para resolución de módulos ES). El fix
real:

```bash
npm install --save-dev playwright
```

Ya está en `package.json`. El binario de Chromium se resuelve solo
(usa el caché de `~/Library/Caches/ms-playwright` en macOS o
`~/.cache/ms-playwright` en Linux) — no hizo falta `npx playwright
install` en esta máquina porque ya había un Chromium cacheado de un
uso anterior de `npx playwright`. Si en una máquina nueva `chromium.launch()`
falla con "Executable doesn't exist", corre `npx playwright install chromium`
una vez.

## Run (agent path) — el driver

```bash
# Contra dev local — arrancar el server primero, next elige el primer puerto libre desde 3000:
npm run dev &
# ...esperar a que compile (ver el puerto real en el log si 3000 está ocupado)...

node .claude/skills/run-agrotech-qa/driver.mjs \
  --url=http://localhost:3000 \
  --device=iphone \
  --screenshot=/tmp/inicio.png
```

Salida (verificada, corrida real en esta sesión):
```
Modo detectado: completa
URL final: http://localhost:3002/dashboard
Título: GermIA — Gestión inteligente de cultivos
Errores de consola: ninguno
Captura guardada en: /tmp/inicio.png
```

Contra **producción real** (mismo binario, solo cambia `--url`):

```bash
node .claude/skills/run-agrotech-qa/driver.mjs \
  --url=https://agro-tech-aguacate.vercel.app \
  --device=iphone --json
```
→ `{"modo":"simple","url":"...", "title":"...", "consoleErrors":[]}`

### Flags

| Flag | Qué hace | Default |
|---|---|---|
| `--url` | base a probar (dev local o producción) | `http://localhost:3000` |
| `--device` | `iphone` (iPhone 13 de Playwright) o `desktop` (1440×900) | `iphone` |
| `--email` / `--password` | credenciales | cuenta demo sembrada `info@fincaalvarezpacheco.co` / `agro2026` |
| `--route` | ruta tras login | `/dashboard` |
| `--set-vista` | `SIMPLE`\|`COMPLETA`\|`AUTO` — pasa primero por Configuración y fuerza el switch de 3 posiciones antes de ir a `--route` | (no toca la preferencia) |
| `--screenshot` | ruta de archivo para guardar la captura | (no captura) |
| `--full-page` | captura de página completa en vez de solo el viewport | viewport |
| `--json` | imprime un único JSON (`modo`, `url`, `title`, `consoleErrors`) en vez de líneas sueltas | líneas sueltas |

Detección de modo (la misma regla usada a mano toda la sesión): el nav
inferior de modo simple tiene un link de texto **exacto** `"IA"`; el
sidebar de modo completo dice "Asistente IA" (no matchea `exact`).
Ver `checkModo` dentro de `driver.mjs` si hace falta ajustarla.

## Run (human path)

`npm run dev`, abrir `http://localhost:<puerto>` en un navegador con
las devtools en modo responsive — solo para inspección visual manual,
no para dejar constancia reproducible de un bug (para eso, el driver).

## Gotchas

- **`NODE_PATH` + `import` de ESM no funciona.** Es la razón de que
  este driver exista como devDependency real en vez del truco que se
  usó ad-hoc toda la sesión anterior (`NODE_PATH=.../npx/.../node_modules
  node script.js` — eso solo funciona con `.js` + `require`, nunca
  con `.mjs` + `import`).
- **`npm run dev` puede arrancar en un puerto distinto a 3000** si algo
  ya lo está usando (pasó en esta misma sesión — arrancó en 3002).
  Mirar el log de arranque (`Local: http://localhost:XXXX`) y pasar
  ese puerto en `--url`.
- **La preferencia (`vistaPreferida`) vive en la base de datos del
  usuario, no en una cookie del navegador** — `--set-vista` persiste
  entre sesiones/dispositivos. Si vas a dejar el entorno como lo
  encontraste, corre el driver una vez más con `--set-vista=AUTO` al
  terminar (así se dejó dev local en esta sesión).
- **Nunca correr `--set-vista` (ni nada destructivo) contra
  `--url=https://agro-tech-aguacate.vercel.app` sin confirmar con el
  usuario primero** — esa URL es la cuenta real de producción, no un
  entorno de pruebas.
- **`esSuperAdmin` + preferencia `AUTO` fuerza modo completo
  incluso en `--device=iphone`** (regla real de la app, no un bug del
  driver) — si necesitas ver modo simple de verdad, usa
  `--set-vista=SIMPLE` explícito en vez de confiar en `AUTO`.
