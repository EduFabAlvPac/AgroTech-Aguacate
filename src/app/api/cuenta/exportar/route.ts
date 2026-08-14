import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exportarDatosUsuario } from "@/lib/cuenta-datos";

// GET /api/cuenta/exportar — derecho de acceso, Ley 1581 de 2012 (Colombia).
// Descarga en JSON todos los datos que el usuario creó/es dueño directo.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const datos = await exportarDatosUsuario(session.user.id);

    return new NextResponse(JSON.stringify(datos, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="agrotech-mis-datos-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/cuenta/exportar]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
