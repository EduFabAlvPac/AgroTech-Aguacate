import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { membresiaOwner } from "@/lib/equipo";
import { registrarAuditoria } from "@/lib/audit";
import { MODULOS_DASHBOARD, obtenerPlantillaModulos, type ModuloKey } from "@/lib/modulos";

function modulosValidos(modulos: unknown): ModuloKey[] | null {
  if (!Array.isArray(modulos)) return null;
  const claves = new Set(MODULOS_DASHBOARD.map((m) => m.key));
  return modulos.filter((m): m is ModuloKey => typeof m === "string" && claves.has(m as ModuloKey));
}

// GET /api/equipo/roles — plantilla de módulos por defecto por rol de la
// organización del dueño (ADMIN_FINCA/COLABORADOR — LECTURA no tiene flujo
// de creación desde el panel Equipo todavía, se deja lista para cuando lo
// tenga).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const propia = await membresiaOwner(session.user.id);
    if (!propia) return NextResponse.json({ error: "Solo el dueño de la organización puede ver esto" }, { status: 403 });

    const plantillas = await obtenerPlantillaModulos(propia.organizacionId);
    return NextResponse.json({ data: plantillas });
  } catch (error) {
    console.error("[GET /api/equipo/roles]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/equipo/roles — guarda la plantilla de un rol (ADMIN | OPERARIO).
// No afecta retroactivamente a personas ya invitadas con módulos
// personalizados (RolModulosDefault es independiente de FincaAcceso.modulos,
// que sigue siendo el valor real de cada persona una vez creada).
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const propia = await membresiaOwner(session.user.id);
    if (!propia) return NextResponse.json({ error: "Solo el dueño de la organización puede editar esto" }, { status: 403 });

    const body = await req.json();
    const { rol, modulos } = body;
    if (rol !== "ADMIN" && rol !== "OPERARIO" && rol !== "LECTURA") {
      return NextResponse.json({ error: "rol debe ser ADMIN, OPERARIO o LECTURA" }, { status: 400 });
    }
    const modulosFinal = modulosValidos(modulos);
    if (!modulosFinal) return NextResponse.json({ error: "modulos inválido" }, { status: 400 });

    await db.rolModulosDefault.upsert({
      where: { organizacionId_rol: { organizacionId: propia.organizacionId, rol } },
      create: { organizacionId: propia.organizacionId, rol, modulos: modulosFinal },
      update: { modulos: modulosFinal },
    });

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "equipo.editar_plantilla_rol",
      detalle: { rol, modulos: modulosFinal },
    });

    return NextResponse.json({ data: { updated: true } });
  } catch (error) {
    console.error("[PUT /api/equipo/roles]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
