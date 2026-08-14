"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Input, Select } from "@/components/ui";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
import { Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";
import { crearJornales, type JornalActionState } from "@/app/(dashboard)/dashboard/finanzas/jornal-actions";

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

const initialState: JornalActionState = {};

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Registrar {count > 1 ? `${count} jornales` : "jornal"}
    </Button>
  );
}

export function RegistroJornalForm({ onSuccess, onCancel }: RegistroJornalFormProps) {
  const [cultivos, setCultivos] = useState<CultivoOption[]>([]);
  const [foto, setFoto] = useState<string | null>(null);

  const [operario, setOperario] = useState("");
  const [actividad, setActividad] = useState("Limpia");
  const [valorDia, setValorDia] = useState("50000");
  const [cultivoId, setCultivoId] = useState("");
  const [descripcion, setDescripcion] = useState("");

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
    const lastDate = entries[entries.length - 1]?.fecha || today;
    const next = new Date(lastDate);
    next.setDate(next.getDate() + 1);
    const nextStr = next.toISOString().split("T")[0];
    // Bug preexistente encontrado al verificar este módulo con Playwright
    // (Fase 1, ADR-006): cuando la última entrada ya era "hoy", este cálculo
    // generaba una fecha futura que violaba el `max={today}` del input de
    // fecha — el navegador bloqueaba el submit nativo del <form> en
    // silencio (sin disparar el evento submit ni la Server Action), así que
    // el botón "Registrar N jornales" no hacía nada perceptible. Se limita
    // la fecha nueva a "hoy" como tope.
    setEntries([...entries, { fecha: nextStr > today ? today : nextStr }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntryFecha = (index: number, fecha: string) => {
    setEntries(entries.map((e, i) => i === index ? { ...e, fecha } : e));
  };

  const totalProyectado = entries.length * (Number(valorDia) || 0);

  const [state, formAction] = useActionState(crearJornales, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.jornales) {
      const count = state.jornales.length;
      toast.success(`${count} jornal${count > 1 ? "es" : ""} registrado${count > 1 ? "s" : ""} ($${totalProyectado.toLocaleString("es-CO")} COP)`);
      setEntries([{ fecha: today }]);
      setDescripcion("");
      setFoto(null);
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const cultivoOptions = cultivos.map((c) => ({
    value: c.id,
    label: `${c.lote.nombre} · ${c.variedad}`,
  }));

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!operario.trim()) { e.preventDefault(); toast.error("El nombre del operario es obligatorio"); return; }
        if (!valorDia || Number(valorDia) <= 0) { e.preventDefault(); toast.error("El valor del día debe ser mayor a 0"); }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="operario" value={operario} />
      <input type="hidden" name="actividad" value={actividad} />
      <input type="hidden" name="valorDia" value={valorDia} />
      <input type="hidden" name="cultivoId" value={cultivoId} />
      <input type="hidden" name="descripcion" value={descripcion} />
      <input type="hidden" name="imagen" value={foto ?? ""} />
      <input type="hidden" name="entradas" value={JSON.stringify(entries)} />

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
                  className="p-1 hover:bg-negative-50 rounded text-[var(--text-muted)] hover:text-negative-400"
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
        <SubmitButton count={entries.length} />
      </div>
    </form>
  );
}
