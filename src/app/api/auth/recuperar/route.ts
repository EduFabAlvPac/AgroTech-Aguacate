import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recuperarSchema } from "@/lib/validations";
import { generarToken, expiraEnHoras } from "@/lib/tokens";
import { enviarEmailResetPassword } from "@/lib/email";
import { verificarLimite, RateLimitError } from "@/lib/rate-limit";

/**
 * POST /api/auth/recuperar — pedir el enlace de reset de contraseña. Siempre
 * responde 200 exista o no el correo (OWASP — no revelar si un email está
 * registrado, mismo criterio ya aplicado en el login por contraseña).
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ip-desconocida";
    const body = await req.json();
    const parsed = recuperarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    const { email } = parsed.data;
    await verificarLimite("recuperarPassword", `${ip}:${email}`);

    const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, password: true } });
    // Sin password (cuenta Campesino/Google) → no tiene sentido "recuperar
    // contraseña" ahí, se omite en silencio, mismo criterio anti-enumeración.
    if (user?.password) {
      const token = generarToken();
      await db.user.update({
        where: { id: user.id },
        data: { tokenResetPassword: token, tokenResetPasswordExpira: expiraEnHoras(1) },
      });
      await enviarEmailResetPassword(email, user.name, token);
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/auth/recuperar]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
