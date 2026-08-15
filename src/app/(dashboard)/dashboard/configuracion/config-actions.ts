"use server";

/**
 * Server Actions — Configuración (Fase 1, ADR-006). Misma lógica exacta
 * que ya tenían /api/configuracion (PUT), /api/cuenta/exportar (GET) y
 * /api/cuenta/eliminar (POST) — incluyendo el cambio de contraseña con
 * bcrypt y el derecho de acceso/supresión Ley 1581 de 2012. Las rutas API
 * se mantienen, esto es una segunda entrada.
 *
 * Qué revalida:
 * - actualizarPerfil → revalidatePath("/dashboard/configuracion"), "/dashboard" (nombre en el header)
 * - actualizarFinca → revalidatePath("/dashboard/configuracion"), "/dashboard" (nombre de finca en KPIs/sidebar)
 * - actualizarAlertas → revalidatePath("/dashboard/configuracion")
 * - actualizarVistaPreferida (Fase 3) → revalidatePath("/dashboard", "layout"),
 *   no un path puntual — cambia qué conjunto de componentes (completo/simple)
 *   renderiza CADA ruta bajo (dashboard), no solo la página de configuración
 *   o perfil donde se tocó el switch.
 * - exportarMisDatos → no revalida (solo lectura)
 * - eliminarCuenta → no revalida (la sesión termina; signOut() del lado
 *   del cliente redirige a /login)
 */
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { exportarDatosUsuario, puedeEliminarDeInmediato } from "@/lib/cuenta-datos";
import { registrarAuditoria } from "@/lib/audit";
import type { VistaPreferida } from "@prisma/client";

export interface ConfigActionState {
  error?: string;
  ok?: boolean;
}

export async function actualizarPerfil(_prev: ConfigActionState, formData: FormData): Promise<ConfigActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const name = (formData.get("name") as string) || undefined;
    const telefono = (formData.get("telefono") as string) || undefined;
    const currentPassword = (formData.get("currentPassword") as string) || undefined;
    const newPassword = (formData.get("newPassword") as string) || undefined;

    const updates: { name?: string; telefono?: string; password?: string } = { name, telefono };

    if (newPassword && currentPassword) {
      const user = await db.user.findUnique({ where: { id: session.user.id } });
      const valid = user?.password ? await bcrypt.compare(currentPassword, user.password) : false;
      if (!valid) return { error: "Contraseña actual incorrecta" };
      updates.password = await bcrypt.hash(newPassword, 12);
    }

    await db.user.update({ where: { id: session.user.id }, data: updates });
    revalidatePath("/dashboard/configuracion");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[actualizarPerfil]", error);
    return { error: "Error al guardar" };
  }
}

/**
 * Fase 3 de ADR-006 — cambia qué conjunto de componentes (Fase 1 modo
 * completo, o Fase 2 modo simple) renderizan las rutas reales para este
 * usuario. Separada de actualizarPerfil a propósito, no una extensión de
 * su FormData: se dispara con un solo click en un switch de 3 posiciones
 * (Simple/Completa/Automático), no con el submit de un formulario — mismo
 * criterio ya aplicado en cambiarEtapaCultivo/marcarLeida (llamada directa
 * dentro de startTransition desde el componente, sin useActionState). Y
 * necesita una revalidación de alcance distinto (todo el árbol de rutas,
 * no solo /dashboard/configuracion) — mezclarla con actualizarPerfil
 * habría forzado esa revalidación amplia en cada guardado de nombre/
 * teléfono también, sin necesidad.
 */
export async function actualizarVistaPreferida(
  vista: VistaPreferida,
  _prev: ConfigActionState
): Promise<ConfigActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    await db.user.update({ where: { id: session.user.id }, data: { vistaPreferida: vista } });
    // "layout" (no el default "page") invalida todo el subárbol de
    // (dashboard) en una sola llamada — el cambio afecta a todas las rutas
    // que bifurcan entre modo completo/simple, no a una página puntual.
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    console.error("[actualizarVistaPreferida]", error);
    return { error: "Error al guardar la preferencia" };
  }
}

export async function actualizarFinca(_prev: ConfigActionState, formData: FormData): Promise<ConfigActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    // Edita la finca activa (funcionalidad de fincas) — no "la primera
    // finca del usuario" literal.
    const { fincaActivaId } = await resolverFincaActiva(session);
    if (!fincaActivaId) return { error: "Finca no encontrada" };
    await requireAccess(session, "finca", "update", { fincaId: fincaActivaId });

    const lat = formData.get("lat") as string;
    const lng = formData.get("lng") as string;
    const areaTotal = formData.get("areaTotal") as string;

    await db.finca.update({
      where: { id: fincaActivaId },
      data: {
        nombre: (formData.get("nombre") as string) || undefined,
        municipio: (formData.get("municipio") as string) || undefined,
        departamento: (formData.get("departamento") as string) || undefined,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        areaTotal: areaTotal ? Number(areaTotal) : undefined,
      },
    });

    revalidatePath("/dashboard/configuracion");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[actualizarFinca]", error);
    return { error: "Error al guardar" };
  }
}

export async function actualizarAlertas(_prev: ConfigActionState, formData: FormData): Promise<ConfigActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const data = {
      tempMinAlert: Number(formData.get("tempMinAlert") ?? 12),
      tempMaxAlert: Number(formData.get("tempMaxAlert") ?? 32),
      rainAlertMm: Number(formData.get("rainAlertMm") ?? 30),
      windAlertKmh: Number(formData.get("windAlertKmh") ?? 40),
      droughtDays: Number(formData.get("droughtDays") ?? 5),
      emailAlerts: formData.get("emailAlerts") === "true",
      pushAlerts: formData.get("pushAlerts") === "true",
    };

    await db.userPreferences.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    });

    revalidatePath("/dashboard/configuracion");
    return { ok: true };
  } catch (error) {
    console.error("[actualizarAlertas]", error);
    return { error: "Error al guardar" };
  }
}

export interface ExportarState {
  error?: string;
  json?: string;
  filename?: string;
}

/** Derecho de acceso, Ley 1581 de 2012 — descarga en JSON todo lo que el
 * usuario creó/es dueño directo. Devuelve el JSON como string (en vez de
 * una Response con Content-Disposition, que una Server Action no puede
 * emitir) — el cliente arma el Blob y dispara la descarga igual que antes. */
export async function exportarMisDatos(): Promise<ExportarState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const datos = await exportarDatosUsuario(session.user.id);
    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "cuenta.exportar",
    });

    return {
      json: JSON.stringify(datos, null, 2),
      filename: `agrotech-mis-datos-${new Date().toISOString().slice(0, 10)}.json`,
    };
  } catch (error) {
    console.error("[exportarMisDatos]", error);
    return { error: "Error interno" };
  }
}

export interface EliminarCuentaState {
  error?: string;
  eliminadaDeInmediato?: boolean;
  mensaje?: string;
}

/** Derecho de supresión, Ley 1581 de 2012 — exige la contraseña actual
 * (acción irreversible). Mismo cascade de Prisma / chequeo previo
 * (puedeEliminarDeInmediato) que ya tenía la ruta API. */
export async function eliminarCuenta(_prev: EliminarCuentaState, formData: FormData): Promise<EliminarCuentaState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const password = formData.get("password") as string;
    if (!password) return { error: "Confirma tu contraseña para continuar" };

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    const valida = user?.password ? await bcrypt.compare(password, user.password) : false;
    if (!valida) return { error: "Contraseña incorrecta" };

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
      return { eliminadaDeInmediato: false, mensaje: chequeo.motivo };
    }

    // Cascade de Prisma limpia Finca/Lote/Cultivo/RegistroCultivo/Gasto/
    // Presupuesto/Comprador/Membresia/FincaAcceso/Inversionista/
    // ChatMessage/UsoIaDiario/UserPreferences/EnlaceCompartido — ver
    // onDelete: Cascade en prisma/schema.prisma. Seguro solo porque
    // puedeEliminarDeInmediato() ya confirmó que nadie más depende de estos
    // datos.
    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: user?.email,
      accion: "cuenta.eliminar",
    });

    await db.user.delete({ where: { id: session.user.id } });
    return { eliminadaDeInmediato: true };
  } catch (error) {
    console.error("[eliminarCuenta]", error);
    return { error: "Error interno" };
  }
}
