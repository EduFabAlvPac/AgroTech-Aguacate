"use client";

import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
import { RIESGO_LABELS } from "@/types";
import toast from "react-hot-toast";
import { siniestroSchema } from "@/lib/validations";
import { polizaCubre, perdidaSugerida } from "@/lib/seguros";
import type { CultivoOpcion, PolizaVista } from "@/lib/data/seguros";
import { crearSiniestro } from "@/app/(dashboard)/dashboard/seguros/seguro-actions";
import { numOrNull } from "@/components/seguros/seguros-util";
import { formatCOPFull } from "@/lib/utils";
import type { RiesgoAsegurado } from "@prisma/client";

interface Props {
  cultivos: CultivoOpcion[];
  polizas: PolizaVista[];
  /** Fecha de hoy (YYYY-MM-DD) calculada en el servidor: evita desfase servidor/navegador. */
  hoy: string;
  inicial?: { cultivoId?: string | null; tipo?: string | null; fecha?: string | null };
  onDone: () => void;
}

const MAX_FOTOS = 6;

export function SiniestroForm({ cultivos, polizas, hoy, inicial, onDone }: Props) {
  const [pending, startTransition] = useTransition();
  const [cultivoId, setCultivoId] = useState(inicial?.cultivoId ?? cultivos[0]?.id ?? "");
  const [tipo, setTipo] = useState<string>(inicial?.tipo && RIESGO_LABELS[inicial.tipo] ? inicial.tipo : "");
  const [fecha, setFecha] = useState(inicial?.fecha || hoy);
  const [descripcion, setDescripcion] = useState("");
  const [area, setArea] = useState("");
  const [danio, setDanio] = useState("");
  const [perdida, setPerdida] = useState("");
  const [polizaId, setPolizaId] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Pólizas que SÍ responderían por este cultivo + evento + fecha.
  const candidatas = useMemo(() => {
    if (!cultivoId || !tipo || !fecha) return [];
    const f = new Date(`${fecha}T12:00:00Z`);
    return polizas.filter((p) =>
      polizaCubre(
        { estado: p.estado, fechaInicio: new Date(p.fechaInicio), fechaFin: new Date(p.fechaFin), riesgos: p.riesgos, cultivoIds: p.cultivos.map((c) => c.id) },
        cultivoId,
        tipo as RiesgoAsegurado,
        f
      )
    );
  }, [polizas, cultivoId, tipo, fecha]);

  // Si había una póliza elegida que dejó de aplicar (cambió cultivo/tipo/fecha), se limpia.
  const polizaEfectiva = candidatas.some((p) => p.id === polizaId) ? polizaId : candidatas.length === 1 ? candidatas[0].id : "";
  const sugerida = perdidaSugerida(candidatas.find((p) => p.id === polizaEfectiva)?.sumaAsegurada, numOrNull(danio));

  const enviar = () => {
    setError("");
    const a = numOrNull(area), d = numOrNull(danio), p = numOrNull(perdida);
    if ([a, d, p].some((n) => Number.isNaN(n))) return setError("Revisa los números: área, % de daño y pérdida deben ser numéricos.");
    const datos = {
      cultivoId,
      polizaId: polizaEfectiva || null,
      tipo,
      fechaEvento: fecha,
      descripcion,
      areaAfectadaHa: a,
      porcentajeDanio: d,
      perdidaEstimada: p,
      imagenes,
      notas: notas || null,
    };
    const check = siniestroSchema.safeParse(datos);
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Revisa los datos");

    startTransition(async () => {
      const r = await crearSiniestro(datos);
      if (r.error) return setError(r.error);
      toast.success("Siniestro registrado. Ya puedes generar el expediente.");
      onDone();
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Cultivo afectado"
          value={cultivoId}
          onChange={(e) => setCultivoId(e.target.value)}
          options={cultivos.map((c) => ({ value: c.id, label: c.nombre }))}
          placeholder="Elige el cultivo"
        />
        <Select
          label="¿Qué ocurrió?"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          options={Object.entries(RIESGO_LABELS).map(([value, label]) => ({ value, label }))}
          placeholder="Tipo de evento"
        />
      </div>

      <Input label="Fecha del evento" type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} />

      <Textarea
        label="Describe lo ocurrido"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        rows={3}
        placeholder="Ej: tres semanas sin lluvia, hojas caídas y frutos pequeños en el lote norte"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input label="Área afectada (ha)" type="number" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} />
        <Input label="Daño estimado (%)" type="number" inputMode="numeric" value={danio} onChange={(e) => setDanio(e.target.value)} />
        <Input label="Pérdida estimada (COP)" type="number" inputMode="decimal" value={perdida} onChange={(e) => setPerdida(e.target.value)} />
      </div>
      {sugerida != null && !perdida && (
        <button type="button" onClick={() => setPerdida(String(sugerida))} className="text-[12px] text-agro-600 underline">
          Usar {formatCOPFull(sugerida)} (suma asegurada × % de daño)
        </button>
      )}

      {tipo && cultivoId && (
        candidatas.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] rounded-[var(--radius-md)] bg-[var(--surface-page)] p-3">
            Ninguna de tus pólizas cubre este evento en este cultivo en esa fecha. Puedes registrarlo igual como evidencia (sin póliza).
          </p>
        ) : (
          <Select
            label="Póliza que aplica"
            value={polizaEfectiva}
            onChange={(e) => setPolizaId(e.target.value)}
            options={[{ value: "", label: "Sin póliza (solo evidencia)" }, ...candidatas.map((p) => ({ value: p.id, label: `${p.aseguradora}${p.numeroPoliza ? ` · ${p.numeroPoliza}` : ""}` }))]}
          />
        )
      )}

      <div>
        <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">Fotos del daño ({imagenes.length}/{MAX_FOTOS})</div>
        <div className="flex flex-wrap gap-2 items-center">
          {imagenes.map((src, i) => (
            <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-[var(--border-default)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                aria-label={`Quitar foto ${i + 1}`}
                onClick={() => setImagenes((prev) => prev.filter((_, j) => j !== i))}
                className="absolute top-0 right-0 bg-black/60 text-white rounded-bl-md p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {imagenes.length < MAX_FOTOS && <PhotoCapture onCapture={(u) => setImagenes((prev) => [...prev, u])} onRemove={() => {}} preview={null} />}
        </div>
      </div>

      <Textarea label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />

      {error && <p role="alert" className="text-[13px] text-negative-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onDone} disabled={pending}>Cancelar</Button>
        <Button onClick={enviar} loading={pending}>Registrar siniestro</Button>
      </div>
    </div>
  );
}
