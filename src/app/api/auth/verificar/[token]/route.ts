import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokenExpirado } from "@/lib/tokens";

/**
 * POST /api/auth/verificar/[token] — confirma el correo del self-signup (Fase 1
 * SaaS, Tanda 2). Es POST y NO GET a propósito: abrir el enlace del correo solo
 * MUESTRA la página con un botón "Confirmar"; la verificación ocurre al pulsarlo.
 * Con GET (como era antes) cualquier cosa que "previsualiza" el enlace —los
 * filtros de seguridad de correos de empresa, antivirus, vistas previas— lo
 * consumía antes que la persona, y al abrirlo ella veía "Enlace inválido" con
 * la cuenta ya verificada.
 *
 * El token NO se borra al verificar: así volver a abrir el enlace muestra "ya
 * estaba verificado" en vez de "inválido". No otorga nada más que ese aviso
 * (verificar un correo ya verificado es idempotente).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const user = await db.user.findUnique({
      where: { tokenVerificacion: token },
      select: { id: true, tokenVerificacionExpira: true, emailVerificado: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Enlace de verificación inválido" }, { status: 404 });
    }
    if (user.emailVerificado) {
      return NextResponse.json({ data: { yaVerificado: true } });
    }
    if (tokenExpirado(user.tokenVerificacionExpira)) {
      return NextResponse.json({ error: "Este enlace venció. Pide que te reenvíen el correo de verificación." }, { status: 410 });
    }

    await db.user.update({ where: { id: user.id }, data: { emailVerificado: new Date() } });

    return NextResponse.json({ data: { yaVerificado: false } });
  } catch (error) {
    console.error("[POST /api/auth/verificar/[token]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
