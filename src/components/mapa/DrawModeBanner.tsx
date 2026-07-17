"use client";

import { Pencil, AlertTriangle } from "lucide-react";

interface DrawModeBannerProps {
  visible: boolean;
  message?: string;
  variant?: "info" | "edit" | "error";
}

const variantStyles = {
  info: {
    container: "bg-agro-50 border-l-4 border-agro-400",
    icon: "text-agro-400",
  },
  edit: {
    container: "bg-blue-50 border-l-4 border-blue-400",
    icon: "text-blue-500",
  },
  error: {
    container: "bg-red-50 border-l-4 border-red-400",
    icon: "text-red-500",
  },
} as const;

export function DrawModeBanner({
  visible,
  message = "Dibuja el perímetro del nuevo lote en el mapa",
  variant = "info",
}: DrawModeBannerProps) {
  if (!visible) return null;

  const styles = variantStyles[variant];
  const Icon = variant === "error" ? AlertTriangle : Pencil;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-lg ${styles.container} text-[var(--text-primary)]`}
    >
      <Icon size={16} className={`${styles.icon} shrink-0`} />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
