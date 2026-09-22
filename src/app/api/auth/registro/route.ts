import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registroSchema } from "@/lib/validations";
import { slugUnico } from "@/lib/organizacion";
import { generarToken, expiraEnHoras, hashToken } from "@/lib/tokens";
import { enviarEmailVerificacion } from "@/lib/email";
import { verificarLimite, RateLimitError } from "@/lib/rate-limit";

/**
 * POST /api/auth/registro — self-signup (Fase 1 SaaS, Tanda 2). Ruta de API
 * pública, no server action, porque corre sin sesión (mismo criterio que
 * /api/auth/[...nextauth]) — un Server Action requiere estar ya en el árbol
 * de una página que el cliente invoca, esto es más simple como fetch directo
 * desde /registro.
 *
 * Crea Organizacion + User(OWNER) + Membresia en una sola transacción
 * interactiva (primer uso de `$transaction(async (tx) => ...)` en el
 * repo — el resto usa la forma en arreglo, pero acá el id de la
 * Organizacion recién creada hace falta para el User/Membresia siguientes,
 * así que la forma en arreglo no alcanza). Sin autoregistro instantáneo: la
 * cuenta queda creada pero no puede loguearse hasta verificar el correo
 * (ver authorize() en auth.ts).
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ip-desconocida";
    await verificarLimite("registro", ip);

    const body = await req.json();
    const parsed = registroSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    // aceptaTerminos ya viene validado como `true` por el schema (z.literal) —
    // si llegó hasta acá, el usuario marcó el checkbox.
    const { nombre, email, password } = parsed.data;

    const existente = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existente) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo" }, { status: 409 });
    }

    // Sin campo de "nombre de finca/negocio" en el formulario (Organizacion.nombre
    // no se muestra en ningún lado de la UI) — mismo patrón que ya usa
    // prisma/backfill-organizaciones.ts para las organizaciones creadas antes.
    const nombreOrganizacion = `Finca de ${nombre}`;
    const slug = await slugUnico(nombreOrganizacion);
    const hashed = await bcrypt.hash(password, 12);
    // ADR-011 Sprint 1 — el token de verificación ya NO se guarda en User
    // (texto plano); vive en TokenAuth con hash. Solo el valor crudo sale
    // por correo, nunca se persiste.
    const tokenVerificacion = generarToken();

    const { user } = await db.$transaction(async (tx) => {
      const organizacion = await tx.organizacion.create({
        data: { nombre: nombreOrganizacion, slug },
      });
      const user = await tx.user.create({
        data: {
          name: nombre,
          email,
          password: hashed,
          role: "PRODUCER",
          terminosAceptadosEn: new Date(),
        },
      });
      await tx.membresia.create({
        data: { userId: user.id, organizacionId: organizacion.id, rol: "OWNER" },
      });
      await tx.tokenAuth.create({
        data: {
          userId: user.id,
          tipo: "VERIFY_EMAIL",
          tokenHash: hashToken(tokenVerificacion),
          expiraEn: expiraEnHoras(24),
        },
      });
      return { user, organizacion };
    });

    await enviarEmailVerificacion(user.email, user.name, tokenVerificacion);

    return NextResponse.json({ data: { email: user.email } }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/auth/registro]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
