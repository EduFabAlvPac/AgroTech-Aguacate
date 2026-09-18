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
