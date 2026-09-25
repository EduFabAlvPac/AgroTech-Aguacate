"use client";

import { useEffect, useState } from "react";
import { RoleSelector, type RolLogin } from "@/components/auth/RoleSelector";
import { LoginCampesinoForm } from "@/components/auth/LoginCampesinoForm";
import { LoginEstandarForm } from "@/components/auth/LoginEstandarForm";
import toast from "react-hot-toast";
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
    <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo — lockup completo (ícono + wordmark), no ícono + texto por separado:
            la imagen ya trae "GermIA" escrito, un <h1> aparte repitiendo el nombre
            quedaría redundante/inconsistente con ella. */}
        <div className="text-center mb-8">
          <img
            src="/images/logos/germia-lockup-login.png"
            alt="GermIA"
            className="w-64 mx-auto mb-2"
          />
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
            Gestión inteligente de tu cultivo
          </p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">
            Elija su rol
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mb-4">
            ¿Cómo vas a usar GermIA?
          </p>

          <RoleSelector value={rol} onChange={setRol} />

          {rol === "campesino" && <LoginCampesinoForm />}
          {rol === "otro" && !pruebaGoogle && <LoginEstandarForm />}
          {rol === "otro" && pruebaGoogle && <LoginGoogleMfaForm pendiente={pruebaGoogle} onVolver={volverDeGoogle} />}

          {rol === "otro" && !pruebaGoogle && (
            <div className="mt-4 p-3 bg-agro-50 rounded-[var(--radius-md)] border border-agro-100">
              <p className="text-[11px] font-semibold text-agro-600 mb-1">
                Credenciales de demo
              </p>
              <p className="text-[11px] text-agro-400">
                Email: info@fincaalvarezpacheco.co
              </p>
              <p className="text-[11px] text-agro-400">Contraseña: agro2026</p>
            </div>
          )}
        </div>

        <p className="text-center text-[12px] text-[var(--text-muted)] mt-6">
          Un desarrollo de CrecIAgro © {new Date().getFullYear()} · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
