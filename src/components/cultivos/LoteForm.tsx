"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui";
import { loteFormSchema } from "@/lib/validations";
import toast from "react-hot-toast";
import type { Lote } from "@prisma/client";

interface LoteFormProps {
  fincaId: string;
  lote?: Lote | null;
  onSuccess: (lote: Lote) => void;
  onCancel: () => void;
  fincaCoords?: { lat: number; lng: number };
}

type FormErrors = Partial<Record<"nombre" | "areaHa" | "altitud" | "pendiente" | "notas", string>>;

export function LoteForm({ fincaId, lote, onSuccess, onCancel, fincaCoords }: LoteFormProps) {
  const isEditMode = !!lote;
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [drawLoading, setDrawLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    nombre: lote?.nombre ?? "",
    areaHa: lote?.areaHa?.toString() ?? "",
    altitud: lote?.altitud?.toString() ?? "",
    pendiente: lote?.pendiente?.toString() ?? "",
    notas: lote?.notas ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const url = isEditMode ? `/api/lotes/${lote.id}` : "/api/lotes";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Error al guardar el lote");
      }

      const { data } = await res.json();
      toast.success(isEditMode ? "Lote actualizado correctamente" : "Lote creado correctamente");
      onSuccess(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar el lote. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrawInMap = async () => {
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
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setDrawLoading(true);

    try {
      const res = await fetch("/api/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Error al guardar el lote");
      }

      const { data } = await res.json();
      router.push(`/dashboard/mapa?action=draw&loteId=${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar el lote");
    } finally {
      setDrawLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre del lote"
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
              background: "#EAF3DE",
              border: "1px dashed #639922",
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
                fill="#639922"
                fillOpacity="0.3"
                stroke="#639922"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="9" r="2.5" fill="#639922" />
            </svg>
            <p style={{ fontSize: "13px", color: "#5F7052", textAlign: "center", margin: 0 }}>
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
            disabled={loading || drawLoading}
          >
            <MapPin size={14} />
            Dibujar área en el mapa
          </Button>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading || drawLoading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={loading || drawLoading}>
          {isEditMode ? "Guardar cambios" : "Crear lote"}
        </Button>
      </div>
    </form>
  );
}
