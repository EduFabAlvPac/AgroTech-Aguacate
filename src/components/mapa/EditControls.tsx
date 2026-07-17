"use client";

import { Button } from "@/components/ui";

interface EditControlsProps {
  visible: boolean;
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Floating buttons overlay for polygon edit mode (Flujo D).
 * Positioned absolutely over the map container.
 */
export function EditControls({ visible, loading, onSave, onCancel }: EditControlsProps) {
  if (!visible) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
      <Button variant="secondary" onClick={onCancel} disabled={loading}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={onSave} loading={loading}>
        Guardar cambios
      </Button>
    </div>
  );
}
