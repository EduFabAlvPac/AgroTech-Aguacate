import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Términos de Servicio — GermIA" };

/**
 * Contenido legal — borrador redactado por IA (Fase 1 SaaS, Tanda 2),
 * explícitamente marcado como tal al final de la página y en este
 * comentario. NO es asesoría legal: debe revisarlo un abogado antes de
 * considerarse vinculante para producción real con usuarios de pago.
 */
export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-page)] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] text-agro-600 hover:text-agro-800 mb-6">
          <ArrowLeft size={15} /> Volver
        </Link>

        <div className="card p-8">
          <h1 className="text-[22px] font-bold text-[var(--text-primary)] mb-1">Términos de Servicio</h1>
          <p className="text-[12px] text-[var(--text-muted)] mb-6">Última actualización: {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</p>

          <div className="space-y-5 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">1. Quiénes somos</h2>
              <p>
                GermIA es una plataforma de gestión agrícola desarrollada por CrecIAgro, operada desde Colombia, dirigida a
                productores de aguacate, café, cacao y cítricos. Al crear una cuenta o usar cualquier funcionalidad de GermIA,
                aceptas estos Términos de Servicio.
              </p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">2. Qué ofrece GermIA</h2>
              <p>
                GermIA permite registrar y gestionar fincas, lotes y cultivos; llevar control financiero (gastos, ingresos,
                presupuesto); recibir alertas climáticas y de manejo agronómico; y usar un asistente de inteligencia
                artificial para diagnóstico de plagas/enfermedades por imagen y asesoría conversacional.
              </p>
              <p className="mt-2">
                <b>El diagnóstico y las recomendaciones generadas por IA son orientativas, no reemplazan la visita ni el
                criterio de un agrónomo o técnico agrícola certificado.</b> GermIA no se hace responsable de decisiones de
                manejo, inversión o tratamiento tomadas exclusivamente con base en esas recomendaciones.
              </p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">3. Tu cuenta</h2>
              <p>
                Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra bajo tu
                cuenta. Debes darnos información veraz al registrarte. Si sospechas un uso no autorizado de tu cuenta,
                avísanos de inmediato.
              </p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">4. Uso aceptable</h2>
              <p>
                No puedes usar GermIA para actividades ilegales, intentar acceder a datos de otras organizaciones sin
                autorización, sobrecargar deliberadamente el servicio, ni revender el acceso a la plataforma sin nuestro
                consentimiento escrito.
              </p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">5. Tus datos</h2>
              <p>
                Los datos de tu finca, cultivos, registros financieros y fotos que subas son tuyos. Puedes exportarlos o
                pedir la eliminación de tu cuenta en cualquier momento desde Configuración — ver también nuestra{" "}
                <Link href="/privacidad" className="text-agro-600 hover:text-agro-800 underline">
                  Política de Tratamiento de Datos
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">6. Planes y precios</h2>
              <p>
                GermIA opera hoy con un plan gratuito durante su etapa piloto. Si en el futuro se introducen planes de pago,
                te lo comunicaremos con antelación razonable antes de que te afecte.
              </p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">7. Disponibilidad del servicio</h2>
              <p>
                Hacemos un esfuerzo razonable por mantener GermIA disponible, pero no garantizamos que el servicio esté
                libre de interrupciones o errores. Podemos suspender el servicio por mantenimiento, sin previo aviso en
                casos urgentes.
              </p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">8. Terminación</h2>
              <p>
                Puedes dejar de usar GermIA y eliminar tu cuenta cuando quieras. Podemos suspender o cerrar cuentas que
                incumplan estos Términos, con aviso previo salvo en casos de abuso grave.
              </p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">9. Cambios a estos Términos</h2>
              <p>
                Podemos actualizar estos Términos ocasionalmente. Si el cambio es significativo, te avisaremos por correo
                o dentro de la plataforma antes de que entre en vigor.
              </p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">10. Ley aplicable</h2>
              <p>Estos Términos se rigen por las leyes de la República de Colombia.</p>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">11. Contacto</h2>
              <p>Preguntas sobre estos Términos: contacto@creciagro.com.</p>
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
