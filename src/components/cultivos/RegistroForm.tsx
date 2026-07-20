"use client";

import { useState } from "react";
import { Button, Select, Textarea, Input } from "@/components/ui";
import { TIPO_REGISTRO_LABELS } from "@/types";
import toast from "react-hot-toast";
import { registroFormSchema } from "@/lib/validations";
import type { RegistroCultivo, TipoRegistro } from "@prisma/client";

interface RegistroFormProps {
  cultivoId: string;
  onSuccess: () => void;
  onCancel: () => void;
  registro?: RegistroCultivo;
  onEditSuccess?: (registro: RegistroCultivo) => void;
}

const tipoOptions = Object.entries(TIPO_REGISTRO_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const today = new Date().toISOString().split("T")[0];

type FormErrors = Partial<Record<"tipo" | "descripcion" | "fecha", string>>;

export function RegistroForm({ cultivoId, onSuccess, onCancel, registro, onEditSuccess }: RegistroFormProps) {
  const isEditMode = !!registro;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    tipo: (registro?.tipo ?? "OBSERVACION") as TipoRegistro,
    descripcion: registro?.descripcion ?? "",
    fecha: registro ? new Date(registro.fecha).toISOString().split("T")[0] : today,
  });
  // Financial sync fields
  const [costo, setCosto] = useState("");
  const [ingreso, setIngreso] = useState("");
  const [cantidadKg, setCantidadKg] = useState("");
  const [producto, setProducto] = useState("");

  // Types that typically have costs
  const tiposConCosto = ["FERTILIZACION", "TRATAMIENTO_PLAGAS", "RIEGO", "PODA"];
  const showCostoField = tiposConCosto.includes(form.tipo);
  const showIngresoField = form.tipo === "COSECHA";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = registroFormSchema.safeParse({ ...form, cultivoId });

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
      const url = isEditMode
        ? `/api/cultivos/${cultivoId}/registros/${registro.id}`
        : `/api/cultivos/${cultivoId}/registros`;
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cultivoId,
          // Financial sync fields
          costo: costo ? Number(costo) : undefined,
          ingreso: ingreso ? Number(ingreso) : undefined,
          cantidadKg: cantidadKg ? Number(cantidadKg) : undefined,
          producto: producto || undefined,
        }),
      });

      if (!res.ok) throw new Error(isEditMode ? "Error al actualizar registro" : "Error al crear registro");

      if (isEditMode) {
        const { data } = await res.json();
        onEditSuccess?.(data);
      } else {
        onSuccess();
      }
    } catch {
      toast.error("Error al guardar el registro. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Tipo de actividad"
          value={form.tipo}
          onChange={(e) => {
            setForm({ ...form, tipo: e.target.value as TipoRegistro });
            if (errors.tipo) setErrors((prev) => ({ ...prev, tipo: undefined }));
          }}
          options={tipoOptions}
          error={errors.tipo}
        />
        <Input
          label="Fecha"
          type="date"
          value={form.fecha}
          max={today}
          onChange={(e) => {
            setForm({ ...form, fecha: e.target.value });
            if (errors.fecha) setErrors((prev) => ({ ...prev, fecha: undefined }));
          }}
          error={errors.fecha}
        />
      </div>

      <Textarea
        label="Descripción de la actividad"
        value={form.descripcion}
        onChange={(e) => {
          setForm({ ...form, descripcion: e.target.value });
          if (errors.descripcion) setErrors((prev) => ({ ...prev, descripcion: undefined }));
        }}
        onBlur={() => {
          const result = registroFormSchema.shape.descripcion.safeParse(form.descripcion);
          if (!result.success) {
            setErrors((prev) => ({ ...prev, descripcion: result.error.issues[0]?.message }));
          }
        }}
        placeholder="Describe qué se realizó, cantidades usadas, observaciones importantes..."
        rows={4}
        error={errors.descripcion}
      />

      {/* Financial sync fields — context-aware */}
      {showCostoField && (
        <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] space-y-3">
          <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
            💰 Impacto financiero (opcional)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Costo total (COP)"
              type="number"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="Ej: 85000"
              min="0"
            />
            <Input
              label="Producto utilizado"
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
              placeholder="Ej: Mancozeb 80%"
            />
          </div>
          {costo && Number(costo) > 0 && (
            <p className="text-[11px] text-agro-600 bg-agro-50 px-2 py-1.5 rounded">
              ✅ Se creará automáticamente un gasto de ${Number(costo).toLocaleString("es-CO")} COP en Finanzas
            </p>
          )}
        </div>
      )}

      {showIngresoField && (
        <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] space-y-3">
          <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
            📥 Ingreso de cosecha (opcional)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cantidad cosechada (kg)"
              type="number"
              value={cantidadKg}
              onChange={(e) => setCantidadKg(e.target.value)}
              placeholder="Ej: 120"
              min="0"
            />
            <Input
              label="Ingreso total (COP)"
              type="number"
              value={ingreso}
              onChange={(e) => setIngreso(e.target.value)}
              placeholder="Ej: 384000"
              min="0"
            />
          </div>
          {ingreso && Number(ingreso) > 0 && (
            <p className="text-[11px] text-agro-600 bg-agro-50 px-2 py-1.5 rounded">
              ✅ Se creará automáticamente un ingreso de ${Number(ingreso).toLocaleString("es-CO")} COP en Finanzas
              {cantidadKg && ` (${cantidadKg} kg)`}
            </p>
          )}
        </div>
      )}

      {/* Quick templates */}
      <div>
        <div className="text-[11px] text-[var(--text-muted)] mb-2">Plantillas rápidas</div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Riego aplicado", text: "Riego aplicado: 3 L/planta. Condición del suelo: húmedo." },
            { label: "Fertilización", text: "Fertilización foliar con Nitrofoska 15-15-15, 2g/L. 20L totales aplicados." },
            { label: "Inspección plagas", text: "Inspección de plagas: sin evidencia de daño. Plantas en buen estado general." },
          ].map(({ label, text }) => (
            <button
              key={label}
              type="button"
              onClick={() => setForm({ ...form, descripcion: text })}
              className="text-[11px] px-2.5 py-1 bg-agro-50 hover:bg-agro-100 text-agro-600 rounded-full border border-agro-100 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {isEditMode ? "Guardar cambios" : "Guardar registro"}
        </Button>
      </div>
    </form>
  );
}
