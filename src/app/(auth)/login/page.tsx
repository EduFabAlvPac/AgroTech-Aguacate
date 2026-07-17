"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Leaf, Lock, Mail, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      toast.error("Credenciales incorrectas. Verifica tu email y contraseña.");
    } else {
      toast.success("¡Bienvenido a AgroTech!");
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-agro-400 flex items-center justify-center mx-auto mb-4 shadow-md">
            <Leaf size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">AgroTech</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
            Gestión inteligente de tu cultivo
          </p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-5">
            Iniciar sesión
          </h2>

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
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
                Contraseña
              </label>
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-agro-400 hover:bg-agro-600 disabled:opacity-60 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors mt-2"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-4 p-3 bg-agro-50 rounded-[var(--radius-md)] border border-agro-100">
            <p className="text-[11px] font-semibold text-agro-600 mb-1">
              Credenciales de demo
            </p>
            <p className="text-[11px] text-agro-400">
              Email: info@fincaalvarezpacheco.co
            </p>
            <p className="text-[11px] text-agro-400">Contraseña: agro2026</p>
          </div>
        </div>

        <p className="text-center text-[12px] text-[var(--text-muted)] mt-6">
          AgroTech MVP · Finca Álvarez Pacheco · Norte de Santander
        </p>
      </div>
    </div>
  );
}
