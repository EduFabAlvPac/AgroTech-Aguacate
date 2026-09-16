"use client";

import { Sprout, Briefcase, ChevronRight } from "lucide-react";

export type RolLogin = "campesino" | "otro";

interface RoleSelectorProps {
  value: RolLogin | null;
  onChange: (rol: RolLogin) => void;
}

/**
 * Selector de rol en el login (mockup validado 2026-08-26) — decide qué
 * formulario se muestra debajo: "Campesino" (solo celular, sin contraseña,
 * ver LoginCampesinoForm) u "Otro rol" (correo+contraseña+Google, ver
 * LoginEstandarForm). Puramente de UI: la cuenta real ya tiene su
 * ExperienciaApp asignada por un asesor/admin, esto solo elige qué formulario
 * mostrar — el backend (ver src/lib/auth.ts) igual valida en ambos sentidos.
 */
export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="space-y-2.5 mb-5">
      <button
        type="button"
        onClick={() => onChange("campesino")}
        className={`w-full flex items-center gap-3 p-3.5 rounded-[var(--radius-md)] border-2 transition-all text-left ${
          value === "campesino"
            ? "border-agro-600 bg-agro-50"
            : "border-[var(--border-default)] bg-white hover:border-agro-200"
        }`}
      >
        <span className="w-11 h-11 rounded-full bg-agro-100 flex items-center justify-center shrink-0">
          <Sprout size={22} className="text-agro-600" />
        </span>
        <span className="flex-1 text-[15px] font-semibold text-[var(--text-primary)]">
          Campesino
        </span>
        <ChevronRight size={18} className="text-[var(--text-muted)]" />
      </button>

      <button
        type="button"
        onClick={() => onChange("otro")}
        className={`w-full flex items-center gap-3 p-3.5 rounded-[var(--radius-md)] border-2 transition-all text-left ${
          value === "otro"
            ? "border-agro-600 bg-agro-50"
            : "border-[var(--border-default)] bg-white hover:border-agro-200"
        }`}
      >
        <span className="w-11 h-11 rounded-full bg-earth-100 flex items-center justify-center shrink-0">
          <Briefcase size={20} className="text-earth-600" />
        </span>
        <span className="flex-1 text-[15px] font-semibold text-[var(--text-primary)]">
          Otro rol
        </span>
        <ChevronRight size={18} className="text-[var(--text-muted)]" />
      </button>
    </div>
  );
}
