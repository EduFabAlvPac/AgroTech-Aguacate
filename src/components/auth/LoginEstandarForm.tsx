"use client";

import { useEffect, useState } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import {
  MENSAJE_RATE_LIMIT,
  MENSAJE_EMAIL_NO_VERIFICADO,
  MENSAJE_MFA_REQUERIDO,
  MENSAJE_MFA_CODIGO_INVALIDO,
} from "@/lib/auth-shared";

/**
 * Login estándar (correo+contraseña) — extraído literal de la página de
 * login original al introducir el selector de rol (RoleSelector); misma
 * lógica exacta que antes, solo se le suma el botón de Google (exclusivo de
 * este perfil, el modo Campesino no lo ve).
 *
 * Fase 1 SaaS, Tanda 2: suma enlaces a /registro y /recuperar, y un botón de
 * reenvío cuando el error es específicamente "correo sin verificar" (para no
 * dejar a nadie varado si el primer correo no le llegó o lo perdió).
 *
 * ADR-011 Sprint 6: segundo paso de MFA — si `authorize()` responde
 * MENSAJE_MFA_REQUERIDO, se revela el input del código y el siguiente submit
 * reintenta el MISMO email+password con `codigoMfa` agregado (no un flujo ni
 * un endpoint separado — mismo signIn("credentials", ...), mismo patrón que
 * el reenvío de verificación de correo de abajo).
 */
export function LoginEstandarForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [mostrarReenviar, setMostrarReenviar] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  // El botón de Google solo se ofrece si el provider está realmente
  // configurado en el servidor (antes se mostraba siempre y, sin credenciales,
  // el clic no hacía nada). Se pregunta a NextAuth qué providers hay.
  const [googleDisponible, setGoogleDisponible] = useState(false);
  useEffect(() => {
    getProviders().then((p) => setGoogleDisponible(!!p?.google)).catch(() => setGoogleDisponible(false));
  }, []);
  const [pidiendoMfa, setPidiendoMfa] = useState(false);
  const [codigoMfa, setCodigoMfa] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMostrarReenviar(false);

    // OJO — hallazgo de QA real: next-auth serializa un valor `undefined` en
    // el body como el STRING "undefined" (no lo omite), así que
    // `{ codigoMfa: undefined }` haría que authorize() reciba la cadena
    // "undefined" (truthy) en vez de nada — saltándose el mensaje "ingresa
    // el código" y cayendo directo en "código inválido" en el primer
    // submit. Se arma el objeto sin la clave cuando no aplica, en vez de
    // pasarla con `undefined`.
    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      ...(pidiendoMfa ? { codigoMfa } : {}),
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error === MENSAJE_RATE_LIMIT) {
        toast.error(MENSAJE_RATE_LIMIT);
      } else if (res.error === MENSAJE_EMAIL_NO_VERIFICADO) {
        toast.error(MENSAJE_EMAIL_NO_VERIFICADO);
        setMostrarReenviar(true);
      } else if (res.error === MENSAJE_MFA_REQUERIDO) {
        setPidiendoMfa(true);
      } else if (res.error === MENSAJE_MFA_CODIGO_INVALIDO) {
        toast.error(MENSAJE_MFA_CODIGO_INVALIDO);
        setCodigoMfa("");
      } else {
        toast.error("Credenciales incorrectas. Verifica tu email y contraseña.");
      }
    } else {
      toast.success("¡Bienvenido a GermIA!");
      router.push("/dashboard");
      router.refresh();
    }
  };

  const reenviarVerificacion = async () => {
    if (!form.email) {
      toast.error("Escribe tu correo arriba primero");
      return;
    }
    setReenviando(true);
    try {
      const res = await fetch("/api/auth/reenviar-verificacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo reenviar el correo");
      } else {
        toast.success("Te reenviamos el correo de verificación — revisa tu bandeja");
        setMostrarReenviar(false);
      }
    } catch {
      toast.error("No se pudo reenviar el correo");
    } finally {
      setReenviando(false);
    }
  };

  // ADR-011 Sprint 6 — paso 2, cuenta con MFA activo. Formulario chico y
  // separado a propósito (no un campo más mezclado con email/password): en
  // este punto ya no tiene sentido mostrar el botón de Google ni "¿No tienes
  // cuenta?", y "volver" tiene que limpiar el código para no reenviar uno
  // vencido si el usuario retrocede y vuelve a entrar.
  if (pidiendoMfa) {
    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
            Código de verificación
          </label>
          <p className="text-[12px] text-[var(--text-muted)] mb-2">
            Abre tu app de autenticación (Google Authenticator o similar) e ingresa el código de 6 dígitos, o un
            código de respaldo si no tienes acceso a la app.
          </p>
          <input
            type="text"
            inputMode="text"
            value={codigoMfa}
            onChange={(e) => setCodigoMfa(e.target.value)}
            placeholder="123456"
            autoFocus
            required
            className="w-full px-4 py-2.5 text-[15px] tracking-widest text-center border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-agro-600 hover:bg-agro-800 disabled:opacity-60 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors"
        >
          {loading ? "Verificando..." : "Verificar e ingresar"}
        </button>

        <button
          type="button"
          onClick={() => {
            setPidiendoMfa(false);
            setCodigoMfa("");
          }}
          className="w-full text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] py-1"
        >
          Volver
        </button>
      </form>
    );
  }

  return (
    <>
      {googleDisponible && (
        <>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 mb-4 border border-[var(--border-default)] rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-gray)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 16.2 3 9.5 7.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 45c5.4 0 10.3-1.9 14-5.1l-6.5-5.4C29.4 36.1 26.8 37 24 37c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.4 40.5 16.1 45 24 45z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.5 5.4C41.4 35.6 45 30.3 45 24c0-1.4-.1-2.7-.4-3.5z" />
          </svg>
          Continuar con Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[var(--border-default)]" />
          <span className="text-[11px] text-[var(--text-muted)]">o con tu correo</span>
          <div className="flex-1 h-px bg-[var(--border-default)]" />
        </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="tu@email.com"
              required
              className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[13px] font-medium text-[var(--text-secondary)]">Contraseña</label>
            <Link href="/recuperar" className="text-[12px] font-medium text-agro-600 hover:text-agro-800">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
              className="w-full pl-9 pr-10 py-2.5 text-[13px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {mostrarReenviar && (
          <button
            type="button"
            onClick={reenviarVerificacion}
            disabled={reenviando}
            className="w-full text-[12px] font-medium text-agro-600 hover:text-agro-800 disabled:opacity-60 py-1"
          >
            {reenviando ? "Reenviando..." : "Reenviar correo de verificación"}
          </button>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-agro-600 hover:bg-agro-800 disabled:opacity-60 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors mt-2"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="text-center text-[12px] text-[var(--text-muted)] mt-5">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-agro-600 hover:text-agro-800">
          Regístrate
        </Link>
      </p>
      <p className="text-center text-[12px] text-[var(--text-muted)] mt-2">
        ¿Eres una cooperativa o gremio?{" "}
        <Link href="/registrarse-colectivo" className="font-semibold text-agro-600 hover:text-agro-800">
          Regístrala aquí
        </Link>
      </p>
    </>
  );
}
