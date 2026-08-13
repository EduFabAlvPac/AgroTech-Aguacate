"use client";

import { useState } from "react";
import { FlaskConical, Plus, Trash2, Pencil, Info } from "lucide-react";
import { Button, Modal, Input, Select, Textarea } from "@/components/ui";
import { TEXTURA_SUELO_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";
import { RANGOS_SUELO, NIVEL_COLOR, evaluarNivel } from "@/lib/agronomia/suelo-referencia";
import { analisisSueloFormSchema } from "@/lib/validations";
import toast from "react-hot-toast";
import type { AnalisisSuelo, TexturaSuelo } from "@prisma/client";

interface AnalisisSueloSectionProps {
  loteId: string;
  analisisInicial: AnalisisSuelo[];
  /** Se dispara tras crear/editar/eliminar un análisis — ej. para refrescar
   * una recomendación de cultivo calculada a partir del último análisis. */
  onChange?: () => void;
}

const emptyForm = {
  fechaMuestreo: new Date().toISOString().split("T")[0],
  ph: "", materiaOrganica: "", nitrogeno: "", fosforo: "", potasio: "",
  textura: "" as TexturaSuelo | "",
  conductividad: "", laboratorio: "", notas: "",
};

const CAMPOS_NUMERICOS: { key: keyof typeof RANGOS_SUELO; label: string }[] = [
  { key: "ph", label: "pH" },
  { key: "materiaOrganica", label: "Materia orgánica (%)" },
  { key: "nitrogeno", label: "Nitrógeno N (%)" },
  { key: "fosforo", label: "Fósforo P (ppm)" },
  { key: "potasio", label: "Potasio K (meq/100g)" },
  { key: "conductividad", label: "Conductividad (dS/m)" },
];

export function AnalisisSueloSection({ loteId, analisisInicial, onChange }: AnalisisSueloSectionProps) {
  const [analisis, setAnalisis] = useState(analisisInicial);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleOpen = (a?: AnalisisSuelo) => {
    if (a) {
      setEditingId(a.id);
      setForm({
        fechaMuestreo: new Date(a.fechaMuestreo).toISOString().split("T")[0],
        ph: a.ph?.toString() ?? "",
        materiaOrganica: a.materiaOrganica?.toString() ?? "",
        nitrogeno: a.nitrogeno?.toString() ?? "",
        fosforo: a.fosforo?.toString() ?? "",
        potasio: a.potasio?.toString() ?? "",
        textura: a.textura ?? "",
        conductividad: a.conductividad?.toString() ?? "",
        laboratorio: a.laboratorio ?? "",
        notas: a.notas ?? "",
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const payload = {
      ...form,
      ph: form.ph ? Number(form.ph) : undefined,
      materiaOrganica: form.materiaOrganica ? Number(form.materiaOrganica) : undefined,
      nitrogeno: form.nitrogeno ? Number(form.nitrogeno) : undefined,
      fosforo: form.fosforo ? Number(form.fosforo) : undefined,
      potasio: form.potasio ? Number(form.potasio) : undefined,
      conductividad: form.conductividad ? Number(form.conductividad) : undefined,
    };

    const result = analisisSueloFormSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString();
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const url = editingId ? `/api/analisis-suelo/${editingId}` : `/api/lotes/${loteId}/analisis-suelo`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar el análisis");

      if (editingId) {
        setAnalisis((prev) => prev.map((a) => (a.id === editingId ? json.data : a)).sort((a, b) => new Date(b.fechaMuestreo).getTime() - new Date(a.fechaMuestreo).getTime()));
        toast.success("Análisis actualizado");
      } else {
        setAnalisis((prev) => [json.data, ...prev]);
        toast.success("Análisis registrado");
      }
      setShowModal(false);
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar el análisis");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-[13px]">¿Eliminar este análisis de suelo?</span>
        <button
          onClick={async () => {
            toast.dismiss(t.id);
            try {
              await fetch(`/api/analisis-suelo/${id}`, { method: "DELETE" });
              setAnalisis((prev) => prev.filter((a) => a.id !== id));
              toast.success("Análisis eliminado");
              onChange?.();
            } catch {
              toast.error("Error al eliminar");
            }
          }}
          className="px-3 py-1 bg-red-500 text-white text-[12px] rounded-md font-medium"
        >
          Eliminar
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 border border-[var(--border-default)] text-[12px] rounded-md">
          Cancelar
        </button>
      </div>
    ), { duration: 10000 });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <FlaskConical size={15} className="text-agro-400" />
          Análisis de suelo
          <span className="ml-1 text-[12px] font-normal text-[var(--text-muted)]">{analisis.length} registro(s)</span>
        </h2>
        <Button size="sm" onClick={() => handleOpen()}>
          <Plus size={13} /> Nuevo análisis
        </Button>
      </div>

      {analisis.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[13px] text-[var(--text-muted)]">
            Sin análisis de suelo registrados para este lote todavía.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {analisis.map((a) => (
            <div key={a.id} className="px-5 py-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">
                    {formatDate(a.fechaMuestreo, true)}
                  </div>
                  {a.laboratorio && <div className="text-[11px] text-[var(--text-muted)]">{a.laboratorio}</div>}
                  {a.textura && <div className="text-[11px] text-[var(--text-muted)]">Textura: {TEXTURA_SUELO_LABELS[a.textura]}</div>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleOpen(a)} className="p-1.5 hover:bg-[var(--surface-page)] rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-agro-600" aria-label="Editar">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-red-50 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-red-500" aria-label="Eliminar">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {CAMPOS_NUMERICOS.map(({ key, label }) => {
                  const valor = a[key as keyof AnalisisSuelo] as number | null;
                  if (valor === null || valor === undefined) return null;
                  const nivel = evaluarNivel(key, valor);
                  const color = NIVEL_COLOR[nivel];
                  return (
                    <div
                      key={key}
                      className="px-2.5 py-1.5 rounded-[var(--radius-md)] text-[11px]"
                      style={{ background: color.bg, color: color.text }}
                      title={`Rango de referencia general: ${RANGOS_SUELO[key].min}–${RANGOS_SUELO[key].max} ${RANGOS_SUELO[key].unidad}`}
                    >
                      <span className="font-medium">{label}:</span> {valor}{RANGOS_SUELO[key].unidad} · {color.label}
                    </div>
                  );
                })}
              </div>

              {a.notas && <p className="mt-2 text-[12px] text-[var(--text-secondary)]">{a.notas}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-page)] rounded-b-[var(--radius-lg)]">
        <Info size={13} className="text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--text-muted)]">
          Los niveles (Bajo/Óptimo/Alto) usan rangos de referencia agronómica generales para cultivos perennes
          tropicales — todavía no específicos por cultivo/variedad. No reemplazan la recomendación de un agrónomo.
        </p>
      </div>

      {/* Modal crear/editar */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? "Editar análisis de suelo" : "Nuevo análisis de suelo"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha de muestreo *"
              type="date"
              value={form.fechaMuestreo}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm({ ...form, fechaMuestreo: e.target.value })}
              error={errors.fechaMuestreo}
            />
            <Input
              label="Laboratorio"
              value={form.laboratorio}
              onChange={(e) => setForm({ ...form, laboratorio: e.target.value })}
              placeholder="Ej: Agrilab S.A.S"
              error={errors.laboratorio}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="pH" type="number" step="0.1" value={form.ph} onChange={(e) => setForm({ ...form, ph: e.target.value })} error={errors.ph} />
            <Input label="Materia orgánica (%)" type="number" step="0.1" value={form.materiaOrganica} onChange={(e) => setForm({ ...form, materiaOrganica: e.target.value })} error={errors.materiaOrganica} />
            <Input label="Nitrógeno N (%)" type="number" step="0.01" value={form.nitrogeno} onChange={(e) => setForm({ ...form, nitrogeno: e.target.value })} error={errors.nitrogeno} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Fósforo P (ppm)" type="number" step="0.1" value={form.fosforo} onChange={(e) => setForm({ ...form, fosforo: e.target.value })} error={errors.fosforo} />
            <Input label="Potasio K (meq/100g)" type="number" step="0.01" value={form.potasio} onChange={(e) => setForm({ ...form, potasio: e.target.value })} error={errors.potasio} />
            <Input label="Conductividad (dS/m)" type="number" step="0.1" value={form.conductividad} onChange={(e) => setForm({ ...form, conductividad: e.target.value })} error={errors.conductividad} />
          </div>

          <Select
            label="Textura"
            value={form.textura}
            onChange={(e) => setForm({ ...form, textura: e.target.value as TexturaSuelo })}
            placeholder="Selecciona (opcional)"
            options={Object.entries(TEXTURA_SUELO_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />

          <Textarea
            label="Notas"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            placeholder="Observaciones del muestreo, recomendaciones del laboratorio..."
            rows={2}
            error={errors.notas}
          />

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleSubmit}>{editingId ? "Guardar cambios" : "Registrar análisis"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
