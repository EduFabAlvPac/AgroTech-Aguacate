import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recuperarSchema } from "@/lib/validations";
import { generarToken, expiraEnHoras, hashToken } from "@/lib/tokens";
import { enviarEmailVerificacion } from "@/lib/email";
import { verificarLimite, RateLimitError } from "@/lib/rate-limit";

/**
 * POST /api/auth/reenviar-verificacion — para cuando el primer correo de
 * /registro no llegó o se perdió (LoginEstandarForm.tsx lo llama cuando el
 * login falla específicamente por MENSAJE_EMAIL_NO_VERIFICADO). Reusa
 * `recuperarSchema` (solo pide `email`) — mismo shape, distinto propósito.
 *
 * Mismo criterio anti-enumeración que /api/auth/recuperar: responde 200
 * igual si el correo existe, no existe, o ya está verificado — nunca revela
 * cuál de los tres pasó.
 *
 * ADR-011 Sprint 1 — ya no "reutiliza" un token vigente (`tokenVigenteOGenerar`,
 * PR #51): con hash no se puede, nunca se guarda el valor crudo, esa es
 * justamente la propiedad de hashear. Cada reenvío crea una fila TokenAuth
 * nueva — el efecto que buscaba el PR #51 (que un correo viejo no quede
 * "inválido") se mantiene igual o mejor: pueden convivir varias filas
 * válidas para el mismo usuario, así que un enlace anterior sigue sirviendo
 * hasta que expire o se use, sin necesidad de reutilizar nada.
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

    const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, emailVerificado: true } });
    if (user && !user.emailVerificado) {
      const token = generarToken();
      await db.tokenAuth.create({
        data: {
          userId: user.id,
          tipo: "VERIFY_EMAIL",
          tokenHash: hashToken(token),
          expiraEn: expiraEnHoras(24),
        },
      });
      await enviarEmailVerificacion(email, user.name, token);
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/auth/reenviar-verificacion]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
