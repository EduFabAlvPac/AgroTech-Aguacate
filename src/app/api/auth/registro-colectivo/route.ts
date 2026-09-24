import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { registroColectivoSchema } from "@/lib/validations";
import { slugUnico } from "@/lib/organizacion";
import { generarToken, expiraEnHoras, hashToken } from "@/lib/tokens";
import { enviarEmailVerificacion } from "@/lib/email";
import { verificarLimite, RateLimitError } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";
import { crearOrganizacionColectivo, normalizarNit } from "@/lib/organizacion-colectivo";

/**
 * POST /api/auth/registro-colectivo — registro público de una cooperativa
 * (ADR-011 §6.1). Igual que /api/auth/registro (persona nueva + verificación
 * de correo) pero la organización nace como COOPERATIVA en trial de 30 días
 * con la persona como ORG_OWNER. Sin sesión → Route Handler público con rate
 * limit por IP.
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ip-desconocida";
    await verificarLimite("registro", ip);

    const parsed = registroColectivoSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    const { nombre, email, password, nombreOrganizacion, nit, celularContacto, ciudad, departamento } = parsed.data;

    if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo. Inicia sesión y crea la cooperativa desde el menú de organizaciones." },
        { status: 409 }
      );
    }
    if (await db.organizacion.findUnique({ where: { nit: normalizarNit(nit) }, select: { id: true } })) {
      return NextResponse.json({ error: "Ya hay una organización registrada con ese NIT" }, { status: 409 });
    }

    const slug = await slugUnico(nombreOrganizacion);
    const hashed = await bcrypt.hash(password, 12);
    const tokenVerificacion = generarToken();

    const { user, organizacion } = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: nombre, email, password: hashed, role: "PRODUCER", terminosAceptadosEn: new Date() },
      });
      const organizacion = await crearOrganizacionColectivo(
        tx,
        user.id,
        { nombreOrganizacion, nit, celularContacto, emailContacto: email, ciudad, departamento },
        { slug, esRolPrimario: true }
      );
      await tx.tokenAuth.create({
        data: { userId: user.id, tipo: "VERIFY_EMAIL", tokenHash: hashToken(tokenVerificacion), expiraEn: expiraEnHoras(24) },
      });
      return { user, organizacion };
    });

    await registrarAuditoria({
      actorId: user.id,
      actorEmail: user.email,
      accion: "organizacion.crear",
      detalle: { plan: "COLECTIVO", trial: true, via: "registro" },
      organizacionId: organizacion.id,
      recurso: "Organizacion",
      recursoId: organizacion.id,
    });
    await enviarEmailVerificacion(user.email, user.name, tokenVerificacion);

    return NextResponse.json({ data: { email: user.email } }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: error.status });
    // Carrera entre la revisión previa del NIT/slug y el insert (índice único).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya hay una organización registrada con ese NIT" }, { status: 409 });
    }
    console.error("[POST /api/auth/registro-colectivo]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
