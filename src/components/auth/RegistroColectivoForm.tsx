"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import { AuthCard } from "@/components/auth/AuthCard";

/**
 * Registro de cooperativa (ADR-011 §6.1) — dos variantes:
 * - Persona nueva (`sesionActiva = false`): datos de la persona + de la
 *   organización → crea cuenta, cooperativa en trial y manda el correo de
 *   verificación (mismo flujo que /registro).
 * - Persona con sesión (`sesionActiva = true`): solo los datos de la
 *   organización → la cooperativa se suma como SEGUNDA organización suya.
 */
export function RegistroColectivoForm({ sesionActiva }: { sesionActiva: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({
    nombre: "", email: "", password: "", aceptaTerminos: false,
    nombreOrganizacion: "", nit: "", celularContacto: "", ciudad: "", departamento: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const org = {
        nombreOrganizacion: form.nombreOrganizacion, nit: form.nit, celularContacto: form.celularContacto,
        ciudad: form.ciudad || undefined, departamento: form.departamento || undefined,
      };
      const res = await fetch(sesionActiva ? "/api/organizaciones/colectivo" : "/api/auth/registro-colectivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sesionActiva ? org : { nombre: form.nombre, email: form.email, password: form.password, aceptaTerminos: form.aceptaTerminos, ...org }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo crear la cooperativa");
        return;
      }
      if (sesionActiva) {
        toast.success("Cooperativa creada — tienes 30 días de prueba");
        router.push("/dashboard/configuracion?tab=organizacion");
        router.refresh();
      } else {
        setEnviado(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <AuthCard titulo="Revisa tu correo">
        <p className="text-[13px] text-[var(--text-secondary)] mb-4">
          Te enviamos un enlace a <b>{form.email}</b> para confirmar tu cuenta. Al abrirlo podrás entrar y empezar tu
          prueba de 30 días de GermIA para cooperativas — vence en 24 horas.
        </p>
        <Link href="/login" className="block text-center text-[13px] font-medium text-agro-600 hover:text-agro-800">
          Ir a iniciar sesión
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      titulo="Registra tu cooperativa"
      subtitulo="30 días de prueba gratis, hasta 5 asociados. Sin tarjeta."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Nombre de la cooperativa *" value={form.nombreOrganizacion} onChange={set("nombreOrganizacion")} placeholder="Cooperativa Agropecuaria El Común" required />
        <Input label="NIT *" value={form.nit} onChange={set("nit")} placeholder="900.123.456-7" required />
        <Input label="Celular de contacto *" type="tel" value={form.celularContacto} onChange={set("celularContacto")} placeholder="300 123 4567" required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ciudad" value={form.ciudad} onChange={set("ciudad")} placeholder="Ocaña" />
          <Input label="Departamento" value={form.departamento} onChange={set("departamento")} placeholder="Norte de Santander" />
        </div>

        {!sesionActiva && (
          <div className="border-t border-[var(--border-subtle)] pt-3 space-y-3">
            <p className="text-[12px] font-medium text-[var(--text-secondary)]">Tus datos (coordinador/a)</p>
            <Input label="Tu nombre *" value={form.nombre} onChange={set("nombre")} placeholder="Juan Pérez" required />
            <Input label="Correo electrónico *" type="email" value={form.email} onChange={set("email")} placeholder="tu@email.com" required />
            <Input label="Contraseña *" type="password" value={form.password} onChange={set("password")} placeholder="Mínimo 8 caracteres" minLength={8} required />
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
                <Link href="/terminos" target="_blank" className="text-agro-600 hover:text-agro-800 underline">Términos de Servicio</Link>{" "}
                y la{" "}
                <Link href="/privacidad" target="_blank" className="text-agro-600 hover:text-agro-800 underline">Política de Tratamiento de Datos</Link>
              </span>
            </label>
          </div>
        )}

        <Button type="submit" loading={loading} disabled={!sesionActiva && !form.aceptaTerminos} className="w-full mt-2">
          {sesionActiva ? "Crear cooperativa" : "Crear cuenta y cooperativa"}
        </Button>
      </form>

      <p className="text-center text-[12px] text-[var(--text-muted)] mt-5">
        {sesionActiva ? (
          <Link href="/dashboard" className="font-semibold text-agro-600 hover:text-agro-800">Volver al panel</Link>
        ) : (
          <>¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-agro-600 hover:text-agro-800">Inicia sesión</Link></>
        )}
      </p>
    </AuthCard>
  );
}
