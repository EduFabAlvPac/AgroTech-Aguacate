import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizacionColectivoSchema } from "@/lib/validations";
import { slugUnico } from "@/lib/organizacion";
import { registrarAuditoria } from "@/lib/audit";
import { verificarLimite, RateLimitError } from "@/lib/rate-limit";
import { crearOrganizacionColectivo, normalizarNit } from "@/lib/organizacion-colectivo";
import { ORG_ACTIVA_COOKIE } from "@/lib/organizacion-activa";

/**
 * POST /api/organizaciones/colectivo — una persona que YA tiene cuenta crea
 * una cooperativa (en trial) como SEGUNDA organización suya: queda como
 * ORG_OWNER de la nueva, conserva la(s) que ya tenía, y la nueva pasa a ser la
 * organización activa (esto es lo que hace aparecer el selector).
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await verificarLimite("registro", `org:${session.user.id}`);

    const parsed = organizacionColectivoSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    const { nombreOrganizacion, nit, celularContacto, ciudad, departamento } = parsed.data;

    if (await db.organizacion.findUnique({ where: { nit: normalizarNit(nit) }, select: { id: true } })) {
      return NextResponse.json({ error: "Ya hay una organización registrada con ese NIT" }, { status: 409 });
    }

    const slug = await slugUnico(nombreOrganizacion);
    const organizacion = await db.$transaction((tx) =>
      crearOrganizacionColectivo(
        tx,
        session.user.id,
        { nombreOrganizacion, nit, celularContacto, emailContacto: session.user.email!, ciudad, departamento },
        { slug, esRolPrimario: false } // conserva su organización primaria
      )
    );

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "organizacion.crear",
      detalle: { plan: "COLECTIVO", trial: true, via: "segunda_organizacion" },
      organizacionId: organizacion.id,
      recurso: "Organizacion",
      recursoId: organizacion.id,
    });

    (await cookies()).set(ORG_ACTIVA_COOKIE, organizacion.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ data: { organizacionId: organizacion.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya hay una organización registrada con ese NIT" }, { status: 409 });
    }
    console.error("[POST /api/organizaciones/colectivo]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
