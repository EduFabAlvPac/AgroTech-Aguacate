import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODULOS_DASHBOARD, modulosPorDefecto, type ModuloKey } from "@/lib/modulos";
import { membresiaOwner } from "@/lib/equipo";

/**
 * Gestión de equipo (Fase 2) — ver CLAUDE.md §2.3 y docs/REQUERIMIENTOS.md §6.3.
 * Solo el OWNER de una organización puede invitar/remover miembros (matriz de
 * roles, src/lib/authz.ts). Sin servicio de email configurado: el dueño crea
 * la cuenta del colaborador directamente (nombre/email/contraseña temporal) y
 * le comparte las credenciales por fuera de la app (WhatsApp/verbal) — mismo
 * patrón que ya usa el resto de la app en el contexto rural colombiano.
 */

function modulosValidos(modulos: unknown): ModuloKey[] | null {
  if (!Array.isArray(modulos)) return null;
  const claves = new Set(MODULOS_DASHBOARD.map((m) => m.key));
  return modulos.filter((m): m is ModuloKey => typeof m === "string" && claves.has(m as ModuloKey));
}

// GET /api/equipo — lista los miembros de la organización del usuario (dueño)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const propia = await membresiaOwner(session.user.id);
    if (!propia) return NextResponse.json({ error: "Solo el dueño de la organización puede ver el equipo" }, { status: 403 });

    const miembros = await db.membresia.findMany({
      where: { organizacionId: propia.organizacionId, rol: { not: "OWNER" } },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // FincaAcceso de cada miembro, dentro de las fincas de esta organización.
    const fincas = await db.finca.findMany({ where: { organizacionId: propia.organizacionId }, select: { id: true, nombre: true } });
    const fincaIds = fincas.map((f) => f.id);
    const accesos = await db.fincaAcceso.findMany({
      where: { fincaId: { in: fincaIds }, userId: { in: miembros.map((m) => m.userId) } },
      select: { userId: true, fincaId: true, rol: true, modulos: true },
    });

    const data = miembros.map((m) => ({
      id: m.id,
      nombre: m.user.name,
      email: m.user.email,
      rol: m.rol,
      activa: m.activa,
      fincas: accesos
        .filter((a) => a.userId === m.userId)
        .map((a) => ({ fincaId: a.fincaId, nombre: fincas.find((f) => f.id === a.fincaId)?.nombre ?? "?", rol: a.rol, modulos: a.modulos })),
    }));

    return NextResponse.json({ data, meta: { fincas, modulos: MODULOS_DASHBOARD } });
  } catch (error) {
    console.error("[GET /api/equipo]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/equipo — agregar un colaborador/administrador de finca
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const propia = await membresiaOwner(session.user.id);
    if (!propia) return NextResponse.json({ error: "Solo el dueño de la organización puede agregar colaboradores" }, { status: 403 });

    const body = await req.json();
    const { nombre, email, password, rol, fincaId, modulos } = body;

    if (!email || !rol || !fincaId) {
      return NextResponse.json({ error: "email, rol y fincaId son requeridos" }, { status: 400 });
    }
    if (rol !== "ADMIN_FINCA" && rol !== "COLABORADOR") {
      return NextResponse.json({ error: "rol debe ser ADMIN_FINCA o COLABORADOR" }, { status: 400 });
    }

    const finca = await db.finca.findFirst({ where: { id: fincaId, organizacionId: propia.organizacionId } });
    if (!finca) return NextResponse.json({ error: "Finca no encontrada en tu organización" }, { status: 404 });

    let user = await db.user.findUnique({ where: { email } });

    if (user) {
      const yaEsMiembro = await db.membresia.findUnique({
        where: { userId_organizacionId: { userId: user.id, organizacionId: propia.organizacionId } },
      });
      if (yaEsMiembro) {
        return NextResponse.json({ error: "Este correo ya es miembro de tu organización" }, { status: 409 });
      }
    } else {
      if (!nombre || !password) {
        return NextResponse.json(
          { error: "nombre y contraseña son requeridos para crear la cuenta del colaborador" },
          { status: 400 }
        );
      }
      if (password.length < 8) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
      }
      const hashed = await bcrypt.hash(password, 12);
      user = await db.user.create({
        data: { name: nombre, email, password: hashed, role: "ADVISOR" },
      });
    }

    const fincaRol = rol === "ADMIN_FINCA" ? "ADMIN" : "OPERARIO";
    const modulosFinal = modulosValidos(modulos) ?? modulosPorDefecto(fincaRol);

    const [membresia] = await db.$transaction([
      db.membresia.create({
        data: { userId: user.id, organizacionId: propia.organizacionId, rol, invitadoPorId: session.user.id },
      }),
      db.fincaAcceso.upsert({
        where: { userId_fincaId: { userId: user.id, fincaId } },
        update: { rol: fincaRol, modulos: modulosFinal },
        create: { userId: user.id, fincaId, rol: fincaRol, modulos: modulosFinal, creadoPorId: session.user.id },
      }),
    ]);

    return NextResponse.json(
      { data: { id: membresia.id, nombre: user.name, email: user.email, rol: membresia.rol } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/equipo]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
