import { NextResponse } from "next/server";
import { getPortalData } from "@/lib/portal";

/**
 * GET /api/public/portal/[token] — endpoint PÚBLICO, sin sesión. Sirve el
 * Portal de Compradores (Fase 4). Toda la lógica de qué campos se exponen
 * vive en src/lib/portal.ts (compartida con la página /portal/[token]) —
 * ver el comentario de seguridad ahí.
 *
 * Token inválido, revocado o expirado devuelven el mismo 404 genérico — no
 * se distingue el motivo, para no dar pistas a quien esté probando tokens
 * al azar (ver .kiro/skills/architecture/agrotech-ciberseguridad).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const data = await getPortalData(token);
    if (!data) return NextResponse.json({ error: "Enlace no encontrado o expirado" }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/public/portal/[token]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
