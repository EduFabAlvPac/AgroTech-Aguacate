// Sincroniza el schema de Prisma con la base de datos SOLO en el build de
// Production de Vercel — parte del `npm run build`, corre automáticamente
// en cada deploy.
//
// Por qué existe: el 13 de agosto de 2026 un fix de seguridad llegó a
// producción con un modelo nuevo (UsoIaDiario) cuya tabla nunca se creó en
// la BD real — el `prisma db push` se había corrido a mano contra el
// Postgres local de desarrollo por error de DATABASE_URL, no contra Neon.
// El Asistente IA estuvo caído en producción hasta detectarlo por los logs.
// Esto automatiza ese paso para que nunca vuelva a depender de que alguien
// se acuerde de correrlo a mano contra la URL correcta.
//
// Por qué el guard de VERCEL_ENV: Production y Preview comparten el mismo
// DATABASE_URL (no hay una Neon branch de preview separada — confirmado con
// `vercel env ls`). Sin este guard, abrir un PR con un cambio de schema a
// medio terminar lo aplicaría a producción en cuanto Vercel construye el
// preview, antes de que nadie lo revise. Local (`npm run build` en tu
// máquina) tampoco corre esto — VERCEL_ENV no existe fuera de Vercel.
//
// Por qué SIN --accept-data-loss: si un cambio de schema pudiera perder
// datos (ej. angostar una columna, quitar un campo con datos), `prisma db
// push` sin esa bandera falla el build en vez de aplicarlo a ciegas —
// fuerza una revisión humana y un `db:push` manual consciente, en vez de
// arriesgar borrar datos reales de un deploy automático.
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  console.log("[db-push-produccion] VERCEL_ENV=production — aplicando `prisma db push`...");
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
} else {
  console.log(
    `[db-push-produccion] VERCEL_ENV=${process.env.VERCEL_ENV ?? "(local, fuera de Vercel)"} — se omite (solo corre en Production).`
  );
}
