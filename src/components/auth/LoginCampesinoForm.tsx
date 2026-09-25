"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { MENSAJE_RATE_LIMIT, MENSAJE_CAMPESINO_REQUIERE_CODIGO } from "@/lib/auth-shared";

/**
 * Login "modo Campesino" — sin contraseña. El campesino escribe su celular; si
 * ese celular todavía no es un dispositivo de confianza, la app le pide un
 * código de 6 números que le da su asesor/dueño (paso 2). Se escribe UNA vez:
 * /api/campesino/vincular deja una cookie en este celular y de ahí en
 * adelante entra solo con el número. El backend (provider
 * "telefono-campesino" en src/lib/auth.ts) solo autentica cuentas con
 * experiencia CAMPESINO ya pre-creadas — no hay autoregistro aquí.
 *
 * Mismo patrón que el paso de MFA de LoginEstandarForm: se revela un campo
 * extra y se reintenta el mismo signIn(). Sin pasar campos `undefined` a
 * signIn() (next-auth los manda como el string "undefined").
 */
export function LoginCampesinoForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [telefono, setTelefono] = useState("");
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false);
  const [codigo, setCodigo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Paso 2: primero se canjea el código (deja la cookie del dispositivo),
      // y solo si sale bien se reintenta el login normal de abajo.
      if (pidiendoCodigo) {
        const r = await fetch("/api/campesino/vincular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telefono: telefono.trim(), codigo: codigo.trim() }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          toast.error(data.error || "No pudimos verificar el código. Intenta de nuevo.");
          setCodigo("");
          return;
        }
      }

      const res = await signIn("telefono-campesino", {
        telefono: telefono.trim(),
        redirect: false,
      });

      if (res?.error) {
        if (res.error === MENSAJE_RATE_LIMIT) {
          toast.error(MENSAJE_RATE_LIMIT);
        } else if (res.error === MENSAJE_CAMPESINO_REQUIERE_CODIGO && !pidiendoCodigo) {
          setPidiendoCodigo(true);
        } else {
          toast.error("No pudimos abrir tu cuenta. Pídele a tu asesor un código nuevo.");
        }
      } else {
        // Directo a /campesino/bienvenida (no /dashboard) — evita el salto
        // extra por la guarda de (dashboard)/layout.tsx que igual reenvía a
        // /campesino para esta experiencia.
        router.push("/campesino/bienvenida");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  if (pidiendoCodigo) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">
            Escribe tu código
          </label>
          <p className="text-[13px] text-[var(--text-muted)] mb-3">
            Es un número de 6 cifras que te dio tu asesor. Solo lo escribes esta vez: después, este celular entra
            solo con tu número.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="000000"
            autoFocus
            required
            className="w-full px-4 py-4 text-[26px] tracking-[0.4em] text-center border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || codigo.replace(/\D/g, "").length < 6}
          className="w-full py-3 bg-agro-600 hover:bg-agro-800 disabled:opacity-60 text-white text-[15px] font-semibold rounded-[var(--radius-md)] transition-colors"
        >
          {loading ? "Verificando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={() => {
            setPidiendoCodigo(false);
            setCodigo("");
          }}
          className="w-full text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] py-1"
        >
          Volver
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="telefono-campesino" className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5">
          Tu número de celular
        </label>
        <div className="flex items-stretch border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus-within:ring-2 focus-within:ring-agro-200 focus-within:border-agro-400 transition-all overflow-hidden">
          {/* Prefijo de Colombia — solo visual: el celular se guarda y se busca
              normalizado sin indicativo (src/lib/telefono.ts), así que lo que se
              envía sigue siendo únicamente lo que la persona escribe. */}
          <span className="flex items-center gap-2 px-3 bg-[var(--surface-page)] border-r border-[var(--border-default)] text-[16px] font-medium text-[var(--text-primary)] shrink-0">
            <span aria-hidden="true" className="inline-block w-6 h-4 rounded-[2px] overflow-hidden" style={{ background: "linear-gradient(#FCD116 50%, #003893 50% 75%, #CE1126 75%)" }} />
            +57
          </span>
          <input
            id="telefono-campesino"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="300 123 4567"
            required
            className="flex-1 min-w-0 px-3 py-3.5 text-[18px] bg-transparent focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || telefono.trim().length < 7}
        className="w-full py-3.5 bg-agro-600 hover:bg-agro-800 disabled:opacity-60 text-white text-[16px] font-semibold rounded-[var(--radius-md)] transition-colors"
      >
        {loading ? "Ingresando..." : "Continuar →"}
      </button>
    </form>
  );
}
