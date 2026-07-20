"use client";

import { useState, useEffect } from "react";
import { Button, Input, Select } from "@/components/ui";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
import { Plus, Minus } from "lucide-react";
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

type JornalEntry = { fecha: string };

export function RegistroJornalForm({ onSuccess, onCancel }: RegistroJornalFormProps) {
  const [cultivos, setCultivos] = useState<CultivoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);

  // Shared fields
  const [operario, setOperario] = useState("");
  const [actividad, setActividad] = useState("Limpia");
  const [valorDia, setValorDia] = useState("50000");
  const [cultivoId, setCultivoId] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Multiple entries — each with its own fecha
  const [entries, setEntries] = useState<JornalEntry[]>([{ fecha: today }]);

  useEffect(() => {
    fetch("/api/cultivos")
      .then((r) => r.json())
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setCultivos(data);
          if (data.length > 0) setCultivoId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const addEntry = () => {
    // Next day from last entry
    const lastDate = entries[entries.length - 1]?.fecha || today;
    const next = new Date(lastDate);
    next.setDate(next.getDate() + 1);
    setEntries([...entries, { fecha: next.toISOString().split("T")[0] }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntryFecha = (index: number, fecha: string) => {
    setEntries(entries.map((e, i) => i === index ? { ...e, fecha } : e));
  };

  const totalProyectado = entries.length * (Number(valorDia) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operario.trim()) {
      toast.error("El nombre del operario es obligatorio");
      return;
    }
    if (!valorDia || Number(valorDia) <= 0) {
      toast.error("El valor del día debe ser mayor a 0");
      return;
    }

    setLoading(true);
    let successCount = 0;

    try {
      for (const entry of entries) {
        const res = await fetch("/api/jornales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operario: operario.trim(),
            fecha: entry.fecha,
            horasTrabajadas: 8,
            valorDia: Number(valorDia),
            actividad,
            descripcion: descripcion || undefined,
            cultivoId: cultivoId || undefined,
            imagen: foto || undefined,
          }),
        });

        if (res.ok) successCount++;
      }

      if (successCount === entries.length) {
        toast.success(`${successCount} jornal${successCount > 1 ? "es" : ""} registrado${successCount > 1 ? "s" : ""} ($${totalProyectado.toLocaleString("es-CO")} COP)`);
      } else {
        toast.success(`${successCount}/${entries.length} jornales registrados`);
      }

      // Reset for next batch
      setEntries([{ fecha: today }]);
      setDescripcion("");
      setFoto(null);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Error al registrar jornales");
    } finally {
      setLoading(false);
    }
  };

  const cultivoOptions = cultivos.map((c) => ({
    value: c.id,
    label: `${c.lote.nombre} · ${c.variedad}`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Operario */}
      <Input
        label="Nombre del trabajador"
        value={operario}
        onChange={(e) => setOperario(e.target.value)}
        placeholder="Ej: Carlos, Don Pedro, María"
        required
      />

      {/* Actividad + Valor */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Actividad"
          value={actividad}
          onChange={(e) => setActividad(e.target.value)}
          options={ACTIVIDADES}
        />
        <Input
          label="Valor por día (COP)"
          type="number"
          value={valorDia}
          onChange={(e) => setValorDia(e.target.value)}
          placeholder="50000"
          min="0"
          required
        />
      </div>

      {/* Quick activity chips */}
      <div className="flex flex-wrap gap-2">
        {["Fumigada", "Abonada", "Limpia", "Riego manual", "Poda"].map((act) => (
          <button
            key={act}
            type="button"
            onClick={() => setActividad(act)}
            className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
              actividad === act
                ? "bg-agro-50 border-agro-200 text-agro-600 font-medium"
                : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-page)]"
            }`}
          >
            {act}
          </button>
        ))}
      </div>

      {/* Días de trabajo (multiple entries) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[12px] font-medium text-[var(--text-secondary)]">
            Días de trabajo ({entries.length})
          </label>
          <button
            type="button"
            onClick={addEntry}
            className="flex items-center gap-1 text-[11px] text-agro-400 hover:text-agro-600 font-medium"
          >
            <Plus size={12} /> Agregar día
          </button>
        </div>

        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="date"
                value={entry.fecha}
                max={today}
                onChange={(e) => updateEntryFecha(idx, e.target.value)}
                className="flex-1 h-9 px-3 text-[12px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white"
              />
              <span className="text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                ${Number(valorDia).toLocaleString("es-CO")}
              </span>
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  className="p-1 hover:bg-red-50 rounded text-[var(--text-muted)] hover:text-red-500"
                >
                  <Minus size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Total proyectado */}
      <div className="p-3 bg-agro-50 rounded-[var(--radius-md)] border border-agro-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-agro-400">Total proyectado ({entries.length} día{entries.length > 1 ? "s" : ""})</div>
            <div className="text-[18px] font-semibold text-agro-600">
              ${totalProyectado.toLocaleString("es-CO")} COP
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] text-right">
            Se registra automáticamente<br />como gasto de Mano de obra
          </div>
        </div>
      </div>

      {/* Cultivo asociado */}
      {cultivoOptions.length > 0 && (
        <Select
          label="Cultivo asociado"
          value={cultivoId}
          onChange={(e) => setCultivoId(e.target.value)}
          options={cultivoOptions}
          placeholder="Sin asociar"
        />
      )}

      {/* Descripción */}
      <Input
        label="Notas (opcional)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej: Fumigada con Mancozeb, lote norte"
      />

      {/* Photo */}
      <PhotoCapture
        label="Evidencia fotográfica (Cuaderno BPA)"
        preview={foto}
        onCapture={(dataUrl) => setFoto(dataUrl)}
        onRemove={() => setFoto(null)}
      />

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={loading}>
          Registrar {entries.length > 1 ? `${entries.length} jornales` : "jornal"}
        </Button>
      </div>
    </form>
  );
}
