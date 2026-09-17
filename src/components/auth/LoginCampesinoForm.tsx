"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import toast from "react-hot-toast";
import { MENSAJE_RATE_LIMIT } from "@/lib/auth-shared";

/**
 * Login "modo Campesino" — solo número de celular, sin contraseña, sin OTP
 * por ahora (decisión de producto para el MVP, ver plan/memoria del
 * proyecto). El backend (provider "telefono-campesino" en src/lib/auth.ts)
 * solo autentica cuentas con experiencia CAMPESINO ya pre-creadas por un
 * asesor/admin — no hay autoregistro aquí.
 */
export function LoginCampesinoForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [telefono, setTelefono] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("telefono-campesino", {
      telefono: telefono.trim(),
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      toast.error(
        res.error === MENSAJE_RATE_LIMIT
          ? MENSAJE_RATE_LIMIT
          : "No encontramos ese número. Pide a tu asesor que registre tu cuenta."
      );
    } else {
      // Directo a /campesino/bienvenida (no /dashboard) — evita el salto
      // extra por la guarda de (dashboard)/layout.tsx que igual reenvía a
      // /campesino para esta experiencia.
      router.push("/campesino/bienvenida");
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
          Número de celular
        </label>
        <div className="relative">
          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="300 123 4567"
            required
            className="w-full pl-9 pr-4 py-3 text-[15px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || telefono.trim().length < 7}
        className="w-full py-3 bg-agro-600 hover:bg-agro-800 disabled:opacity-60 text-white text-[15px] font-semibold rounded-[var(--radius-md)] transition-colors"
      >
        {loading ? "Ingresando..." : "Continuar"}
      </button>
    </form>
  );
}
