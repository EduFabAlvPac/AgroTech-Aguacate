import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { restablecerSchema } from "@/lib/validations";
import { hashToken, tokenExpirado } from "@/lib/tokens";

/**
 * POST /api/auth/restablecer — completa el reset de contraseña con el token
 * del correo. Además de actualizar la contraseña, limpia
 * failedLoginAttempts/lockedUntil — un reset legítimo es la forma estándar
 * de desbloquear una cuenta que se bloqueó por intentos fallidos (ver
 * authorize() en auth.ts), no hace falta que el usuario espere los 15 min.
 *
 * ADR-011 Sprint 1 — el token ya NO vive en `User.tokenResetPassword` (texto
 * plano); se busca por hash en `TokenAuth` (tipo RESET_PASSWORD). Al usarse
 * con éxito, además de marcar `usadoEn` en la fila usada, se invalidan
 * (`invalidadoEn`) las demás filas RESET_PASSWORD todavía pendientes del
 * mismo usuario — un reset de contraseña es más sensible que una
 * verificación de correo, no debería quedar un segundo enlace "vivo" tras
 * usar uno.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = restablecerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    const { token, password } = parsed.data;

    const registro = await db.tokenAuth.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, tipo: true, expiraEn: true, usadoEn: true, invalidadoEn: true },
    });

    if (!registro || registro.tipo !== "RESET_PASSWORD") {
      return NextResponse.json({ error: "Enlace inválido" }, { status: 404 });
    }
    if (registro.usadoEn || registro.invalidadoEn || tokenExpirado(registro.expiraEn)) {
      return NextResponse.json({ error: "Este enlace venció. Pide uno nuevo." }, { status: 410 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await db.$transaction([
      db.user.update({
        where: { id: registro.userId },
        data: { password: hashed, failedLoginAttempts: 0, lockedUntil: null },
      }),
      db.tokenAuth.update({ where: { id: registro.id }, data: { usadoEn: new Date() } }),
      db.tokenAuth.updateMany({
        where: {
          userId: registro.userId,
          tipo: "RESET_PASSWORD",
          id: { not: registro.id },
          usadoEn: null,
          invalidadoEn: null,
        },
        data: { invalidadoEn: new Date() },
      }),
    ]);

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("[POST /api/auth/restablecer]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
