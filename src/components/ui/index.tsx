"use client";

import { forwardRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-agro-600 hover:bg-agro-800 text-white",
      secondary: "bg-[var(--surface-page)] hover:bg-agro-50 text-[var(--text-primary)] border border-[var(--border-default)]",
      ghost: "hover:bg-[var(--surface-page)] text-[var(--text-secondary)]",
      danger: "bg-negative-400 hover:bg-negative-600 text-white",
    };

    const sizes = {
      sm: "h-8 px-3 text-[12px]",
      md: "h-9 px-4 text-[13px]",
      lg: "h-10 px-5 text-[14px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[12px] font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-9 px-3 text-[13px] bg-white border rounded-[var(--radius-md)] transition-all",
            "border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400",
            error ? "border-negative-400 focus:ring-negative-100" : "",
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-negative-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[12px] font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "h-9 px-3 text-[13px] bg-white border rounded-[var(--radius-md)] transition-all appearance-none cursor-pointer",
            "border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400",
            error ? "border-negative-400" : "",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {error && <p className="text-[11px] text-negative-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

// ── Textarea ──────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-[12px] font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "px-3 py-2 text-[13px] bg-white border rounded-[var(--radius-md)] transition-all resize-none",
            "border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400",
            error ? "border-negative-400" : "",
            className
          )}
          rows={3}
          {...props}
        />
        {error && <p className="text-[11px] text-negative-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  // Portal a document.body: si el Modal se renderiza dentro de un ancestro
  // con `transform` (ej. el <aside> del Sidebar, que usa translate-x para la
  // animación de abrir/cerrar en mobile), `position: fixed` deja de
  // posicionarse contra el viewport y se confina a ese ancestro — el modal
  // se ve "encajonado" en una esquina en vez de centrado en pantalla. Portal
  // evita esto sin importar dónde se invoque el componente.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // On mobile: full-width bottom-sheet. On sm+: centered dialog with max-width.
  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative bg-white shadow-2xl w-full",
          "rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)]",
          sizeClasses[size],
          "animate-fade-in"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--surface-page)] transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} className="text-[var(--text-muted)]" />
          </button>
        </div>
        {/* Body — scrollable so tall forms don't overflow viewport on small screens */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-[var(--surface-page)] flex items-center justify-center mb-4 text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-[var(--text-secondary)] max-w-sm mb-5">{description}</p>
      )}
      {action}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export { Skeleton } from "./Skeleton";
