"use client";

import { useState, useEffect } from "react";
import { Button, Input, Select } from "@/components/ui";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
import toast from "react-hot-toast";

type CultivoOption = { id: string; lote: { nombre: string }; variedad: string };

interface RegistroJornalFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ACTIVIDADES = [
  { value: "Fumigada", label: "🧪 Fumigada" },
  { value: "Abonada", label: "🌿 Abonada (fertilización)" },
  { value: "Limpia", label: "🧹 Limpia (desyerbe)" },
  { value: "Riego manual", label: "💧 Riego manual" },
  { value: "Poda", label: "✂️ Poda" },
  { value: "Cosecha", label: "🥑 Cosecha" },
  { value: "Siembra", label: "🌱 Siembra" },
  { value: "Ojeada", label: "👁️ Ojeada (inspección)" },
  { value: "Tutorado", label: "🪵 Tutorado (estacas)" },
  { value: "Aplicación foliar", label: "🍃 Aplicación foliar" },
  { value: "Transporte", label: "🚛 Transporte" },
  { value: "Mantenimiento", label: "🔧 Mantenimiento" },
  { value: "Otro", label: "📝 Otro" },
];

const today = new Date().toISOString().split("T")[0];

export function RegistroJornalForm({ onSuccess, onCancel }: RegistroJornalFormProps) {
  const [cultivos, setCultivos] = useState<CultivoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);

  const [form, setForm] = useState({
    operario: "",
    fecha: today,
    actividad: "Limpia",
    valorDia: "50000",
    horasTrabajadas: "8",
    cultivoId: "",
    descripcion: "",
  });

  // Load cultivos for the dropdown
  useEffect(() => {
    fetch("/api/cultivos")
      .then((r) => r.json())
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setCultivos(data);
          if (data.length > 0) setForm((f) => ({ ...f, cultivoId: data[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.operario.trim()) {
      toast.error("El nombre del operario es obligatorio");
      return;
    }
    if (!form.valorDia || Number(form.valorDia) <= 0) {
      toast.error("El valor del día debe ser mayor a 0");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/jornales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          valorDia: Number(form.valorDia),
          horasTrabajadas: Number(form.horasTrabajadas) || 8,
          cultivoId: form.cultivoId || undefined,
          imagen: foto || undefined,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Error al guardar");
      }

      toast.success("Jornal registrado correctamente");
      setForm({
        operario: form.operario, // Keep operario for consecutive entries
        fecha: today,
        actividad: "Limpia",
        valorDia: form.valorDia, // Keep tarifa
        horasTrabajadas: "8",
        cultivoId: form.cultivoId,
        descripcion: "",
      });
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Error al registrar el jornal");
    } finally {
      setLoading(false);
    }
  };

  const cultivoOptions = cultivos.map((c) => ({
    value: c.id,
    label: `${c.lote.nombre} · ${c.variedad}`,
  }));

  // Calculate display value
  const valorTotal = Number(form.valorDia) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Operario — large touch target */}
      <Input
        label="Nombre del trabajador"
        value={form.operario}
        onChange={(e) => setForm({ ...form, operario: e.target.value })}
        placeholder="Ej: Carlos, Don Pedro, María"
        required
      />

      {/* Fecha + Actividad row */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Fecha"
          type="date"
          value={form.fecha}
          max={today}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
        />
        <Select
          label="Actividad"
          value={form.actividad}
          onChange={(e) => setForm({ ...form, actividad: e.target.value })}
          options={ACTIVIDADES}
        />
      </div>

      {/* Valor + Horas row */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Valor del día (COP)"
          type="number"
          value={form.valorDia}
          onChange={(e) => setForm({ ...form, valorDia: e.target.value })}
          placeholder="50000"
          min="0"
          required
        />
        <Input
          label="Horas trabajadas"
          type="number"
          value={form.horasTrabajadas}
          onChange={(e) => setForm({ ...form, horasTrabajadas: e.target.value })}
          placeholder="8"
          min="1"
          max="16"
        />
      </div>

      {/* Valor display */}
      {valorTotal > 0 && (
        <div className="p-3 bg-agro-50 rounded-[var(--radius-md)] border border-agro-100">
          <div className="text-[11px] text-agro-400 mb-0.5">Total a registrar</div>
          <div className="text-[16px] font-semibold text-agro-600">
            ${valorTotal.toLocaleString("es-CO")} COP
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Se registrará automáticamente como gasto de Mano de obra
          </div>
        </div>
      )}

      {/* Cultivo asociado */}
      {cultivoOptions.length > 0 && (
        <Select
          label="Cultivo asociado"
          value={form.cultivoId}
          onChange={(e) => setForm({ ...form, cultivoId: e.target.value })}
          options={cultivoOptions}
          placeholder="Sin asociar"
        />
      )}

      {/* Descripción opcional */}
      <Input
        label="Notas (opcional)"
        value={form.descripcion}
        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        placeholder="Ej: Fumigada con Mancozeb, lote norte"
      />

      {/* Captura fotográfica — Cuaderno de Campo BPA */}
      <PhotoCapture
        label="Evidencia fotográfica (Cuaderno BPA)"
        preview={foto}
        onCapture={(dataUrl) => setFoto(dataUrl)}
        onRemove={() => setFoto(null)}
      />

      {/* Quick activity chips */}
      <div>
        <div className="text-[11px] text-[var(--text-muted)] mb-2">Actividad rápida</div>
        <div className="flex flex-wrap gap-2">
          {["Fumigada", "Abonada", "Limpia", "Riego manual", "Poda"].map((act) => (
            <button
              key={act}
              type="button"
              onClick={() => setForm({ ...form, actividad: act })}
              className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                form.actividad === act
                  ? "bg-agro-50 border-agro-200 text-agro-600 font-medium"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-page)]"
              }`}
              style={{ minHeight: 36 }}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={loading}>
          Registrar jornal
        </Button>
      </div>
    </form>
  );
}
