import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCOP(amount: number): string {
  if (amount === 0) return "$0";
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}k`;
  }
  return `$${amount.toLocaleString("es-CO")}`;
}

export function formatCOPFull(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string, short = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (short) {
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  }
  return d.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function calcProgreso(fechaSiembra: Date, fechaCosecha: Date): number {
  const total = fechaCosecha.getTime() - fechaSiembra.getTime();
  const elapsed = Date.now() - fechaSiembra.getTime();
  return Math.min(Math.max((elapsed / total) * 100, 0), 100);
}
