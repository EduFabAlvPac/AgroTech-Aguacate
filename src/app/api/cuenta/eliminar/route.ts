import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { puedeEliminarDeInmediato } from "@/lib/cuenta-datos";
import { registrarAuditoria } from "@/lib/audit";

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
      await registrarAuditoria({
        actorId: session.user.id,
        actorEmail: user?.email,
        accion: "cuenta.solicitar_eliminacion",
        detalle: { motivo: chequeo.motivo },
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
    // Se registra ANTES del delete (aunque AuditLog no tiene FK a User, así
    // el registro no depende de que la transacción de borrado haya
    // terminado bien para dejar rastro del intento).
    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: user?.email,
      accion: "cuenta.eliminar",
    });

    await db.user.delete({ where: { id: session.user.id } });

    return NextResponse.json({ data: { eliminadaDeInmediato: true } });
  } catch (error) {
    console.error("[POST /api/cuenta/eliminar]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
