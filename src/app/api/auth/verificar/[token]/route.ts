import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokenExpirado } from "@/lib/tokens";

/**
 * GET /api/auth/verificar/[token] — confirma el correo del self-signup
 * (Fase 1 SaaS, Tanda 2). Llamada desde la página /verificar/[token]
 * (Server Component) al renderizar, no navegada directo por el usuario —
 * por eso responde JSON en vez de redirigir: la página decide qué mostrar
 * (éxito / expirado / inválido) con el resultado.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
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
      // Ya verificado (el usuario hizo doble clic, o volvió a abrir el
      // enlace) — no es un error, es idempotente.
      return NextResponse.json({ data: { yaVerificado: true } });
    }
    if (tokenExpirado(user.tokenVerificacionExpira)) {
      return NextResponse.json({ error: "Este enlace venció. Pide que te reenvíen el correo de verificación." }, { status: 410 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { emailVerificado: new Date(), tokenVerificacion: null, tokenVerificacionExpira: null },
    });

    return NextResponse.json({ data: { yaVerificado: false } });
  } catch (error) {
    console.error("[GET /api/auth/verificar/[token]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
