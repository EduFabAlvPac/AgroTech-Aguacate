import type { ReactNode } from "react";

/**
 * Shell compartido (logo + card blanca centrada) para las pantallas de
 * autenticación fuera del login (registro, recuperar, restablecer,
 * verificar) — extraído del markup que ya traía login/page.tsx, para no
 * repetirlo entero en cada pantalla nueva de la Tanda 2.
 */
export function AuthCard({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/images/logos/germia-lockup-login.png" alt="GermIA" className="w-64 mx-auto mb-2" />
        </div>

        <div className="card p-6">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">{titulo}</h2>
          {subtitulo && <p className="text-[12px] text-[var(--text-muted)] mb-4">{subtitulo}</p>}
          {children}
        </div>

        <p className="text-center text-[12px] text-[var(--text-muted)] mt-6">
          Un desarrollo de CrecIAgro © {new Date().getFullYear()} · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
