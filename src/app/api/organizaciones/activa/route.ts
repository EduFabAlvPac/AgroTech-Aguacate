import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORG_ACTIVA_COOKIE } from "@/lib/organizacion-activa";

// POST /api/organizaciones/activa — cambiar la organización activa (selector
// del sidebar). Espejo de /api/fincas/activa.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { organizacionId } = await req.json().catch(() => ({}));
    if (!organizacionId || typeof organizacionId !== "string") {
      return NextResponse.json({ error: "organizacionId es requerido" }, { status: 400 });
    }

    // Nunca confiar en un id que mande el cliente: debe ser una organización
    // de la que la persona es miembro aceptado y activo.
    const membresia = await db.membresia.findFirst({
      where: { userId: session.user.id, organizacionId, aceptada: true, activa: true },
      select: { id: true },
    });
    if (!membresia) return NextResponse.json({ error: "No perteneces a esa organización" }, { status: 403 });

    const cookieStore = await cookies();
    cookieStore.set(ORG_ACTIVA_COOKIE, organizacionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 año
    });

    return NextResponse.json({ data: { organizacionId } });
  } catch (error) {
    console.error("[POST /api/organizaciones/activa]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
