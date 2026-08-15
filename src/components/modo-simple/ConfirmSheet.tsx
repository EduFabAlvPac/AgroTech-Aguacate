"use client";

import { AlertTriangle } from "lucide-react";

interface ConfirmSheetProps {
  titulo: string;
  mensaje: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reemplaza window.confirm() — se veía como un diálogo nativo del
 * navegador, no como parte de la app (feedback directo del usuario tras
 * probar eliminar un cultivo). Mismo patrón visual de bottom-sheet que ya
 * usan todos los modales de modo simple (FincaModal, NuevoCultivoModal,
 * etc.), en vez del <Modal> centrado de src/components/ui — consistente
 * con el resto de esta fase, no con el modo completo.
 */
export function ConfirmSheet({
  titulo,
  mensaje,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onCancel}>
      <div
        className="w-full rounded-t-3xl p-5 space-y-4"
        style={{ maxWidth: 540, background: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-negative-bg)" }}
          >
            <AlertTriangle size={18} style={{ color: "var(--color-negative)" }} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{titulo}</h3>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{mensaje}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full text-[13px] font-semibold"
            style={{ background: "var(--surface-page)", color: "var(--text-primary)" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-full text-[13px] font-semibold text-white"
            style={{ background: "var(--color-negative)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
