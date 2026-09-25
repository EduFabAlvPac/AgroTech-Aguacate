"use client";

import { useEffect, useState } from "react";
import { RoleSelector, type RolLogin } from "@/components/auth/RoleSelector";
import { LoginCampesinoForm } from "@/components/auth/LoginCampesinoForm";
import { LoginEstandarForm } from "@/components/auth/LoginEstandarForm";
import toast from "react-hot-toast";
import { ShieldCheck, ScanLine, CloudSun, LineChart } from "lucide-react";
import { LoginGoogleMfaForm } from "@/components/auth/LoginGoogleMfaForm";

const ERRORES_LOGIN: Record<string, string> = {
  AccessDenied: "Esa cuenta de Google no está registrada en GermIA. Pídele acceso a quien administra tu organización o entra con tu correo y contraseña.",
  OAuthSignin: "No pudimos iniciar con Google. Intenta de nuevo o entra con tu correo y contraseña.",
  OAuthCallback: "No pudimos completar el ingreso con Google. Intenta de nuevo o entra con tu correo y contraseña.",
  Configuration: "El ingreso con Google no está disponible en este momento. Entra con tu correo y contraseña.",
  default: "No pudimos iniciar sesión. Intenta de nuevo o entra con tu correo y contraseña.",
};

export default function LoginPage() {
  // Sin selección por defecto (hallazgo del usuario, 2026-08-26): antes
  // arrancaba en "campesino" premarcado, lo que además revelaba el
  // formulario de celular sin que nadie hubiera elegido nada todavía.
  const [rol, setRol] = useState<RolLogin | null>(null);
  // Login con Google + MFA (ADR-011 Sprint 6): el callback signIn redirige acá
  // con `?mfa=google&p=<prueba firmada>` en vez de abrir sesión. Se lee de
  // window (no useSearchParams) para no exigir un <Suspense> en esta página.
  const [pruebaGoogle, setPruebaGoogle] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // NextAuth devuelve acá cualquier fallo del login social como `?error=`;
    // antes la pantalla lo ignoraba y "no pasaba nada".
    const error = q.get("error");
    if (error) {
      toast.error(ERRORES_LOGIN[error] ?? ERRORES_LOGIN.default);
      setRol("otro");
      window.history.replaceState(null, "", "/login");
    }
    const p = q.get("p");
    if (q.get("mfa") === "google" && p) {
      setPruebaGoogle(p);
      setRol("otro");
    }
  }, []);
  const volverDeGoogle = () => {
    setPruebaGoogle(null);
    window.history.replaceState(null, "", "/login");
  };

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca — solo escritorio. Reusa la ilustración de GermIAmigo
          (public/img-app/bienvenida.jpeg) y el lema del logo; en celular su
          lugar lo ocupa el banner de más abajo, para no empujar el formulario
          fuera de la pantalla. */}
      <aside className="hidden lg:block relative overflow-hidden" aria-hidden="true">
        <img src="/img-app/bienvenida.jpeg" alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_22%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b1a]/95 via-[#0d2b1a]/45 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <h2 className="text-[32px] font-semibold leading-tight max-w-2xl">La vida de tus cultivos, en datos.</h2>
          <ul className="mt-6 space-y-3 text-[15px] text-white/90">
            <li className="flex items-center gap-3"><ScanLine size={18} className="shrink-0" /> Diagnóstico de plagas y enfermedades con una foto</li>
            <li className="flex items-center gap-3"><CloudSun size={18} className="shrink-0" /> Clima y alertas para tu finca</li>
            <li className="flex items-center gap-3"><LineChart size={18} className="shrink-0" /> Costos, cosechas y precios en un solo lugar</li>
          </ul>
        </div>
      </aside>

      <main className="flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto px-5 sm:px-8 py-6">
          {/* Logo — lockup completo (ícono + wordmark): la imagen ya trae
              "GermIA" escrito, un <h1> aparte repitiendo el nombre quedaría
              redundante. Más chico que antes: en celular ocupaba ~40% de la
              pantalla antes de poder hacer nada. */}
          <div className="text-center">
            <img src="/images/logos/germia-lockup-login.png" alt="GermIA" className="w-36 lg:w-44 mx-auto" />
          </div>

          {/* Banner de ilustración — solo celular */}
          <div className="lg:hidden mt-3 mb-5 h-40 rounded-[var(--radius-xl,16px)] overflow-hidden relative">
            <img src="/img-app/bienvenida.jpeg" alt="" aria-hidden="true" className="h-full w-full object-cover object-[50%_42%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b1a]/35 to-transparent" />
          </div>

          <h1 className="text-[24px] font-semibold text-[var(--text-primary)] mt-5 lg:mt-8 mb-1 text-center lg:text-left">
            ¿Quién eres?
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mb-5 text-center lg:text-left">
            Elige cómo vas a entrar a GermIA
          </p>

          <RoleSelector value={rol} onChange={setRol} />

          {rol === null && (
            <p className="text-center text-[13px] text-[var(--text-secondary)] -mt-1 mb-2">
              Toca una de las dos opciones para continuar
            </p>
          )}
          {rol === "campesino" && <LoginCampesinoForm />}
          {rol === "otro" && !pruebaGoogle && <LoginEstandarForm />}
          {rol === "otro" && pruebaGoogle && <LoginGoogleMfaForm pendiente={pruebaGoogle} onVolver={volverDeGoogle} />}

          <div className="mt-8 pt-4 border-t border-[var(--border-subtle)] text-center">
            <p className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-agro-600">
              <ShieldCheck size={15} /> Datos seguros y privados
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-2">
              Un desarrollo de CrecIAgro © {new Date().getFullYear()} · Todos los derechos reservados
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
