import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { puedeEliminarDeInmediato } from "@/lib/cuenta-datos";

// POST /api/cuenta/eliminar — derecho de supresión, Ley 1581 de 2012.
// Exige la contraseña actual (acción irreversible) — mismo patrón que el
// cambio de contraseña en /api/configuracion.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: "Confirma tu contraseña para continuar" }, { status: 400 });

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    const valida = user?.password ? await bcrypt.compare(password, user.password) : false;
    if (!valida) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 400 });

    const chequeo = await puedeEliminarDeInmediato(session.user.id);

    if (!chequeo.ok) {
      await db.user.update({
        where: { id: session.user.id },
        data: { eliminacionSolicitadaEn: new Date() },
      });
      return NextResponse.json({
        data: { eliminadaDeInmediato: false, mensaje: chequeo.motivo },
      });
    }

    // Cascade de Prisma limpia Finca/Lote/Cultivo/RegistroCultivo/Gasto/
    // Presupuesto/Comprador/Membresia/FincaAcceso/Inversionista/
    // ChatMessage/UsoIaDiario/UserPreferences/EnlaceCompartido — ver
    // onDelete: Cascade en prisma/schema.prisma. Seguro solo porque
    // puedeEliminarDeInmediato() ya confirmó que nadie más depende de estos
    // datos.
    await db.user.delete({ where: { id: session.user.id } });

    return NextResponse.json({ data: { eliminadaDeInmediato: true } });
  } catch (error) {
    console.error("[POST /api/cuenta/eliminar]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
