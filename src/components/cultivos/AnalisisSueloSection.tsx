"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Plus, Trash2, Pencil, Info, TrendingUp, TrendingDown, Minus, X, Clock } from "lucide-react";
import { Button, Modal, Input, Select, Textarea } from "@/components/ui";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
import { TEXTURA_SUELO_LABELS, ETAPA_LABELS } from "@/types";
import { RANGOS_SUELO, NIVEL_COLOR, evaluarNivel } from "@/lib/agronomia/suelo-referencia";
import {
  PARAMETROS_SUELO,
  tablaEvolucion,
  relacionesCationicas,
  mesesDesdeUltimo,
  fmtValor,
  MESES_SUGERIDOS_REPETIR,
} from "@/lib/agronomia/suelo-evolucion";
import { analisisSueloFormSchema } from "@/lib/validations";
import { fmtFecha } from "@/components/seguros/seguros-util";
import toast from "react-hot-toast";
import type { AnalisisSuelo, TexturaSuelo, EtapaCultivo } from "@prisma/client";

/** Cultivo desde cuyo detalle se registra: los análisis pueden atribuírsele (ciclo de vida). */
export interface CultivoContexto {
  id: string;
  nombre: string;
  etapa: EtapaCultivo;
}

interface AnalisisSueloSectionProps {
  loteId: string;
  analisisInicial: AnalisisSuelo[];
  /** Si viene, el formulario ofrece atribuir el análisis a este cultivo (o al lote entero) y se puede filtrar por él. */
  cultivo?: CultivoContexto;
  /** Se dispara tras crear/editar/eliminar un análisis — ej. para refrescar
   * una recomendación de cultivo calculada a partir del último análisis. */
  onChange?: () => void;
}

// Campos numéricos del formulario (todos se envían como número o null).
const BASICOS = ["ph", "materiaOrganica", "nitrogeno", "fosforo", "potasio", "conductividad"] as const;
const AVANZADOS = ["calcio", "magnesio", "sodio", "aluminio", "cic", "azufre", "boro", "hierro", "manganeso", "zinc", "cobre"] as const;
const NUMERICOS = [...BASICOS, ...AVANZADOS, "profundidadCm"] as const;
type ClaveNum = (typeof NUMERICOS)[number];

const ETIQUETA: Record<string, { label: string; step: string }> = {
  ph: { label: "pH", step: "0.1" },
  materiaOrganica: { label: "Materia orgánica (%)", step: "0.1" },
  nitrogeno: { label: "Nitrógeno N (%)", step: "0.01" },
  fosforo: { label: "Fósforo P (ppm)", step: "0.1" },
  potasio: { label: "Potasio K (meq/100g)", step: "0.01" },
  conductividad: { label: "Conductividad (dS/m)", step: "0.1" },
  calcio: { label: "Calcio Ca (meq/100g)", step: "0.01" },
  magnesio: { label: "Magnesio Mg (meq/100g)", step: "0.01" },
  sodio: { label: "Sodio Na (meq/100g)", step: "0.01" },
  aluminio: { label: "Aluminio Al (meq/100g)", step: "0.01" },
  cic: { label: "CIC (meq/100g)", step: "0.1" },
  azufre: { label: "Azufre S (ppm)", step: "0.1" },
  boro: { label: "Boro B (ppm)", step: "0.01" },
  hierro: { label: "Hierro Fe (ppm)", step: "0.1" },
  manganeso: { label: "Manganeso Mn (ppm)", step: "0.1" },
  zinc: { label: "Zinc Zn (ppm)", step: "0.01" },
  cobre: { label: "Cobre Cu (ppm)", step: "0.01" },
  profundidadCm: { label: "Profundidad (cm)", step: "1" },
};

const MAX_FOTOS = 4;
const hoyISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

type Formulario = { fechaMuestreo: string; textura: TexturaSuelo | ""; laboratorio: string; notas: string; atribucion: string } & Record<ClaveNum, string>;

const vacio = (atribucion: string): Formulario => ({
  fechaMuestreo: hoyISO(),
  textura: "",
  laboratorio: "",
  notas: "",
  atribucion,
  ...(Object.fromEntries(NUMERICOS.map((k) => [k, ""])) as Record<ClaveNum, string>),
});

export function AnalisisSueloSection({ loteId, analisisInicial, cultivo, onChange }: AnalisisSueloSectionProps) {
  const [analisis, setAnalisis] = useState(analisisInicial);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario>(vacio(cultivo?.id ?? ""));
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [soloCultivo, setSoloCultivo] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);

  const visibles = useMemo(
    () => (soloCultivo && cultivo ? analisis.filter((a) => a.cultivoId === cultivo.id) : analisis),
    [analisis, soloCultivo, cultivo]
  );
  const evolucion = useMemo(() => tablaEvolucion(visibles), [visibles]);
  const ultimo = useMemo(() => [...visibles].sort((a, b) => new Date(b.fechaMuestreo).getTime() - new Date(a.fechaMuestreo).getTime())[0], [visibles]);
  const relaciones = ultimo ? relacionesCationicas(ultimo) : null;
  const meses = mesesDesdeUltimo(visibles);
  const doCultivo = cultivo ? analisis.filter((a) => a.cultivoId === cultivo.id).length : 0;

  const handleOpen = (a?: AnalisisSuelo) => {
    if (a) {
      setEditingId(a.id);
      setForm({
        fechaMuestreo: new Date(a.fechaMuestreo).toISOString().split("T")[0],
        textura: a.textura ?? "",
        laboratorio: a.laboratorio ?? "",
        notas: a.notas ?? "",
        atribucion: a.cultivoId ?? "",
        ...(Object.fromEntries(NUMERICOS.map((k) => [k, (a[k as keyof AnalisisSuelo] as number | null)?.toString() ?? ""])) as Record<ClaveNum, string>),
      });
      setImagenes(a.imagenes ?? []);
    } else {
      setEditingId(null);
      setForm(vacio(cultivo?.id ?? ""));
      setImagenes([]);
    }
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const payload = {
      fechaMuestreo: form.fechaMuestreo,
      textura: form.textura || null,
      laboratorio: form.laboratorio || null,
      notas: form.notas || null,
      cultivoId: form.atribucion || null,
      imagenes,
      ...(Object.fromEntries(NUMERICOS.map((k) => [k, form[k] === "" ? null : Number(form[k])])) as Record<ClaveNum, number | null>),
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
        setAnalisis((prev) => [json.data, ...prev].sort((a, b) => new Date(b.fechaMuestreo).getTime() - new Date(a.fechaMuestreo).getTime()));
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
              const res = await fetch(`/api/analisis-suelo/${id}`, { method: "DELETE" });
              if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "No se pudo eliminar el análisis");
              setAnalisis((prev) => prev.filter((a) => a.id !== id));
              toast.success("Análisis eliminado");
              onChange?.();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Error al eliminar");
            }
          }}
          className="px-3 py-1 bg-negative-400 text-white text-[12px] rounded-md font-medium"
        >
          Eliminar
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 border border-[var(--border-default)] text-[12px] rounded-md">
          Cancelar
        </button>
      </div>
    ), { duration: 10000 });
  };

  const badgeAtribucion = (a: AnalisisSuelo) => {
    if (!cultivo) return null;
    if (a.cultivoId === cultivo.id) return <span className="badge badge-success text-[10px]">Este cultivo{a.etapa ? ` · ${ETAPA_LABELS[a.etapa]}` : ""}</span>;
    if (a.cultivoId) return <span className="badge badge-neutral text-[10px]">Otro cultivo del lote</span>;
    return <span className="badge badge-neutral text-[10px]">Todo el lote</span>;
  };

  const Tend = ({ t }: { t: "sube" | "baja" | "igual" | null }) =>
    t === "sube" ? <TrendingUp size={12} className="text-amber-600 inline" aria-label="Sube" /> : t === "baja" ? <TrendingDown size={12} className="text-info-600 inline" aria-label="Baja" /> : t === "igual" ? <Minus size={12} className="text-[var(--text-muted)] inline" aria-label="Estable" /> : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] gap-2 flex-wrap">
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <FlaskConical size={15} className="text-agro-400" />
          Análisis de suelo
          <span className="ml-1 text-[12px] font-normal text-[var(--text-muted)]">{visibles.length} registro(s)</span>
        </h2>
        <Button size="sm" onClick={() => handleOpen()}>
          <Plus size={13} /> Nuevo análisis
        </Button>
      </div>

      {(cultivo || meses !== null) && (
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-3 flex-wrap text-[12px]">
          {cultivo && (
            <div role="group" aria-label="Filtrar análisis" className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--surface-page)] p-1">
              <button type="button" aria-pressed={!soloCultivo} onClick={() => setSoloCultivo(false)} className={`px-3 py-1.5 min-h-[32px] rounded-[var(--radius-sm)] ${!soloCultivo ? "bg-white shadow-sm font-semibold" : "text-[var(--text-secondary)]"}`}>
                Todos los del lote ({analisis.length})
              </button>
              <button type="button" aria-pressed={soloCultivo} onClick={() => setSoloCultivo(true)} className={`px-3 py-1.5 min-h-[32px] rounded-[var(--radius-sm)] ${soloCultivo ? "bg-white shadow-sm font-semibold" : "text-[var(--text-secondary)]"}`}>
                De este cultivo ({doCultivo})
              </button>
            </div>
          )}
          {meses !== null && (
            <span className={`inline-flex items-center gap-1 ${meses >= MESES_SUGERIDOS_REPETIR ? "text-[#8A5E20]" : "text-[var(--text-muted)]"}`}>
              <Clock size={12} />
              Último análisis: {meses === 0 ? "este mes" : `hace ${meses} ${meses === 1 ? "mes" : "meses"}`}
              {meses >= MESES_SUGERIDOS_REPETIR && " — conviene repetirlo (sugerencia: al menos una vez al año)"}
            </span>
          )}
        </div>
      )}

      {evolucion.fechas.length >= 2 && (
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] overflow-x-auto">
          <div className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">Evolución en el tiempo</div>
          <table className="w-full text-[12px] border-collapse min-w-[420px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                <th className="py-1.5 pr-3 font-medium">Parámetro</th>
                {evolucion.fechas.map((f, i) => <th key={i} className="py-1.5 px-2 font-medium whitespace-nowrap text-right">{fmtFecha(f)}</th>)}
                <th className="py-1.5 pl-2 font-medium text-center">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {evolucion.filas.map(({ parametro, valores, tendencia }) => (
                <tr key={parametro.key} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{parametro.label}{parametro.unidad ? <span className="text-[var(--text-muted)]"> ({parametro.unidad})</span> : null}</td>
                  {valores.map((v, i) => <td key={i} className="py-1.5 px-2 text-right tabular-nums">{fmtValor(v, parametro.decimales)}</td>)}
                  <td className="py-1.5 pl-2 text-center"><Tend t={tendencia} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {relaciones && (relaciones.caMg !== null || relaciones.mgK !== null || relaciones.saturacionAl !== null) && (
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)] flex flex-wrap gap-x-5 gap-y-1">
          <span className="font-semibold">Último análisis — relaciones:</span>
          {relaciones.caMg !== null && <span>Ca/Mg <b>{fmtValor(relaciones.caMg, 1)}</b></span>}
          {relaciones.mgK !== null && <span>Mg/K <b>{fmtValor(relaciones.mgK, 1)}</b></span>}
          {relaciones.caMgK !== null && <span>(Ca+Mg)/K <b>{fmtValor(relaciones.caMgK, 1)}</b></span>}
          {relaciones.saturacionAl !== null && <span>Saturación de Al <b>{fmtValor(relaciones.saturacionAl, 1)}%</b></span>}
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[13px] text-[var(--text-muted)]">
            {soloCultivo ? "Este cultivo todavía no tiene análisis de suelo atribuidos." : "Sin análisis de suelo registrados para este lote todavía."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {visibles.map((a) => (
            <div key={a.id} className="px-5 py-4">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div>
                  <div className="text-[13px] font-medium text-[var(--text-primary)] flex items-center gap-2 flex-wrap">
                    {fmtFecha(a.fechaMuestreo)}
                    {badgeAtribucion(a)}
                  </div>
                  {a.laboratorio && <div className="text-[11px] text-[var(--text-muted)]">{a.laboratorio}</div>}
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {[a.textura ? `Textura: ${TEXTURA_SUELO_LABELS[a.textura]}` : null, a.profundidadCm ? `Profundidad: ${a.profundidadCm} cm` : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleOpen(a)} className="p-2 hover:bg-[var(--surface-page)] rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-agro-600" aria-label="Editar análisis">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="p-2 hover:bg-negative-50 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-negative-400" aria-label="Eliminar análisis">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {PARAMETROS_SUELO.map((p) => {
                  const valor = a[p.key as keyof AnalisisSuelo] as number | null;
                  if (valor === null || valor === undefined) return null;
                  if (p.conReferencia && RANGOS_SUELO[p.key]) {
                    const color = NIVEL_COLOR[evaluarNivel(p.key, valor)];
                    return (
                      <div key={p.key} className="px-2.5 py-1.5 rounded-[var(--radius-md)] text-[11px]" style={{ background: color.bg, color: color.text }}
                        title={`Rango de referencia general: ${RANGOS_SUELO[p.key].min}–${RANGOS_SUELO[p.key].max} ${RANGOS_SUELO[p.key].unidad}`}>
                        <span className="font-medium">{p.label}:</span> {valor}{p.unidad === "%" ? "%" : p.unidad ? ` ${p.unidad}` : ""} · {color.label}
                      </div>
                    );
                  }
                  return (
                    <div key={p.key} className="px-2.5 py-1.5 rounded-[var(--radius-md)] text-[11px] bg-[var(--surface-page)] text-[var(--text-secondary)]">
                      <span className="font-medium">{p.label}:</span> {valor} {p.unidad}
                    </div>
                  );
                })}
              </div>

              {a.notas && <p className="mt-2 text-[12px] text-[var(--text-secondary)]">{a.notas}</p>}

              {(a.imagenes?.length ?? 0) > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {a.imagenes.map((src, i) => (
                    <button key={i} type="button" onClick={() => setFoto(src)} aria-label={`Ver foto ${i + 1} del informe`} className="w-14 h-14 rounded-md overflow-hidden border border-[var(--border-default)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Informe de laboratorio ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-page)] rounded-b-[var(--radius-lg)]">
        <Info size={13} className="text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--text-muted)]">
          Los niveles (Bajo/Óptimo/Alto) solo se muestran para pH, materia orgánica, N, P, K y conductividad, con rangos de referencia
          generales para cultivos perennes tropicales — todavía no específicos por cultivo/variedad. Los demás parámetros y las relaciones
          entre bases se muestran tal como los registraste, sin interpretación. No reemplazan la recomendación de un agrónomo.
        </p>
      </div>

      {/* Modal crear/editar */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? "Editar análisis de suelo" : "Nuevo análisis de suelo"} size="lg">
        <div className="space-y-4">
          {cultivo && (
            <Select
              label="Este análisis corresponde a"
              value={form.atribucion}
              onChange={(e) => setForm({ ...form, atribucion: e.target.value })}
              options={[
                { value: cultivo.id, label: `${cultivo.nombre} — etapa actual: ${ETAPA_LABELS[cultivo.etapa]}` },
                { value: "", label: "Todo el lote (sin atribuir a un cultivo)" },
              ]}
              error={errors.cultivoId}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Fecha de muestreo *" type="date" value={form.fechaMuestreo} max={hoyISO()} onChange={(e) => setForm({ ...form, fechaMuestreo: e.target.value })} error={errors.fechaMuestreo} />
            <Input label="Laboratorio" value={form.laboratorio} onChange={(e) => setForm({ ...form, laboratorio: e.target.value })} placeholder="Ej: Agrilab S.A.S" error={errors.laboratorio} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BASICOS.map((k) => (
              <Input key={k} label={ETIQUETA[k].label} type="number" inputMode="decimal" step={ETIQUETA[k].step} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} error={errors[k]} />
            ))}
          </div>

          <details className="rounded-[var(--radius-md)] border border-[var(--border-default)] p-3">
            <summary className="cursor-pointer text-[13px] font-medium text-[var(--text-secondary)]">Más parámetros del laboratorio (bases, CIC, azufre, micronutrientes)</summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {AVANZADOS.map((k) => (
                <Input key={k} label={ETIQUETA[k].label} type="number" inputMode="decimal" step={ETIQUETA[k].step} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} error={errors[k]} />
              ))}
            </div>
          </details>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Textura"
              value={form.textura}
              onChange={(e) => setForm({ ...form, textura: e.target.value as TexturaSuelo })}
              placeholder="Selecciona (opcional)"
              options={Object.entries(TEXTURA_SUELO_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Input label={ETIQUETA.profundidadCm.label} type="number" inputMode="numeric" step="1" value={form.profundidadCm} onChange={(e) => setForm({ ...form, profundidadCm: e.target.value })} error={errors.profundidadCm} placeholder="Ej: 30" />
          </div>

          <Textarea label="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones del muestreo, recomendaciones del laboratorio..." rows={2} error={errors.notas} />

          <div>
            <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">Foto del informe del laboratorio ({imagenes.length}/{MAX_FOTOS})</div>
            <div className="flex flex-wrap gap-2 items-center">
              {imagenes.map((src, i) => (
                <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-[var(--border-default)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => setImagenes((prev) => prev.filter((_, j) => j !== i))} className="absolute top-0 right-0 bg-black/60 text-white rounded-bl-md p-0.5">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {imagenes.length < MAX_FOTOS && <PhotoCapture onCapture={(u) => setImagenes((prev) => [...prev, u])} onRemove={() => {}} preview={null} />}
            </div>
            {errors.imagenes && <p className="text-[11px] text-negative-400 mt-1">{errors.imagenes}</p>}
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleSubmit}>{editingId ? "Guardar cambios" : "Registrar análisis"}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!foto} onClose={() => setFoto(null)} title="Informe de laboratorio" size="lg">
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="Informe de laboratorio" className="w-full h-auto rounded-md" />
        )}
      </Modal>
    </div>
  );
}
