import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Política de Tratamiento de Datos — GermIA" };

/**
 * Contenido legal — borrador redactado por IA (Fase 1 SaaS, Tanda 2),
 * explícitamente marcado como tal al final de la página y en este
 * comentario. NO es asesoría legal: debe revisarlo un abogado antes de
 * considerarse vinculante para producción real con usuarios de pago.
 *
 * Estructura basada en Ley 1581 de 2012 y Decreto 1377 de 2013 (Colombia) —
 * los derechos del titular listados abajo son los que exige el Art. 8 de la
 * Ley. La parte técnica ya existe (exportar/eliminar datos, ver
 * src/lib/cuenta-datos.ts) — esta página es la pieza de cara al usuario que
 * le faltaba, señalada en el diagnóstico SaaS.
 */
export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-page)] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] text-agro-600 hover:text-agro-800 mb-6">
          <ArrowLeft size={15} /> Volver
        </Link>

        <div className="card p-8">
          <h1 className="text-[22px] font-bold text-[var(--text-primary)] mb-1">Política de Tratamiento de Datos</h1>
          <p className="text-[12px] text-[var(--text-muted)] mb-6">
            Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Colombia) — última actualización:{" "}
            {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <div className="space-y-5 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">1. Responsable del tratamiento</h2>
              <p>CrecIAgro, operador de la plataforma GermIA, es responsable del tratamiento de tus datos personales. Contacto: contacto@creciagro.com.</p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">2. Qué datos recogemos</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Datos de contacto: nombre, correo, número de celular.</li>
                <li>Datos de tu finca: ubicación (municipio/coordenadas si las das), lotes, cultivos, fotos que subas para diagnóstico.</li>
                <li>Datos financieros que tú registras: gastos, ingresos, jornales, compradores.</li>
                <li>Ubicación GPS del navegador (solo con tu permiso explícito, para clima local en el modo Campesino).</li>
                <li>Datos de uso técnico: registros de auditoría de seguridad, dirección IP para prevención de fraude.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">3. Para qué los usamos</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Prestar el servicio: gestión de tu finca, cálculos financieros, alertas, diagnóstico por IA.</li>
                <li>Comunicarnos contigo: verificación de cuenta, recuperación de contraseña, avisos del servicio.</li>
                <li>Seguridad: prevenir accesos no autorizados y fraude.</li>
                <li>Mejorar la plataforma, de forma agregada y sin identificarte individualmente.</li>
              </ul>
              <p className="mt-2">Nunca vendemos tus datos personales a terceros.</p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">4. Con quién los compartimos</h2>
              <p>Solo con proveedores de infraestructura necesarios para operar el servicio, bajo sus propias políticas de seguridad:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><b>Groq</b> — procesa las fotos/texto que envías al Asistente IA para generar el diagnóstico o la respuesta.</li>
                <li><b>OpenWeatherMap</b> — recibe la ubicación de tu finca para traer el clima.</li>
                <li><b>Resend</b> — envía los correos de verificación de cuenta y recuperación de contraseña.</li>
                <li><b>Vercel y Neon</b> — alojan la aplicación y la base de datos.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">5. Tus derechos (Art. 8, Ley 1581 de 2012)</h2>
              <p>Como titular de tus datos, tienes derecho a:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Conocer, actualizar y rectificar tus datos personales.</li>
                <li>Solicitar prueba de la autorización otorgada para el tratamiento.</li>
                <li>Ser informado sobre el uso que se le ha dado a tus datos.</li>
                <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.</li>
                <li>Revocar la autorización y/o solicitar la supresión de tus datos, cuando no exista un deber legal u obligación contractual que lo impida.</li>
                <li>Acceder de forma gratuita a tus datos personales.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">6. Cómo ejercer estos derechos</h2>
              <p>
                Desde tu cuenta, en <b>Configuración</b>, puedes exportar todos tus datos o solicitar la eliminación de tu
                cuenta directamente. Si eres dueño de una organización con otros colaboradores, la eliminación queda como
                solicitud pendiente de revisión manual (para no borrar datos de terceros sin su consentimiento) — te
                contactaremos para resolverlo. Para cualquier otra solicitud sobre tus datos, escríbenos a
                contacto@creciagro.com.
              </p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">7. Seguridad</h2>
              <p>
                Tus contraseñas se almacenan cifradas (nunca en texto plano). Aplicamos límites de intentos de acceso,
                controles de autorización por organización, y mantenemos un registro de auditoría de acciones sensibles.
              </p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">8. Menores de edad</h2>
              <p>GermIA no está dirigido a menores de edad. No recogemos intencionalmente datos de menores de 18 años.</p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">9. Vigencia</h2>
              <p>
                Tus datos se conservan mientras tu cuenta esté activa. Si solicitas la eliminación de tu cuenta, se
                procesa conforme a lo descrito arriba, salvo la información que debamos conservar por obligación legal.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-5 border-t border-[var(--border-subtle)]">
            <p className="text-[11px] text-[var(--text-muted)]">
              Este documento es un borrador inicial redactado con apoyo de IA para la etapa piloto de GermIA. No constituye
              asesoría legal y debe ser revisado por un abogado antes de considerarse vinculante para uso comercial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
