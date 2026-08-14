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
    container: "bg-info-50 border-l-4 border-info-400",
    icon: "text-info-600",
  },
  error: {
    container: "bg-negative-50 border-l-4 border-negative-400",
    icon: "text-negative-400",
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
