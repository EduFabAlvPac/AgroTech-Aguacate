import { Resend } from "resend";

/**
 * Envío de correo transaccional (Fase 1 SaaS, Tanda 2) — Resend, con el
 * mismo criterio de "no bloquear el entorno sin la credencial" ya usado en
 * rate-limit.ts: sin RESEND_API_KEY, en vez de fallar se loguea el enlace a
 * consola — así el flujo de registro/recuperación se puede probar en dev
 * (o incluso en producción antes de configurar la key) leyendo el log, sin
 * depender de que la cuenta de Resend ya exista.
 *
 * Dominio propio `creciagro.com` verificado en Resend (2026-09-17) — el
 * remitente ya no es el sandbox (`onboarding@resend.dev`, que solo entrega
 * a la casilla de la propia cuenta de Resend); ahora entrega a cualquier
 * destinatario real. Si en el futuro `creciagro.com` pierde su
 * verificación en Resend (DNS movido de proveedor, etc.), los envíos
 * volverían a fallar en silencio — revisar Resend → Domains si un usuario
 * reporta que nunca le llegó nada.
 */

const FROM = "GermIA <notificaciones@creciagro.com>";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function enviar(to: string, subject: string, html: string, logContext: string): Promise<void> {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY no configurada — no se envió "${subject}" a ${to}. Contenido:\n${html}`
    );
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    // No relanzar — un correo que no salió no debe tumbar el registro/reset
    // en sí (la cuenta/token ya quedaron creados correctamente); se loguea
    // para poder darle seguimiento manual si un usuario reporta que nunca
    // le llegó nada.
    console.error(`[email] Falló el envío de "${logContext}" a ${to}:`, error);
  }
}

export async function enviarEmailVerificacion(email: string, nombre: string | null, token: string): Promise<void> {
  const enlace = `${baseUrl()}/verificar/${token}`;
  await enviar(
    email,
    "Verifica tu correo — GermIA",
    `<p>Hola ${nombre ?? ""},</p>
     <p>Gracias por registrarte en GermIA. Confirma tu correo para activar tu cuenta:</p>
     <p><a href="${enlace}">${enlace}</a></p>
     <p>Este enlace vence en 24 horas. Si no creaste esta cuenta, ignora este correo.</p>`,
    "verificación de correo"
  );
}

export async function enviarEmailResetPassword(email: string, nombre: string | null, token: string): Promise<void> {
  const enlace = `${baseUrl()}/restablecer/${token}`;
  await enviar(
    email,
    "Recupera tu contraseña — GermIA",
    `<p>Hola ${nombre ?? ""},</p>
     <p>Pediste restablecer tu contraseña en GermIA. Crea una nueva aquí:</p>
     <p><a href="${enlace}">${enlace}</a></p>
     <p>Este enlace vence en 1 hora. Si no pediste esto, ignora este correo — tu contraseña actual sigue funcionando.</p>`,
    "recuperación de contraseña"
  );
}

// ADR-011 Sprint 3 — invitaciones por correo (reemplaza, como opción nueva,
// el flujo de "el dueño escribe una contraseña temporal y la comparte por
// WhatsApp"; ver invitacion-actions.ts).
export async function enviarEmailInvitacion(
  email: string,
  organizacionNombre: string,
  rolLabel: string,
  token: string,
  mensajePersonal?: string
): Promise<void> {
  const enlace = `${baseUrl()}/invitacion/${token}`;
  await enviar(
    email,
    `${organizacionNombre} te invita a GermIA`,
    `<p>Hola,</p>
     <p><strong>${organizacionNombre}</strong> te invita a unirte a GermIA como <strong>${rolLabel}</strong>.</p>
     ${mensajePersonal ? `<p>"${mensajePersonal}"</p>` : ""}
     <p>Acepta la invitación aquí:</p>
     <p><a href="${enlace}">${enlace}</a></p>
     <p>Este enlace vence en 72 horas. Si no esperabas esta invitación, puedes ignorar este correo.</p>`,
    "invitación a organización"
  );
}

// Cierra el círculo de la invitación por correo — deliberadamente NO manda
// contraseñas ni credenciales (eso es justo lo que esta invitación evita
// respecto al flujo de "Crear cuenta" con contraseña temporal, ver
// invitacion-actions.ts): solo confirma que la cuenta ya está activa, la
// persona ya sabe su contraseña porque la escribió ella misma.
export async function enviarEmailInvitacionAceptada(email: string, nombre: string | null, organizacionNombre: string): Promise<void> {
  const enlace = `${baseUrl()}/login`;
  await enviar(
    email,
    `Tu cuenta en GermIA ya está activa`,
    `<p>Hola ${nombre ?? ""},</p>
     <p>Tu cuenta quedó activa — ya eres parte de <strong>${organizacionNombre}</strong> en GermIA.</p>
     <p><a href="${enlace}">${enlace}</a></p>`,
    "confirmación de invitación aceptada"
  );
}

// Al dueño que invitó — hoy no tenía forma de saber si/cuándo alguien
// aceptó su invitación sin entrar manualmente a Equipo a revisar.
export async function enviarEmailInvitacionAceptadaAlDueno(
  emailDueno: string,
  nombreInvitado: string | null,
  emailInvitado: string,
  organizacionNombre: string
): Promise<void> {
  const enlace = `${baseUrl()}/dashboard/equipo`;
  await enviar(
    emailDueno,
    `${nombreInvitado ?? emailInvitado} aceptó tu invitación`,
    `<p>Hola,</p>
     <p><strong>${nombreInvitado ?? emailInvitado}</strong> (${emailInvitado}) aceptó tu invitación y ya es parte de
     <strong>${organizacionNombre}</strong> en GermIA.</p>
     <p><a href="${enlace}">${enlace}</a></p>`,
    "notificación de invitación aceptada (dueño)"
  );
}

/** Aviso de vencimiento del trial de una organización Colectivo (ADR-011 §9:
 * 7, 3 y 1 días antes, y el día que vence). `dias` = días que quedan (0 = hoy). */
export async function enviarEmailTrialPorVencer(email: string, nombre: string | null, organizacionNombre: string, dias: number): Promise<void> {
  const enlace = `${baseUrl()}/dashboard/configuracion?tab=organizacion`;
  const asunto =
    dias <= 0
      ? `La prueba de ${organizacionNombre} terminó — GermIA`
      : `La prueba de ${organizacionNombre} termina en ${dias} ${dias === 1 ? "día" : "días"} — GermIA`;
  const cuerpo =
    dias <= 0
      ? `<p>La prueba gratuita de <strong>${organizacionNombre}</strong> terminó. Tu organización quedó en <strong>modo lectura</strong>: puedes seguir viendo toda tu información, pero no agregar ni editar. Tus datos se conservan.</p>
         <p>Para seguir trabajando, escríbenos y activamos el plan Colectivo.</p>`
      : `<p>La prueba gratuita de <strong>${organizacionNombre}</strong> termina en <strong>${dias} ${dias === 1 ? "día" : "días"}</strong>. Al terminar, la organización pasa a <strong>modo lectura</strong> (verás todo, sin poder agregar ni editar).</p>
         <p>Para continuar sin interrupciones, escríbenos y activamos el plan Colectivo.</p>`;
  await enviar(
    email,
    asunto,
    `<p>Hola ${nombre ?? ""},</p>${cuerpo}<p><a href="${enlace}">Ver el estado de mi plan</a></p>`,
    `aviso de trial (${dias} días)`
  );
}
