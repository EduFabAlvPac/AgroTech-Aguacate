"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";
import { AuthCard } from "@/components/auth/AuthCard";

export default function RecuperarPage() {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/recuperar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "No se pudo procesar la solicitud");
      return;
    }
    setEnviado(true);
  };

  if (enviado) {
    return (
      <AuthCard titulo="Revisa tu correo">
        <p className="text-[13px] text-[var(--text-secondary)] mb-4">
          Si <b>{email}</b> está registrado, te enviamos un enlace para crear una contraseña nueva — vence en 1 hora.
        </p>
        <Link href="/login" className="block text-center text-[13px] font-medium text-agro-600 hover:text-agro-800">
          Volver a iniciar sesión
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo="Recupera tu contraseña" subtitulo="Te enviamos un enlace a tu correo para crear una nueva">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Correo electrónico</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-agro-600 hover:bg-agro-800 disabled:opacity-60 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors mt-2"
        >
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>

      <p className="text-center text-[12px] text-[var(--text-muted)] mt-5">
        <Link href="/login" className="font-semibold text-agro-600 hover:text-agro-800">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthCard>
  );
}
