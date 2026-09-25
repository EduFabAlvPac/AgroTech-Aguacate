"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  MENSAJE_RATE_LIMIT,
  MENSAJE_MFA_CODIGO_INVALIDO,
  MENSAJE_GOOGLE_MFA_EXPIRADO,
} from "@/lib/auth-shared";

/**
 * Segundo paso del login con Google para cuentas con verificación en dos pasos
 * (ADR-011 Sprint 6). Google ya autenticó a la persona; acá se pide el código
 * y se canjea junto con la prueba firmada (`pendiente`, viene en la URL) en el
 * provider "google-mfa". Sin la prueba vigente NO se crea sesión.
 */
export function LoginGoogleMfaForm({ pendiente, onVolver }: { pendiente: string; onVolver: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [codigo, setCodigo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("google-mfa", { pendiente, codigoMfa: codigo, redirect: false });
      if (res?.error) {
        if (res.error === MENSAJE_MFA_CODIGO_INVALIDO) {
          toast.error(MENSAJE_MFA_CODIGO_INVALIDO);
          setCodigo("");
        } else if (res.error === MENSAJE_RATE_LIMIT) {
          toast.error(MENSAJE_RATE_LIMIT);
        } else {
          // Prueba vencida/ inválida u otro fallo: hay que volver a empezar con Google.
          toast.error(res.error === MENSAJE_GOOGLE_MFA_EXPIRADO ? MENSAJE_GOOGLE_MFA_EXPIRADO : "No se pudo verificar. Vuelve a entrar con Google.");
          onVolver();
        }
        return;
      }
      toast.success("¡Bienvenido a GermIA!");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5">Código de verificación</label>
        <p className="text-[13px] text-[var(--text-secondary)] mb-2">
          Google confirmó tu cuenta. Ahora abre tu app de autenticación e ingresa el código de 6 dígitos, o un código de
          respaldo si no tienes acceso a la app.
        </p>
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="123456"
          autoFocus
          required
          className="w-full px-4 py-3 text-[16px] tracking-widest text-center border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-agro-600 hover:bg-agro-800 disabled:opacity-60 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors"
      >
        {loading ? "Verificando..." : "Verificar e ingresar"}
      </button>
      <button type="button" onClick={onVolver} className="w-full text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] py-1">
        Volver
      </button>
    </form>
  );
}
