import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken, tokenExpirado } from "@/lib/tokens";

/**
 * POST /api/auth/verificar/[token] — confirma el correo del self-signup (Fase 1
 * SaaS, Tanda 2). Es POST y NO GET a propósito: abrir el enlace del correo solo
 * MUESTRA la página con un botón "Confirmar"; la verificación ocurre al pulsarlo.
 * Con GET (como era antes) cualquier cosa que "previsualiza" el enlace —los
 * filtros de seguridad de correos de empresa, antivirus, vistas previas— lo
 * consumía antes que la persona, y al abrirlo ella veía "Enlace inválido" con
 * la cuenta ya verificada.
 *
 * ADR-011 Sprint 1 — el token ya NO vive en `User.tokenVerificacion` (texto
 * plano); se busca por hash en `TokenAuth`. No se borra al usarse (queda
 * `usadoEn`), igual que antes no se borraba `tokenVerificacion`: reabrir el
 * enlace debe mostrar "ya estaba verificado", no "inválido".
 */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const registro = await db.tokenAuth.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        id: true,
        userId: true,
        tipo: true,
        expiraEn: true,
        usadoEn: true,
        invalidadoEn: true,
        user: { select: { emailVerificado: true } },
      },
    });

    if (!registro || registro.tipo !== "VERIFY_EMAIL") {
      return NextResponse.json({ error: "Enlace de verificación inválido" }, { status: 404 });
    }
    if (registro.user.emailVerificado) {
      return NextResponse.json({ data: { yaVerificado: true } });
    }
    if (registro.usadoEn || registro.invalidadoEn || tokenExpirado(registro.expiraEn)) {
      return NextResponse.json({ error: "Este enlace venció. Pide que te reenvíen el correo de verificación." }, { status: 410 });
    }

    await db.$transaction([
      db.user.update({ where: { id: registro.userId }, data: { emailVerificado: new Date() } }),
      db.tokenAuth.update({ where: { id: registro.id }, data: { usadoEn: new Date() } }),
    ]);

    return NextResponse.json({ data: { yaVerificado: false } });
  } catch (error) {
    console.error("[POST /api/auth/verificar/[token]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
