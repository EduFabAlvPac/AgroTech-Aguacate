"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus, Rocket, Copy } from "lucide-react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { ESTADO_FICHA_LABELS, TIPO_PLAGA_LABELS, CATEGORIA_LABELS } from "@/types";
import toast from "react-hot-toast";
import type {
  FichaTecnica,
  Variedad,
  EspecieCultivo,
  EtapaFenologica,
  PlagaEnfermedad,
  CostoReferencia,
  PuntoCurvaProduccion,
  TipoPlagaEnfermedad,
  CategoriaGasto,
} from "@prisma/client";

type FichaCompleta = FichaTecnica & {
  variedad: Variedad & { especie: EspecieCultivo };
  etapas: EtapaFenologica[];
  plagas: PlagaEnfermedad[];
  costosRef: CostoReferencia[];
  curvaProduccion: PuntoCurvaProduccion[];
  _count: { cultivos: number };
};

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: "badge-neutral",
  PUBLICADA: "badge-success",
  ARCHIVADA: "badge-warning",
};

const numOrNull = (v: string) => (v === "" ? null : Number(v));

export function FichaTecnicaEditor({ ficha: initial }: { ficha: FichaCompleta }) {
  const [ficha, setFicha] = useState(initial);
  const editable = ficha.estado === "BORRADOR";

  // ── Campos core ────────────────────────────────────────────────────────────
  const [core, setCore] = useState({
    notasVersion: ficha.notasVersion ?? "",
    altitudMinM: ficha.altitudMinM?.toString() ?? "",
    altitudMaxM: ficha.altitudMaxM?.toString() ?? "",
    tempMinC: ficha.tempMinC?.toString() ?? "",
    tempMaxC: ficha.tempMaxC?.toString() ?? "",
    humedadMinPct: ficha.humedadMinPct?.toString() ?? "",
    humedadMaxPct: ficha.humedadMaxPct?.toString() ?? "",
    phMin: ficha.phMin?.toString() ?? "",
    phMax: ficha.phMax?.toString() ?? "",
    precipitacionAnualMinMm: ficha.precipitacionAnualMinMm?.toString() ?? "",
    precipitacionAnualMaxMm: ficha.precipitacionAnualMaxMm?.toString() ?? "",
    densidadPlantasHaMin: ficha.densidadPlantasHaMin?.toString() ?? "",
    densidadPlantasHaMax: ficha.densidadPlantasHaMax?.toString() ?? "",
    distanciaSiembraM: ficha.distanciaSiembraM ?? "",
    cicloProductivoMeses: ficha.cicloProductivoMeses?.toString() ?? "",
    vidaUtilAnios: ficha.vidaUtilAnios?.toString() ?? "",
  });
  const [savingCore, setSavingCore] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [cloning, setCloning] = useState(false);

  const handleGuardarCore = async () => {
    setSavingCore(true);
    try {
      const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notasVersion: core.notasVersion || null,
          altitudMinM: numOrNull(core.altitudMinM),
          altitudMaxM: numOrNull(core.altitudMaxM),
          tempMinC: numOrNull(core.tempMinC),
          tempMaxC: numOrNull(core.tempMaxC),
          humedadMinPct: numOrNull(core.humedadMinPct),
          humedadMaxPct: numOrNull(core.humedadMaxPct),
          phMin: numOrNull(core.phMin),
          phMax: numOrNull(core.phMax),
          precipitacionAnualMinMm: numOrNull(core.precipitacionAnualMinMm),
          precipitacionAnualMaxMm: numOrNull(core.precipitacionAnualMaxMm),
          densidadPlantasHaMin: numOrNull(core.densidadPlantasHaMin),
          densidadPlantasHaMax: numOrNull(core.densidadPlantasHaMax),
          distanciaSiembraM: core.distanciaSiembraM || null,
          cicloProductivoMeses: numOrNull(core.cicloProductivoMeses),
          vidaUtilAnios: numOrNull(core.vidaUtilAnios),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      toast.success("Cambios guardados");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingCore(false);
    }
  };

  const handlePublicar = async () => {
    if (!confirm("¿Publicar esta ficha técnica? Quedará activa para todos los cultivos nuevos de esta variedad.")) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}/publicar`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al publicar");
      toast.success("Ficha técnica publicada");
      setFicha((prev) => ({ ...prev, estado: json.data.estado, publicadaEn: json.data.publicadaEn }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al publicar");
    } finally {
      setPublishing(false);
    }
  };

  const handleNuevaVersion = async () => {
    setCloning(true);
    try {
      const res = await fetch("/api/admin/fichas-tecnicas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variedadId: ficha.variedadId, clonarEtapasDeVersionId: ficha.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear nueva versión");
      window.location.href = `/dashboard/admin/fichas-tecnicas/${json.data.id}`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear nueva versión");
      setCloning(false);
    }
  };

  // ── Etapas ─────────────────────────────────────────────────────────────────
  const [etapas, setEtapas] = useState(ficha.etapas);
  const [nuevaEtapa, setNuevaEtapa] = useState({ nombre: "", duracionDiasMin: "", duracionDiasMax: "", descripcion: "" });
  const [addingEtapa, setAddingEtapa] = useState(false);

  const handleAgregarEtapa = async () => {
    if (!nuevaEtapa.nombre.trim()) return toast.error("El nombre de la etapa es requerido");
    setAddingEtapa(true);
    try {
      const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}/etapas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevaEtapa.nombre.trim(),
          duracionDiasMin: nuevaEtapa.duracionDiasMin || undefined,
          duracionDiasMax: nuevaEtapa.duracionDiasMax || undefined,
          descripcion: nuevaEtapa.descripcion.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al agregar etapa");
      setEtapas((prev) => [...prev, json.data]);
      setNuevaEtapa({ nombre: "", duracionDiasMin: "", duracionDiasMax: "", descripcion: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al agregar etapa");
    } finally {
      setAddingEtapa(false);
    }
  };

  const handleEliminarEtapa = async (id: string) => {
    const anterior = etapas;
    setEtapas((prev) => prev.filter((e) => e.id !== id));
    const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}/etapas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setEtapas(anterior);
      toast.error("Error al eliminar etapa");
    }
  };

  // ── Plagas y enfermedades ──────────────────────────────────────────────────
  const [plagas, setPlagas] = useState(ficha.plagas);
  const [nuevaPlaga, setNuevaPlaga] = useState({ nombre: "", tipo: "PLAGA" as TipoPlagaEnfermedad, sintomas: "", manejoRecomendado: "" });
  const [addingPlaga, setAddingPlaga] = useState(false);

  const handleAgregarPlaga = async () => {
    if (!nuevaPlaga.nombre.trim()) return toast.error("El nombre es requerido");
    setAddingPlaga(true);
    try {
      const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}/plagas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevaPlaga.nombre.trim(),
          tipo: nuevaPlaga.tipo,
          sintomas: nuevaPlaga.sintomas.trim() || undefined,
          manejoRecomendado: nuevaPlaga.manejoRecomendado.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al agregar");
      setPlagas((prev) => [...prev, json.data]);
      setNuevaPlaga({ nombre: "", tipo: "PLAGA", sintomas: "", manejoRecomendado: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al agregar");
    } finally {
      setAddingPlaga(false);
    }
  };

  const handleEliminarPlaga = async (id: string) => {
    const anterior = plagas;
    setPlagas((prev) => prev.filter((p) => p.id !== id));
    const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}/plagas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setPlagas(anterior);
      toast.error("Error al eliminar");
    }
  };

  // ── Costos de referencia ──────────────────────────────────────────────────
  const [costos, setCostos] = useState(ficha.costosRef);
  const [nuevoCosto, setNuevoCosto] = useState({ categoria: "INSUMOS" as CategoriaGasto, montoPorHa: "", montoPorPlanta: "", frecuencia: "", descripcion: "" });
  const [addingCosto, setAddingCosto] = useState(false);

  const handleAgregarCosto = async () => {
    setAddingCosto(true);
    try {
      const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}/costos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria: nuevoCosto.categoria,
          montoPorHa: nuevoCosto.montoPorHa || undefined,
          montoPorPlanta: nuevoCosto.montoPorPlanta || undefined,
          frecuencia: nuevoCosto.frecuencia.trim() || undefined,
          descripcion: nuevoCosto.descripcion.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al agregar");
      setCostos((prev) => [...prev, json.data]);
      setNuevoCosto({ categoria: "INSUMOS", montoPorHa: "", montoPorPlanta: "", frecuencia: "", descripcion: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al agregar");
    } finally {
      setAddingCosto(false);
    }
  };

  const handleEliminarCosto = async (id: string) => {
    const anterior = costos;
    setCostos((prev) => prev.filter((c) => c.id !== id));
    const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}/costos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setCostos(anterior);
      toast.error("Error al eliminar");
    }
  };

  // ── Curva de producción ───────────────────────────────────────────────────
  const [curva, setCurva] = useState(ficha.curvaProduccion);
  const [nuevoPunto, setNuevoPunto] = useState({ anioProduccion: "", kgPorPlantaEsperado: "", kgPorHaEsperado: "" });
  const [addingPunto, setAddingPunto] = useState(false);

  const handleAgregarPunto = async () => {
    if (!nuevoPunto.anioProduccion) return toast.error("El año de producción es requerido");
    setAddingPunto(true);
    try {
      const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}/curva`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anioProduccion: nuevoPunto.anioProduccion,
          kgPorPlantaEsperado: nuevoPunto.kgPorPlantaEsperado || undefined,
          kgPorHaEsperado: nuevoPunto.kgPorHaEsperado || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al agregar");
      setCurva((prev) => [...prev, json.data].sort((a, b) => a.anioProduccion - b.anioProduccion));
      setNuevoPunto({ anioProduccion: "", kgPorPlantaEsperado: "", kgPorHaEsperado: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al agregar");
    } finally {
      setAddingPunto(false);
    }
  };

  const handleEliminarPunto = async (id: string) => {
    const anterior = curva;
    setCurva((prev) => prev.filter((p) => p.id !== id));
    const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}/curva/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setCurva(anterior);
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Link href={"/dashboard/admin/fichas-tecnicas" as any} className="inline-flex items-center gap-1 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        <ArrowLeft size={14} /> Volver al catálogo
      </Link>

      {/* Encabezado de estado */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            {ficha.variedad.especie.nombre} — {ficha.variedad.nombre}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge ${ESTADO_BADGE[ficha.estado]}`}>v{ficha.version} · {ESTADO_FICHA_LABELS[ficha.estado]}</span>
            {ficha._count.cultivos > 0 && (
              <span className="text-[11px] text-[var(--text-muted)]">{ficha._count.cultivos} cultivo(s) pinneados a esta versión</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {editable ? (
            <Button onClick={handlePublicar} loading={publishing}>
              <Rocket size={15} /> Publicar
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleNuevaVersion} loading={cloning}>
              <Copy size={15} /> Nueva versión (editable)
            </Button>
          )}
        </div>
      </div>

      {!editable && (
        <p className="text-[12px] text-[var(--text-muted)] bg-[var(--surface-page)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2">
          Esta ficha está {ESTADO_FICHA_LABELS[ficha.estado].toLowerCase()} y es de solo lectura — así los cultivos ya pinneados a
          esta versión nunca cambian retroactivamente. Crea una nueva versión para editarla.
        </p>
      )}

      {/* Campos core */}
      <div className="card p-4">
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Rango ambiental óptimo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Input label="Altitud mín (msnm)" type="number" disabled={!editable} value={core.altitudMinM} onChange={(e) => setCore({ ...core, altitudMinM: e.target.value })} />
          <Input label="Altitud máx (msnm)" type="number" disabled={!editable} value={core.altitudMaxM} onChange={(e) => setCore({ ...core, altitudMaxM: e.target.value })} />
          <Input label="Temp. mín (°C)" type="number" disabled={!editable} value={core.tempMinC} onChange={(e) => setCore({ ...core, tempMinC: e.target.value })} />
          <Input label="Temp. máx (°C)" type="number" disabled={!editable} value={core.tempMaxC} onChange={(e) => setCore({ ...core, tempMaxC: e.target.value })} />
          <Input label="Humedad mín (%)" type="number" disabled={!editable} value={core.humedadMinPct} onChange={(e) => setCore({ ...core, humedadMinPct: e.target.value })} />
          <Input label="Humedad máx (%)" type="number" disabled={!editable} value={core.humedadMaxPct} onChange={(e) => setCore({ ...core, humedadMaxPct: e.target.value })} />
          <Input label="pH mín" type="number" step="0.1" disabled={!editable} value={core.phMin} onChange={(e) => setCore({ ...core, phMin: e.target.value })} />
          <Input label="pH máx" type="number" step="0.1" disabled={!editable} value={core.phMax} onChange={(e) => setCore({ ...core, phMax: e.target.value })} />
          <Input label="Precipitación mín (mm/año)" type="number" disabled={!editable} value={core.precipitacionAnualMinMm} onChange={(e) => setCore({ ...core, precipitacionAnualMinMm: e.target.value })} />
          <Input label="Precipitación máx (mm/año)" type="number" disabled={!editable} value={core.precipitacionAnualMaxMm} onChange={(e) => setCore({ ...core, precipitacionAnualMaxMm: e.target.value })} />
        </div>

        <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Siembra y ciclo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Input label="Densidad mín (plantas/ha)" type="number" disabled={!editable} value={core.densidadPlantasHaMin} onChange={(e) => setCore({ ...core, densidadPlantasHaMin: e.target.value })} />
          <Input label="Densidad máx (plantas/ha)" type="number" disabled={!editable} value={core.densidadPlantasHaMax} onChange={(e) => setCore({ ...core, densidadPlantasHaMax: e.target.value })} />
          <Input label="Distancia de siembra" disabled={!editable} value={core.distanciaSiembraM} onChange={(e) => setCore({ ...core, distanciaSiembraM: e.target.value })} placeholder="Ej: 8x8m" />
          <Input label="Ciclo productivo (meses)" type="number" disabled={!editable} value={core.cicloProductivoMeses} onChange={(e) => setCore({ ...core, cicloProductivoMeses: e.target.value })} />
          <Input label="Vida útil (años)" type="number" disabled={!editable} value={core.vidaUtilAnios} onChange={(e) => setCore({ ...core, vidaUtilAnios: e.target.value })} />
        </div>

        <Textarea
          label="Notas de la versión"
          disabled={!editable}
          value={core.notasVersion}
          onChange={(e) => setCore({ ...core, notasVersion: e.target.value })}
          placeholder="Qué cambió en esta versión respecto a la anterior..."
        />

        {editable && (
          <div className="flex justify-end pt-3">
            <Button onClick={handleGuardarCore} loading={savingCore}>Guardar cambios</Button>
          </div>
        )}
      </div>

      {/* Etapas fenológicas */}
      <div className="card p-4">
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Etapas fenológicas</h3>
        {etapas.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] italic mb-3">Sin etapas definidas.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {etapas.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-[var(--surface-page)] rounded-[var(--radius-md)] text-[12px]">
                <span>
                  <strong>{e.orden}.</strong> {e.nombre}
                  {(e.duracionDiasMin || e.duracionDiasMax) && (
                    <span className="text-[var(--text-muted)]"> · {e.duracionDiasMin ?? "?"}–{e.duracionDiasMax ?? "?"} días</span>
                  )}
                  {e.descripcion && <span className="text-[var(--text-muted)]"> · {e.descripcion}</span>}
                </span>
                {editable && (
                  <button onClick={() => handleEliminarEtapa(e.id)} className="text-red-400 hover:text-red-600" aria-label="Eliminar etapa">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {editable && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <Input label="Nombre" value={nuevaEtapa.nombre} onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, nombre: e.target.value })} placeholder="Ej: FLORACION" />
            <Input label="Días mín" type="number" value={nuevaEtapa.duracionDiasMin} onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, duracionDiasMin: e.target.value })} />
            <Input label="Días máx" type="number" value={nuevaEtapa.duracionDiasMax} onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, duracionDiasMax: e.target.value })} />
            <Button variant="secondary" onClick={handleAgregarEtapa} loading={addingEtapa}><Plus size={14} /> Agregar</Button>
          </div>
        )}
      </div>

      {/* Plagas y enfermedades */}
      <div className="card p-4">
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
          Plagas y enfermedades <span className="normal-case text-[var(--text-muted)]">(catálogo base para diagnóstico IA)</span>
        </h3>
        {plagas.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] italic mb-3">Sin plagas/enfermedades registradas.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {plagas.map((p) => (
              <div key={p.id} className="flex items-start justify-between px-3 py-2 bg-[var(--surface-page)] rounded-[var(--radius-md)] text-[12px]">
                <div>
                  <span className="font-medium">{p.nombre}</span>{" "}
                  <span className="badge badge-neutral">{TIPO_PLAGA_LABELS[p.tipo]}</span>
                  {p.sintomas && <p className="text-[var(--text-muted)] mt-0.5">Síntomas: {p.sintomas}</p>}
                  {p.manejoRecomendado && <p className="text-[var(--text-muted)] mt-0.5">Manejo: {p.manejoRecomendado}</p>}
                </div>
                {editable && (
                  <button onClick={() => handleEliminarPlaga(p.id)} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2" aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {editable && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input label="Nombre" value={nuevaPlaga.nombre} onChange={(e) => setNuevaPlaga({ ...nuevaPlaga, nombre: e.target.value })} placeholder="Ej: Antracnosis" />
              <Select
                label="Tipo"
                value={nuevaPlaga.tipo}
                onChange={(e) => setNuevaPlaga({ ...nuevaPlaga, tipo: e.target.value as TipoPlagaEnfermedad })}
                options={Object.entries(TIPO_PLAGA_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
            <Textarea label="Síntomas" value={nuevaPlaga.sintomas} onChange={(e) => setNuevaPlaga({ ...nuevaPlaga, sintomas: e.target.value })} rows={2} />
            <Textarea label="Manejo recomendado" value={nuevaPlaga.manejoRecomendado} onChange={(e) => setNuevaPlaga({ ...nuevaPlaga, manejoRecomendado: e.target.value })} rows={2} />
            <div className="flex justify-end">
              <Button variant="secondary" onClick={handleAgregarPlaga} loading={addingPlaga}><Plus size={14} /> Agregar</Button>
            </div>
          </div>
        )}
      </div>

      {/* Costos de referencia */}
      <div className="card p-4">
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Costos de referencia</h3>
        {costos.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] italic mb-3">Sin costos de referencia.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {costos.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-[var(--surface-page)] rounded-[var(--radius-md)] text-[12px]">
                <span>
                  <span className="badge badge-neutral">{CATEGORIA_LABELS[c.categoria]}</span>{" "}
                  {c.montoPorHa && `$${c.montoPorHa.toLocaleString("es-CO")}/ha`}
                  {c.montoPorHa && c.montoPorPlanta && " · "}
                  {c.montoPorPlanta && `$${c.montoPorPlanta.toLocaleString("es-CO")}/planta`}
                  {c.frecuencia && <span className="text-[var(--text-muted)]"> · {c.frecuencia}</span>}
                </span>
                {editable && (
                  <button onClick={() => handleEliminarCosto(c.id)} className="text-red-400 hover:text-red-600" aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {editable && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <Select
              label="Categoría"
              value={nuevoCosto.categoria}
              onChange={(e) => setNuevoCosto({ ...nuevoCosto, categoria: e.target.value as CategoriaGasto })}
              options={Object.entries(CATEGORIA_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Input label="$/ha" type="number" value={nuevoCosto.montoPorHa} onChange={(e) => setNuevoCosto({ ...nuevoCosto, montoPorHa: e.target.value })} />
            <Input label="$/planta" type="number" value={nuevoCosto.montoPorPlanta} onChange={(e) => setNuevoCosto({ ...nuevoCosto, montoPorPlanta: e.target.value })} />
            <Input label="Frecuencia" value={nuevoCosto.frecuencia} onChange={(e) => setNuevoCosto({ ...nuevoCosto, frecuencia: e.target.value })} placeholder="Ej: anual" />
          </div>
        )}
        {editable && (
          <div className="flex justify-end mt-2">
            <Button variant="secondary" onClick={handleAgregarCosto} loading={addingCosto}><Plus size={14} /> Agregar</Button>
          </div>
        )}
      </div>

      {/* Curva de producción */}
      <div className="card p-4">
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Curva de producción esperada</h3>
        {curva.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] italic mb-3">Sin puntos de curva de producción.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {curva.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-[var(--surface-page)] rounded-[var(--radius-md)] text-[12px]">
                <span>
                  Año {p.anioProduccion}: {p.kgPorPlantaEsperado && `${p.kgPorPlantaEsperado} kg/planta`}
                  {p.kgPorPlantaEsperado && p.kgPorHaEsperado && " · "}
                  {p.kgPorHaEsperado && `${p.kgPorHaEsperado} kg/ha`}
                </span>
                {editable && (
                  <button onClick={() => handleEliminarPunto(p.id)} className="text-red-400 hover:text-red-600" aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {editable && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <Input label="Año" type="number" min={1} value={nuevoPunto.anioProduccion} onChange={(e) => setNuevoPunto({ ...nuevoPunto, anioProduccion: e.target.value })} />
            <Input label="kg/planta" type="number" value={nuevoPunto.kgPorPlantaEsperado} onChange={(e) => setNuevoPunto({ ...nuevoPunto, kgPorPlantaEsperado: e.target.value })} />
            <Input label="kg/ha" type="number" value={nuevoPunto.kgPorHaEsperado} onChange={(e) => setNuevoPunto({ ...nuevoPunto, kgPorHaEsperado: e.target.value })} />
            <Button variant="secondary" onClick={handleAgregarPunto} loading={addingPunto}><Plus size={14} /> Agregar</Button>
          </div>
        )}
      </div>
    </div>
  );
}
