import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { aceptarInvitacionNuevoUsuarioSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { obtenerPlantillaModulos } from "@/lib/modulos";
import type { RolFinca } from "@prisma/client";

/**
 * POST /api/invitaciones/[token]/aceptar (ADR-011 Sprint 3) — acepta una
 * invitación. Dos caminos, según si ya existía una cuenta con el correo
 * invitado (la página /invitacion/[token] ya decide cuál mostrar, pero acá
 * se revalida todo desde cero — nunca confiar en lo que decidió el cliente):
 *
 *  - Cuenta nueva: crea User (emailVerificado de una vez — igual que
 *    agregarMiembro(), quien recibió el enlace en su correo ya demostró
 *    tener acceso a esa casilla) + Membresia + FincaAcceso, en una
 *    transacción. NO inicia sesión acá (todo login pasa por el signIn() de
 *    cliente, mismo criterio que el resto del proyecto) — responde éxito y
 *    el cliente manda a /login.
 *  - Cuenta existente: exige sesión activa con ESE correo (si no, 403 —
 *    nunca se agrega una Membresia a la fuerza a una cuenta sin que su
 *    dueño esté autenticado). Agrega Membresia + FincaAcceso a la cuenta ya
 *    existente.
 *
 * `Invitacion.rol` (FARM_ADMIN/FARM_COLLABORATOR) se reconstruye 1:1 a
 * rolFinca (ADMIN/OPERARIO) — sin ambigüedad porque invitarMiembroPorCorreo()
 * solo emite esos 2 roles (ver su comentario sobre por qué no ofrece LECTURA).
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const invitacion = await db.invitacion.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        id: true, organizacionId: true, emailOCelular: true, rol: true, fincaId: true,
        expiraEn: true, aceptadaEn: true, invitadaPorId: true,
      },
    });

    if (!invitacion) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }
    if (invitacion.aceptadaEn) {
      return NextResponse.json({ error: "Esta invitación ya fue aceptada" }, { status: 410 });
    }
    if (invitacion.expiraEn < new Date()) {
      return NextResponse.json({ error: "Esta invitación venció" }, { status: 410 });
    }

    const rolOrganizacion = invitacion.rol === "FARM_ADMIN" ? "ADMIN_FINCA" : "COLABORADOR";
    const rolFinca: RolFinca = invitacion.rol === "FARM_ADMIN" ? "ADMIN" : "OPERARIO";
    const modulosFinal = (await obtenerPlantillaModulos(invitacion.organizacionId))[rolFinca];

    const usuarioExistente = await db.user.findUnique({ where: { email: invitacion.emailOCelular }, select: { id: true } });

    let userId: string;

    if (usuarioExistente) {
      const session = await getServerSession(authOptions);
      if (session?.user?.email !== invitacion.emailOCelular) {
        return NextResponse.json(
          { error: `Ya existe una cuenta con ${invitacion.emailOCelular} — inicia sesión con ese correo para aceptar` },
          { status: 403 }
        );
      }
      userId = usuarioExistente.id;

      const yaEsMiembro = await db.membresia.findFirst({
        where: { userId, organizacionId: invitacion.organizacionId },
        select: { id: true },
      });
      if (yaEsMiembro) {
        // No es un error real — ya está adentro (ej. aceptó en otra
        // pestaña). Se marca la invitación igual y se responde éxito.
        await db.invitacion.update({ where: { id: invitacion.id }, data: { aceptadaEn: new Date() } });
        return NextResponse.json({ data: { ok: true, yaEraMiembro: true } });
      }
    } else {
      const body = await req.json().catch(() => ({}));
      const parsed = aceptarInvitacionNuevoUsuarioSchema.safeParse({ token, nombre: body.nombre, password: body.password });
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
      }
      const hashed = await bcrypt.hash(parsed.data.password, 12);
      const user = await db.user.create({
        data: {
          name: parsed.data.nombre,
          email: invitacion.emailOCelular,
          password: hashed,
          role: "ADVISOR",
          // Quien recibió el enlace en su correo ya demostró tener acceso a
          // esa casilla (mismo criterio que el fix de emailVerificado en
          // agregarMiembro(), PR de Equipo del Sprint 1).
          emailVerificado: new Date(),
        },
      });
      userId = user.id;
    }

    await db.$transaction([
      db.membresia.create({
        data: { userId, organizacionId: invitacion.organizacionId, rol: rolOrganizacion, invitadoPorId: invitacion.invitadaPorId },
      }),
      ...(invitacion.fincaId
        ? [
            db.fincaAcceso.upsert({
              where: { userId_fincaId: { userId, fincaId: invitacion.fincaId } },
              update: { rol: rolFinca, modulos: modulosFinal },
              create: { userId, fincaId: invitacion.fincaId, rol: rolFinca, modulos: modulosFinal },
            }),
          ]
        : []),
      db.invitacion.update({ where: { id: invitacion.id }, data: { aceptadaEn: new Date() } }),
    ]);

    await registrarAuditoria({
      actorId: userId,
      actorEmail: invitacion.emailOCelular,
      accion: "equipo.invitacion_aceptada",
      detalle: { invitacionId: invitacion.id, organizacionId: invitacion.organizacionId, rol: invitacion.rol },
    });

    return NextResponse.json({ data: { ok: true, yaEraMiembro: false } });
  } catch (error) {
    console.error("[POST /api/invitaciones/[token]/aceptar]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
