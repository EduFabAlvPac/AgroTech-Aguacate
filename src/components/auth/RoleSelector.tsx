"use client";

import { Sprout, Building2, Check } from "lucide-react";

export type RolLogin = "campesino" | "otro";

interface RoleSelectorProps {
  value: RolLogin | null;
  onChange: (rol: RolLogin) => void;
}

/**
 * Selector de rol en el login — decide qué formulario se muestra debajo:
 * "Campesino" (solo celular, sin contraseña, ver LoginCampesinoForm) o
 * "Productor o cooperativa" (correo + contraseña, ver LoginEstandarForm).
 * Puramente de UI: la cuenta real ya tiene su ExperienciaApp asignada, esto
 * solo elige qué formulario mostrar — el backend (src/lib/auth.ts) igual
 * valida en ambos sentidos. Sin selección por defecto (decisión del usuario,
 * 2026-08-26: premarcar Campesino revelaba el formulario de celular sin que
 * nadie hubiera elegido). El valor interno "otro" se conserva por
 * compatibilidad con el resto del login.
 */
const OPCIONES: { valor: RolLogin; titulo: string; detalle: string; Icono: typeof Sprout }[] = [
  { valor: "campesino", titulo: "Campesino", detalle: "Solo necesitas tu número de celular", Icono: Sprout },
  { valor: "otro", titulo: "Productor o cooperativa", detalle: "Entra con tu correo y contraseña", Icono: Building2 },
];

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-5" role="radiogroup" aria-label="¿Quién eres?">
      {OPCIONES.map(({ valor, titulo, detalle, Icono }) => {
        const activo = value === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(valor)}
            className={`relative flex flex-col items-start gap-2 p-3.5 rounded-[var(--radius-lg)] border-2 text-left transition-all ${
              activo
                ? "border-agro-600 bg-agro-50 shadow-sm"
                : "border-[var(--border-default)] bg-white hover:border-agro-200"
            }`}
          >
            <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activo ? "bg-agro-600" : "bg-agro-100"}`}>
              <Icono size={20} className={activo ? "text-white" : "text-agro-600"} />
            </span>
            <span className="text-[14px] font-semibold leading-tight text-[var(--text-primary)]">{titulo}</span>
            <span className="text-[12px] leading-snug text-[var(--text-secondary)]">{detalle}</span>
            {activo && (
              <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-agro-600 flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
