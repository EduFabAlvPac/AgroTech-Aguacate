"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui";
import { loteFormSchema } from "@/lib/validations";
import toast from "react-hot-toast";
import type { Lote } from "@prisma/client";
import { crearLote, actualizarLote, type LoteActionState } from "@/app/(dashboard)/dashboard/cultivos/lote-actions";

interface LoteFormProps {
  fincaId: string;
  lote?: Lote | null;
  onSuccess: (lote: Lote) => void;
  onCancel: () => void;
  fincaCoords?: { lat: number; lng: number };
}

type FormErrors = Partial<Record<"nombre" | "areaHa" | "altitud" | "pendiente" | "notas", string>>;

const initialState: LoteActionState = {};

function SubmitButton({ isEditMode, disabled }: { isEditMode: boolean; disabled?: boolean }) {
  // useFormStatus reemplaza el useState manual de "loading" — Fase 1,
  // ADR-006 (condición 2 del prompt): estado nativo de React 19/Next 15
  // para el pending de una Server Action, no useState propio.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending || disabled}>
      {isEditMode ? "Guardar cambios" : "Crear lote"}
    </Button>
  );
}

export function LoteForm({ fincaId, lote, onSuccess, onCancel, fincaCoords }: LoteFormProps) {
  const isEditMode = !!lote;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [drawLoading, setDrawLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    nombre: lote?.nombre ?? "",
    areaHa: lote?.areaHa?.toString() ?? "",
    altitud: lote?.altitud?.toString() ?? "",
    pendiente: lote?.pendiente?.toString() ?? "",
    notas: lote?.notas ?? "",
  });

  const action = isEditMode ? actualizarLote.bind(null, lote.id) : crearLote;
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.fieldErrors) setErrors(state.fieldErrors);
    if (state.error) toast.error(state.error);
    if (state.lote) {
      toast.success(isEditMode ? "Lote actualizado correctamente" : "Lote creado correctamente");
      onSuccess(state.lote);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Validación de cliente para feedback inmediato (misma zod schema que ya
  // corre en el servidor dentro de la Server Action — no reemplaza esa
  // validación, la anticipa).
  const validateClientSide = (): boolean => {
    const payload = {
      nombre: form.nombre,
      areaHa: form.areaHa ? parseFloat(form.areaHa) : undefined,
      altitud: form.altitud ? parseFloat(form.altitud) : null,
      pendiente: form.pendiente ? parseFloat(form.pendiente) : null,
      notas: form.notas || null,
      fincaId,
    };
    const result = loteFormSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleDrawInMap = async () => {
    if (!validateClientSide()) return;
    setDrawLoading(true);
    try {
      const fd = new FormData();
      fd.set("nombre", form.nombre);
      fd.set("areaHa", form.areaHa);
      if (form.altitud) fd.set("altitud", form.altitud);
      if (form.pendiente) fd.set("pendiente", form.pendiente);
      if (form.notas) fd.set("notas", form.notas);
      fd.set("fincaId", fincaId);
      const result = await crearLote(initialState, fd);
      if (result.error || result.fieldErrors) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error || "Error al guardar el lote");
        return;
      }
      if (result.lote) router.push(`/dashboard/mapa?action=draw&loteId=${result.lote.id}`);
    } finally {
      setDrawLoading(false);
    }
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        if (!validateClientSide()) e.preventDefault();
      }}
      className="space-y-4"
    >
      <input type="hidden" name="fincaId" value={fincaId} />

      <Input
        label="Nombre del lote"
        name="nombre"
        value={form.nombre}
        onChange={(e) => {
          setForm({ ...form, nombre: e.target.value });
          if (errors.nombre) setErrors((prev) => ({ ...prev, nombre: undefined }));
        }}
        placeholder="Ej: Lote Norte, Lote 1..."
        error={errors.nombre}
      />

      <Input
        label="Área (ha)"
        name="areaHa"
        type="number"
        step="0.01"
        min="0.01"
        max="10000"
        value={form.areaHa}
        onChange={(e) => {
          setForm({ ...form, areaHa: e.target.value });
          if (errors.areaHa) setErrors((prev) => ({ ...prev, areaHa: undefined }));
        }}
        placeholder="Ej: 2.5"
        error={errors.areaHa}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Altitud (msnm)"
          name="altitud"
          type="number"
          step="1"
          min="0"
          max="5000"
          value={form.altitud}
          onChange={(e) => {
            setForm({ ...form, altitud: e.target.value });
            if (errors.altitud) setErrors((prev) => ({ ...prev, altitud: undefined }));
          }}
          placeholder="Opcional"
          error={errors.altitud}
        />

        <Input
          label="Pendiente (°)"
          name="pendiente"
          type="number"
          step="0.1"
          min="0"
          max="90"
          value={form.pendiente}
          onChange={(e) => {
            setForm({ ...form, pendiente: e.target.value });
            if (errors.pendiente) setErrors((prev) => ({ ...prev, pendiente: undefined }));
          }}
          placeholder="Opcional"
          error={errors.pendiente}
        />
      </div>

      <Textarea
        label="Notas"
        name="notas"
        value={form.notas}
        onChange={(e) => {
          setForm({ ...form, notas: e.target.value });
          if (errors.notas) setErrors((prev) => ({ ...prev, notas: undefined }));
        }}
        placeholder="Observaciones sobre el lote (opcional, máx 500 caracteres)"
        rows={3}
        error={errors.notas}
      />

      {/* Map preview section — only show for new lotes (not edit mode) */}
      {!isEditMode && (
        <div className="pt-2 border-t border-[var(--border-subtle)]">
          <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">
            Área en el mapa (opcional)
          </p>
          <div
            style={{
              background: "var(--color-brand-bg)",
              border: "1px dashed var(--color-brand)",
              borderRadius: "10px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                fill="var(--color-brand)"
                fillOpacity="0.3"
                stroke="var(--color-brand)"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="9" r="2.5" fill="var(--color-brand)" />
            </svg>
            <p style={{ fontSize: "13px", color: "var(--color-text-soft)", textAlign: "center", margin: 0 }}>
              El lote se creará sin área dibujada.<br />
              Puedes dibujarlo después desde el módulo Mapa.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full mt-3"
            onClick={handleDrawInMap}
            loading={drawLoading}
            disabled={drawLoading}
          >
            <MapPin size={14} />
            Dibujar área en el mapa
          </Button>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={drawLoading}>
          Cancelar
        </Button>
        <SubmitButton isEditMode={isEditMode} disabled={drawLoading} />
      </div>
    </form>
  );
}
