import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerIp, obtenerUserAgent } from "@/lib/auth";
import { verificarLimite, RateLimitError, MENSAJE_RATE_LIMIT } from "@/lib/rate-limit";
import { normalizarTelefono } from "@/lib/telefono";
import { vincularCampesinoSchema } from "@/lib/validations";
import { generarToken, hashToken } from "@/lib/tokens";
import { registrarAuditoria } from "@/lib/audit";
import { membresiaOwner } from "@/lib/equipo";
import {
  COOKIE_DISPOSITIVO,
  DISPOSITIVO_VIGENCIA_DIAS,
  MAX_INTENTOS,
  hashCodigoVinculacion,
  codigoCoincide,
} from "@/lib/campesino-vinculacion";

/**
 * POST /api/campesino/vincular — canjea el código de vinculación que generó
 * el dueño y deja el celular como "dispositivo de confianza". Público (el
 * campesino todavía no tiene sesión), así que TODO se revalida acá.
 *
 * Es un Route Handler propio, y no parte de authorize() de NextAuth, porque
 * necesita FIJAR una cookie (germia_dispositivo, httpOnly) y authorize() solo
 * puede leerlas. Después de esta respuesta el cliente llama
 * signIn("telefono-campesino", { telefono }) y authorize() reconoce el
 * dispositivo por esa cookie.
 *
 * Toda falla responde el MISMO mensaje genérico (número inexistente, código
 * vencido, usado, incorrecto o con demasiados intentos): nunca revelar qué
 * celulares existen ni en qué estado está su código.
 */
const MENSAJE_GENERICO = "Revisa tu número y el código. Si sigue sin funcionar, pídele uno nuevo a tu asesor.";
const falla = () => NextResponse.json({ error: MENSAJE_GENERICO }, { status: 400 });

export async function POST(req: Request) {
  try {
    const parsed = vincularCampesinoSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return falla();
    const { telefono, codigo } = parsed.data;

    const telefonoNormalizado = normalizarTelefono(telefono);
    await verificarLimite("vincularCodigo", `${obtenerIp(req.headers)}:${telefonoNormalizado}`);

    const user = await db.user.findUnique({
      where: { telefono: telefonoNormalizado },
      select: { id: true, name: true, experiencia: true, creadoPorId: true },
    });
    if (!user || user.experiencia !== "CAMPESINO") return falla();

    // El código vigente más reciente — generarCodigoVinculacion (Equipo)
    // invalida los anteriores, así que normalmente hay uno solo.
    const vigente = await db.codigoVinculacion.findFirst({
      where: { userId: user.id, usadoEn: null, invalidadoEn: null, expiraEn: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!vigente || vigente.intentosFallidos >= MAX_INTENTOS) return falla();

    if (!codigoCoincide(vigente.codigoHash, hashCodigoVinculacion(user.id, codigo))) {
      // Tope por código: a los MAX_INTENTOS fallos queda invalidado y el
      // dueño tiene que generar otro — la defensa real contra fuerza bruta
      // de un código de solo 6 dígitos.
      const intentos = vigente.intentosFallidos + 1;
      await db.codigoVinculacion.update({
        where: { id: vigente.id },
        data: { intentosFallidos: intentos, invalidadoEn: intentos >= MAX_INTENTOS ? new Date() : null },
      });
      return falla();
    }

    // Consumo atómico: si dos peticiones canjean el mismo código a la vez,
    // solo una ve count === 1.
    const consumido = await db.codigoVinculacion.updateMany({
      where: { id: vigente.id, usadoEn: null, invalidadoEn: null },
      data: { usadoEn: new Date() },
    });
    if (consumido.count !== 1) return falla();

    const token = generarToken();
    await db.dispositivoConfianza.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        userAgent: obtenerUserAgent(req.headers) ?? null,
        ipAddress: obtenerIp(req.headers),
        expiraEn: new Date(Date.now() + DISPOSITIVO_VIGENCIA_DIAS * 24 * 60 * 60 * 1000),
      },
    });

    const owner = user.creadoPorId ? await membresiaOwner(user.creadoPorId) : null;
    await registrarAuditoria({
      actorId: user.id,
      actorEmail: null,
      accion: "campesino.vincular_dispositivo",
      detalle: { nombre: user.name },
      organizacionId: owner?.organizacionId,
      recurso: "User",
      recursoId: user.id,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_DISPOSITIVO, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DISPOSITIVO_VIGENCIA_DIAS * 24 * 60 * 60,
    });
    return res;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: MENSAJE_RATE_LIMIT }, { status: 429 });
    }
    console.error("[POST /api/campesino/vincular]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
