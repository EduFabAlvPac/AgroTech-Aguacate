import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fincaIdsAccesibles } from "@/lib/db/scoped";
import { FINCA_ACTIVA_COOKIE } from "@/lib/finca-activa";

// POST /api/fincas/activa — cambiar la finca activa (selector del sidebar)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { fincaId } = await req.json();
    if (!fincaId) return NextResponse.json({ error: "fincaId es requerido" }, { status: 400 });

    // Nunca confiar en un fincaId que el cliente mande sin verificar que el
    // usuario realmente tiene acceso — mismo criterio que el resto de RBAC.
    const fincaIds = await fincaIdsAccesibles(session);
    if (fincaIds !== "ALL" && !fincaIds.includes(fincaId)) {
      return NextResponse.json({ error: "No tienes acceso a esa finca" }, { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set(FINCA_ACTIVA_COOKIE, fincaId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 año
    });

    return NextResponse.json({ data: { fincaId } });
  } catch (error) {
    console.error("[POST /api/fincas/activa]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
