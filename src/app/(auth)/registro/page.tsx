"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { AuthCard } from "@/components/auth/AuthCard";

export default function RegistroPage() {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", aceptaTerminos: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "No se pudo crear la cuenta");
      return;
    }
    setEnviado(true);
  };

  if (enviado) {
    return (
      <AuthCard titulo="Revisa tu correo">
        <p className="text-[13px] text-[var(--text-secondary)] mb-4">
          Te enviamos un enlace a <b>{form.email}</b> para confirmar tu cuenta. Ábrelo desde tu celular o computador
          para activarla — vence en 24 horas.
        </p>
        <Link href="/login" className="block text-center text-[13px] font-medium text-agro-600 hover:text-agro-800">
          Volver a iniciar sesión
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo="Crea tu cuenta" subtitulo="Empieza a gestionar tu finca con GermIA">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          {/* Neutral a propósito (hallazgo del usuario, 2026-09-22): el campo
              acepta cualquier texto —User.name es texto libre, sin
              validación que exija persona natural— pero "Tu nombre" +
              "Juan Pérez" daba a entender que era solo para personas. No
              distingue natural/jurídica por dentro (eso viviría en
              Organizacion.tipo/nit del ADR-011, sin conectar todavía) —
              este es solo el texto, a propósito, por ahora. */}
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Nombre o razón social</label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Juan Pérez o Finca El Juncal S.A.S."
              required
              className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Correo electrónico</label>
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

        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Contraseña</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
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

        <label className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={form.aceptaTerminos}
            onChange={(e) => setForm({ ...form, aceptaTerminos: e.target.checked })}
            required
            className="mt-0.5"
          />
          <span>
            Acepto los{" "}
            <Link href="/terminos" target="_blank" className="text-agro-600 hover:text-agro-800 underline">
              Términos de Servicio
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" target="_blank" className="text-agro-600 hover:text-agro-800 underline">
              Política de Tratamiento de Datos
            </Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !form.aceptaTerminos}
          className="w-full py-2.5 bg-agro-600 hover:bg-agro-800 disabled:opacity-60 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors mt-2"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-[12px] text-[var(--text-muted)] mt-5">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-agro-600 hover:text-agro-800">
          Inicia sesión
        </Link>
      </p>
    </AuthCard>
  );
}
