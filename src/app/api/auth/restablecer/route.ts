import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { restablecerSchema } from "@/lib/validations";
import { tokenExpirado } from "@/lib/tokens";

/**
 * POST /api/auth/restablecer — completa el reset de contraseña con el token
 * del correo. Además de actualizar la contraseña, limpia
 * failedLoginAttempts/lockedUntil — un reset legítimo es la forma estándar
 * de desbloquear una cuenta que se bloqueó por intentos fallidos (ver
 * authorize() en auth.ts), no hace falta que el usuario espere los 15 min.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = restablecerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    const { token, password } = parsed.data;

    const user = await db.user.findUnique({
      where: { tokenResetPassword: token },
      select: { id: true, tokenResetPasswordExpira: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Enlace inválido" }, { status: 404 });
    }
    if (tokenExpirado(user.tokenResetPasswordExpira)) {
      return NextResponse.json({ error: "Este enlace venció. Pide uno nuevo." }, { status: 410 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        tokenResetPassword: null,
        tokenResetPasswordExpira: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("[POST /api/auth/restablecer]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
