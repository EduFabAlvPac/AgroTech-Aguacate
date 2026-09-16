"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function CerrarSesionCampesinoButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-lg)] text-[14px] font-semibold"
      style={{ color: "var(--color-negative)", background: "var(--color-negative-bg)" }}
    >
      <LogOut size={16} /> Cerrar sesión
    </button>
  );
}
