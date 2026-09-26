"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Input, Textarea } from "@/components/ui";
import { RIESGO_LABELS } from "@/types";
import toast from "react-hot-toast";
import { polizaSchema } from "@/lib/validations";
import type { CultivoOpcion, PolizaVista } from "@/lib/data/seguros";
import { crearPoliza, editarPoliza } from "@/app/(dashboard)/dashboard/seguros/seguro-actions";
import { isoDia, numOrNull } from "@/components/seguros/seguros-util";

interface Props {
  cultivos: CultivoOpcion[];
  poliza?: PolizaVista | null;
  /** Nombre de la finca activa, para explicar por qué no hay cultivos que elegir. */
  fincaNombre?: string;
  /** Cultivo que llega preseleccionado (desde el detalle del cultivo). */
  cultivoInicial?: string | null;
  onDone: () => void;
}

const RIESGOS = Object.keys(RIESGO_LABELS);

export function PolizaForm({ cultivos, poliza, cultivoInicial, fincaNombre, onDone }: Props) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    aseguradora: poliza?.aseguradora ?? "",
    numeroPoliza: poliza?.numeroPoliza ?? "",
    sumaAsegurada: poliza?.sumaAsegurada != null ? String(poliza.sumaAsegurada) : "",
    prima: poliza?.prima != null ? String(poliza.prima) : "",
    deduciblePct: poliza?.deduciblePct != null ? String(poliza.deduciblePct) : "",
    fechaInicio: isoDia(poliza?.fechaInicio),
    fechaFin: isoDia(poliza?.fechaFin),
    contacto: poliza?.contacto ?? "",
    notas: poliza?.notas ?? "",
  });
  const [riesgos, setRiesgos] = useState<string[]>(poliza?.riesgos ?? []);
  const [cultivoIds, setCultivoIds] = useState<string[]>(poliza ? poliza.cultivos.map((c) => c.id) : cultivoInicial ? [cultivoInicial] : []);
  const [primaComoGasto, setPrimaComoGasto] = useState(true);
  const [error, setError] = useState("");

  const toggle = (lista: string[], set: (v: string[]) => void, id: string) =>
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  const enviar = () => {
    setError("");
    const suma = numOrNull(form.sumaAsegurada), prima = numOrNull(form.prima), ded = numOrNull(form.deduciblePct);
    if ([suma, prima, ded].some((n) => Number.isNaN(n))) return setError("Revisa los montos: deben ser números.");
    const datos = {
      aseguradora: form.aseguradora,
      numeroPoliza: form.numeroPoliza || null,
      riesgos,
      cultivoIds,
      sumaAsegurada: suma,
      prima,
      deduciblePct: ded,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      contacto: form.contacto || null,
      notas: form.notas || null,
      registrarPrimaComoGasto: !poliza && primaComoGasto,
    };
    const check = polizaSchema.safeParse(datos);
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Revisa los datos");

    startTransition(async () => {
      const r = poliza ? await editarPoliza(poliza.id, datos) : await crearPoliza(datos);
      if (r.error) return setError(r.error);
      toast.success(poliza ? "Póliza actualizada" : "Póliza registrada");
      onDone();
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[var(--text-muted)]">
        Registra la póliza que ya contrataste con tu aseguradora. GermIA no vende seguros: te ayuda a tenerla ligada a tus cultivos y a documentar un siniestro.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Aseguradora" value={form.aseguradora} onChange={(e) => setForm({ ...form, aseguradora: e.target.value })} placeholder="Ej: Seguros Bolívar" />
        <Input label="Número de póliza (opcional)" value={form.numeroPoliza} onChange={(e) => setForm({ ...form, numeroPoliza: e.target.value })} />
      </div>

      <fieldset>
        <legend className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">Riesgos cubiertos</legend>
        <div className="flex flex-wrap gap-2">
          {RIESGOS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={riesgos.includes(r)}
              onClick={() => toggle(riesgos, setRiesgos, r)}
              className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                riesgos.includes(r) ? "bg-agro-50 border-agro-600 text-agro-800 font-medium" : "border-[var(--border-default)] text-[var(--text-secondary)]"
              }`}
            >
              {RIESGO_LABELS[r]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">Cultivos asegurados</legend>
        {cultivos.length === 0 ? (
          <div role="status" className="rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 p-3 text-[12px] text-[#8A5E20] space-y-1">
            <p>
              {fincaNombre ? <>La finca activa <b>«{fincaNombre}»</b> todavía no tiene cultivos.</> : "La finca activa todavía no tiene cultivos."} Una póliza se asocia a los cultivos de una finca.
            </p>
            <p>
              Crea el cultivo en <Link href="/dashboard/cultivos" className="underline font-medium">Cultivos</Link>, o si el cultivo está en otra finca cambia la finca activa desde el selector del menú lateral y vuelve aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-44 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-default)] p-2">
            {cultivos.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-[13px] cursor-pointer py-1">
                <input type="checkbox" checked={cultivoIds.includes(c.id)} onChange={() => toggle(cultivoIds, setCultivoIds, c.id)} className="w-4 h-4" />
                <span>{c.nombre}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input label="Suma asegurada (COP)" type="number" inputMode="decimal" value={form.sumaAsegurada} onChange={(e) => setForm({ ...form, sumaAsegurada: e.target.value })} />
        <Input label="Prima (COP)" type="number" inputMode="decimal" value={form.prima} onChange={(e) => setForm({ ...form, prima: e.target.value })} />
        <Input label="Deducible (%)" type="number" inputMode="decimal" value={form.deduciblePct} onChange={(e) => setForm({ ...form, deduciblePct: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Vigente desde" type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
        <Input label="Vigente hasta" type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
      </div>

      <Input label="Contacto para reclamos (teléfono o correo)" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
      <Textarea label="Notas (opcional)" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />

      {!poliza && (
        <label className="flex items-start gap-2 text-[13px] cursor-pointer">
          <input type="checkbox" checked={primaComoGasto} onChange={(e) => setPrimaComoGasto(e.target.checked)} className="w-4 h-4 mt-0.5" />
          <span>Registrar la prima como gasto en Finanzas <span className="text-[var(--text-muted)]">(solo si escribiste la prima)</span></span>
        </label>
      )}

      {error && <p role="alert" className="text-[13px] text-negative-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onDone} disabled={pending}>Cancelar</Button>
        <Button onClick={enviar} loading={pending} disabled={cultivos.length === 0}>{poliza ? "Guardar cambios" : "Registrar póliza"}</Button>
      </div>
    </div>
  );
}
