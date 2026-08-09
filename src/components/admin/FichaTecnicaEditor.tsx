"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, Rocket, Copy, Pencil, Sprout,
  Layers, Bug, DollarSign, TrendingUp,
} from "lucide-react";
import { Button, Modal, Input, Select, Textarea, EmptyState } from "@/components/ui";
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
const fmt = (n: number | null | undefined, suf = "") => (n === null || n === undefined ? "—" : `${n}${suf}`);

export function FichaTecnicaEditor({ ficha: initial }: { ficha: FichaCompleta }) {
  const [ficha, setFicha] = useState(initial);
  const editable = ficha.estado === "BORRADOR";

  const [publishing, setPublishing] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [showCoreModal, setShowCoreModal] = useState(false);

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
  const [showEtapaModal, setShowEtapaModal] = useState(false);
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
      setShowEtapaModal(false);
      toast.success("Etapa agregada");
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
  const [showPlagaModal, setShowPlagaModal] = useState(false);
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
      setShowPlagaModal(false);
      toast.success("Plaga/enfermedad agregada");
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
  const [showCostoModal, setShowCostoModal] = useState(false);
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
      setShowCostoModal(false);
      toast.success("Costo de referencia agregado");
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
  const [showCurvaModal, setShowCurvaModal] = useState(false);
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
      setShowCurvaModal(false);
      toast.success("Punto de curva agregado");
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
    <div className="space-y-6">
      <Link
        href={"/dashboard/admin/fichas-tecnicas" as any}
        className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] hover:text-agro-600 transition-colors"
      >
        <ArrowLeft size={14} /> Fichas técnicas
      </Link>

      {/* Status card — mismo lenguaje visual que CultivoDetail */}
      <div className="card p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-agro-50 flex items-center justify-center flex-shrink-0">
              <Sprout size={24} className="text-agro-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-[18px] font-bold text-[var(--text-primary)]">
                  {ficha.variedad.especie.nombre} {ficha.variedad.nombre}
                </h1>
                <span className={`badge ${ESTADO_BADGE[ficha.estado]}`}>
                  v{ficha.version} · {ESTADO_FICHA_LABELS[ficha.estado]}
                </span>
              </div>
              <p className="text-[13px] text-[var(--text-muted)]">
                {ficha.variedad.especie.familia ?? "Ficha técnica"}
                {ficha._count.cultivos > 0 && ` · ${ficha._count.cultivos} cultivo(s) pinneados a esta versión`}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {editable ? (
              <>
                <Button variant="secondary" onClick={() => setShowCoreModal(true)}>
                  <Pencil size={14} /> Editar rango y ciclo
                </Button>
                <Button onClick={handlePublicar} loading={publishing}>
                  <Rocket size={15} /> Publicar
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={handleNuevaVersion} loading={cloning}>
                <Copy size={15} /> Nueva versión editable
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-[var(--border-subtle)]">
          {[
            { label: "Etapas", value: etapas.length.toString(), icon: Layers, color: "text-agro-400" },
            { label: "Plagas/enfermedades", value: plagas.length.toString(), icon: Bug, color: "text-red-500" },
            { label: "Costos ref.", value: costos.length.toString(), icon: DollarSign, color: "text-blue-500" },
            { label: "Curva producción", value: curva.length.toString(), icon: TrendingUp, color: "text-agro-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[var(--surface-page)] rounded-[var(--radius-md)] p-3 text-center">
              <Icon size={16} className={`${color} mx-auto mb-1.5`} />
              <div className="text-[15px] font-semibold text-[var(--text-primary)]">{value}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{label}</div>
            </div>
          ))}
        </div>

        {/* Rango ambiental — resumen de solo lectura */}
        <div className="mt-4 p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)] text-[12px] text-[var(--text-secondary)] grid grid-cols-2 sm:grid-cols-4 gap-2">
          <span>🏔️ Altitud: {fmt(ficha.altitudMinM)}–{fmt(ficha.altitudMaxM, " msnm")}</span>
          <span>🌡️ Temp: {fmt(ficha.tempMinC)}–{fmt(ficha.tempMaxC, "°C")}</span>
          <span>💧 pH: {fmt(ficha.phMin)}–{fmt(ficha.phMax)}</span>
          <span>📅 Ciclo: {fmt(ficha.cicloProductivoMeses, " meses")}</span>
        </div>

        {!editable && (
          <p className="text-[12px] text-[var(--text-muted)] mt-4 pt-4 border-t border-[var(--border-subtle)]">
            Esta ficha está {ESTADO_FICHA_LABELS[ficha.estado].toLowerCase()} y es de solo lectura — así los cultivos ya
            pinneados a esta versión nunca cambian retroactivamente. Crea una nueva versión para editarla.
          </p>
        )}
      </div>

      {/* Etapas fenológicas */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Etapas fenológicas
            <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">{etapas.length} etapas</span>
          </h2>
          {editable && (
            <Button size="sm" onClick={() => setShowEtapaModal(true)}><Plus size={14} /> Etapa</Button>
          )}
        </div>
        {etapas.length === 0 ? (
          <EmptyState icon={<Layers size={24} />} title="Sin etapas definidas" description="Define el ciclo fenológico de esta variedad." />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {etapas.map((e) => (
              <div key={e.id} className="flex items-start gap-4 px-5 py-3 hover:bg-[var(--surface-page)] transition-colors">
                <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--surface-page)] flex items-center justify-center flex-shrink-0 text-[12px] font-semibold text-agro-600">
                  {e.orden}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">{e.nombre}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {(e.duracionDiasMin || e.duracionDiasMax) && `${e.duracionDiasMin ?? "?"}–${e.duracionDiasMax ?? "?"} días`}
                    {e.descripcion && ` · ${e.descripcion}`}
                  </p>
                </div>
                {editable && (
                  <button onClick={() => handleEliminarEtapa(e.id)} className="text-red-400 hover:text-red-600 flex-shrink-0" aria-label="Eliminar etapa">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plagas y enfermedades */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Plagas y enfermedades
            <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">catálogo base para diagnóstico IA</span>
          </h2>
          {editable && (
            <Button size="sm" onClick={() => setShowPlagaModal(true)}><Plus size={14} /> Plaga</Button>
          )}
        </div>
        {plagas.length === 0 ? (
          <EmptyState icon={<Bug size={24} />} title="Sin plagas registradas" description="Agrega las plagas/enfermedades típicas de esta variedad." />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {plagas.map((p) => (
              <div key={p.id} className="flex items-start gap-4 px-5 py-3 hover:bg-[var(--surface-page)] transition-colors">
                <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--surface-page)] flex items-center justify-center flex-shrink-0">
                  <Bug size={16} className="text-[var(--text-muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{p.nombre}</span>
                    <span className="badge badge-neutral text-[10px]">{TIPO_PLAGA_LABELS[p.tipo]}</span>
                  </div>
                  {p.sintomas && <p className="text-[12px] text-[var(--text-secondary)]">Síntomas: {p.sintomas}</p>}
                  {p.manejoRecomendado && <p className="text-[12px] text-[var(--text-secondary)]">Manejo: {p.manejoRecomendado}</p>}
                </div>
                {editable && (
                  <button onClick={() => handleEliminarPlaga(p.id)} className="text-red-400 hover:text-red-600 flex-shrink-0" aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Costos de referencia */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Costos de referencia
            <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">{costos.length} categorías</span>
          </h2>
          {editable && (
            <Button size="sm" onClick={() => setShowCostoModal(true)}><Plus size={14} /> Costo</Button>
          )}
        </div>
        {costos.length === 0 ? (
          <EmptyState icon={<DollarSign size={24} />} title="Sin costos de referencia" description="Define costos esperados por categoría para proyecciones financieras." />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {costos.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--surface-page)] transition-colors">
                <DollarSign size={14} className="text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[var(--text-primary)]">{CATEGORIA_LABELS[c.categoria]}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {c.montoPorHa && `$${c.montoPorHa.toLocaleString("es-CO")}/ha`}
                    {c.montoPorHa && c.montoPorPlanta && " · "}
                    {c.montoPorPlanta && `$${c.montoPorPlanta.toLocaleString("es-CO")}/planta`}
                    {c.frecuencia && ` · ${c.frecuencia}`}
                  </div>
                </div>
                {editable && (
                  <button onClick={() => handleEliminarCosto(c.id)} className="text-red-400 hover:text-red-600 flex-shrink-0" aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Curva de producción */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Curva de producción esperada
            <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">{curva.length} puntos</span>
          </h2>
          {editable && (
            <Button size="sm" onClick={() => setShowCurvaModal(true)}><Plus size={14} /> Punto</Button>
          )}
        </div>
        {curva.length === 0 ? (
          <EmptyState icon={<TrendingUp size={24} />} title="Sin curva de producción" description="Define kg esperados por planta/ha según el año de producción." />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {curva.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--surface-page)] transition-colors">
                <TrendingUp size={14} className="text-agro-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] text-[var(--text-primary)]">Año {p.anioProduccion}</span>
                  <span className="text-[11px] text-[var(--text-muted)] ml-2">
                    {p.kgPorPlantaEsperado && `${p.kgPorPlantaEsperado} kg/planta`}
                    {p.kgPorPlantaEsperado && p.kgPorHaEsperado && " · "}
                    {p.kgPorHaEsperado && `${p.kgPorHaEsperado} kg/ha`}
                  </span>
                </div>
                {editable && (
                  <button onClick={() => handleEliminarPunto(p.id)} className="text-red-400 hover:text-red-600 flex-shrink-0" aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Popups ─────────────────────────────────────────────────────────── */}
      <FichaCoreModal
        isOpen={showCoreModal}
        onClose={() => setShowCoreModal(false)}
        ficha={ficha}
        onSaved={(actualizada) => setFicha((prev) => ({ ...prev, ...actualizada }))}
      />

      <Modal isOpen={showEtapaModal} onClose={() => setShowEtapaModal(false)} title="Nueva etapa fenológica">
        <div className="space-y-3">
          <Input label="Nombre *" value={nuevaEtapa.nombre} onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, nombre: e.target.value })} placeholder="Ej: FLORACION" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Días mín" type="number" value={nuevaEtapa.duracionDiasMin} onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, duracionDiasMin: e.target.value })} />
            <Input label="Días máx" type="number" value={nuevaEtapa.duracionDiasMax} onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, duracionDiasMax: e.target.value })} />
          </div>
          <Textarea label="Descripción" value={nuevaEtapa.descripcion} onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, descripcion: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEtapaModal(false)}>Cancelar</Button>
            <Button loading={addingEtapa} onClick={handleAgregarEtapa}>Agregar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showPlagaModal} onClose={() => setShowPlagaModal(false)} title="Nueva plaga/enfermedad">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" value={nuevaPlaga.nombre} onChange={(e) => setNuevaPlaga({ ...nuevaPlaga, nombre: e.target.value })} placeholder="Ej: Antracnosis" />
            <Select
              label="Tipo"
              value={nuevaPlaga.tipo}
              onChange={(e) => setNuevaPlaga({ ...nuevaPlaga, tipo: e.target.value as TipoPlagaEnfermedad })}
              options={Object.entries(TIPO_PLAGA_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <Textarea label="Síntomas" value={nuevaPlaga.sintomas} onChange={(e) => setNuevaPlaga({ ...nuevaPlaga, sintomas: e.target.value })} rows={2} />
          <Textarea label="Manejo recomendado" value={nuevaPlaga.manejoRecomendado} onChange={(e) => setNuevaPlaga({ ...nuevaPlaga, manejoRecomendado: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowPlagaModal(false)}>Cancelar</Button>
            <Button loading={addingPlaga} onClick={handleAgregarPlaga}>Agregar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCostoModal} onClose={() => setShowCostoModal(false)} title="Nuevo costo de referencia">
        <div className="space-y-3">
          <Select
            label="Categoría"
            value={nuevoCosto.categoria}
            onChange={(e) => setNuevoCosto({ ...nuevoCosto, categoria: e.target.value as CategoriaGasto })}
            options={Object.entries(CATEGORIA_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="$/ha" type="number" value={nuevoCosto.montoPorHa} onChange={(e) => setNuevoCosto({ ...nuevoCosto, montoPorHa: e.target.value })} />
            <Input label="$/planta" type="number" value={nuevoCosto.montoPorPlanta} onChange={(e) => setNuevoCosto({ ...nuevoCosto, montoPorPlanta: e.target.value })} />
          </div>
          <Input label="Frecuencia" value={nuevoCosto.frecuencia} onChange={(e) => setNuevoCosto({ ...nuevoCosto, frecuencia: e.target.value })} placeholder="Ej: anual" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCostoModal(false)}>Cancelar</Button>
            <Button loading={addingCosto} onClick={handleAgregarCosto}>Agregar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCurvaModal} onClose={() => setShowCurvaModal(false)} title="Nuevo punto de curva de producción">
        <div className="space-y-3">
          <Input label="Año de producción *" type="number" min={1} value={nuevoPunto.anioProduccion} onChange={(e) => setNuevoPunto({ ...nuevoPunto, anioProduccion: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="kg/planta" type="number" value={nuevoPunto.kgPorPlantaEsperado} onChange={(e) => setNuevoPunto({ ...nuevoPunto, kgPorPlantaEsperado: e.target.value })} />
            <Input label="kg/ha" type="number" value={nuevoPunto.kgPorHaEsperado} onChange={(e) => setNuevoPunto({ ...nuevoPunto, kgPorHaEsperado: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCurvaModal(false)}>Cancelar</Button>
            <Button loading={addingPunto} onClick={handleAgregarPunto}>Agregar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Modal de edición de campos core ─────────────────────────────────────────

function FichaCoreModal({
  isOpen,
  onClose,
  ficha,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  ficha: FichaTecnica;
  onSaved: (data: Partial<FichaTecnica>) => void;
}) {
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
  const [saving, setSaving] = useState(false);

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const payload = {
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
      };
      const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      toast.success("Cambios guardados");
      onSaved(json.data);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar rango ambiental y ciclo" size="lg">
      <div className="space-y-4">
        <div>
          <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Rango ambiental óptimo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input label="Altitud mín (msnm)" type="number" value={core.altitudMinM} onChange={(e) => setCore({ ...core, altitudMinM: e.target.value })} />
            <Input label="Altitud máx (msnm)" type="number" value={core.altitudMaxM} onChange={(e) => setCore({ ...core, altitudMaxM: e.target.value })} />
            <Input label="Temp. mín (°C)" type="number" value={core.tempMinC} onChange={(e) => setCore({ ...core, tempMinC: e.target.value })} />
            <Input label="Temp. máx (°C)" type="number" value={core.tempMaxC} onChange={(e) => setCore({ ...core, tempMaxC: e.target.value })} />
            <Input label="Humedad mín (%)" type="number" value={core.humedadMinPct} onChange={(e) => setCore({ ...core, humedadMinPct: e.target.value })} />
            <Input label="Humedad máx (%)" type="number" value={core.humedadMaxPct} onChange={(e) => setCore({ ...core, humedadMaxPct: e.target.value })} />
            <Input label="pH mín" type="number" step="0.1" value={core.phMin} onChange={(e) => setCore({ ...core, phMin: e.target.value })} />
            <Input label="pH máx" type="number" step="0.1" value={core.phMax} onChange={(e) => setCore({ ...core, phMax: e.target.value })} />
            <Input label="Precip. mín (mm/año)" type="number" value={core.precipitacionAnualMinMm} onChange={(e) => setCore({ ...core, precipitacionAnualMinMm: e.target.value })} />
            <Input label="Precip. máx (mm/año)" type="number" value={core.precipitacionAnualMaxMm} onChange={(e) => setCore({ ...core, precipitacionAnualMaxMm: e.target.value })} />
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Siembra y ciclo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input label="Densidad mín (plantas/ha)" type="number" value={core.densidadPlantasHaMin} onChange={(e) => setCore({ ...core, densidadPlantasHaMin: e.target.value })} />
            <Input label="Densidad máx (plantas/ha)" type="number" value={core.densidadPlantasHaMax} onChange={(e) => setCore({ ...core, densidadPlantasHaMax: e.target.value })} />
            <Input label="Distancia de siembra" value={core.distanciaSiembraM} onChange={(e) => setCore({ ...core, distanciaSiembraM: e.target.value })} placeholder="Ej: 8x8m" />
            <Input label="Ciclo productivo (meses)" type="number" value={core.cicloProductivoMeses} onChange={(e) => setCore({ ...core, cicloProductivoMeses: e.target.value })} />
            <Input label="Vida útil (años)" type="number" value={core.vidaUtilAnios} onChange={(e) => setCore({ ...core, vidaUtilAnios: e.target.value })} />
          </div>
        </div>

        <Textarea
          label="Notas de la versión"
          value={core.notasVersion}
          onChange={(e) => setCore({ ...core, notasVersion: e.target.value })}
          placeholder="Qué cambió en esta versión respecto a la anterior..."
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={handleGuardar}>Guardar cambios</Button>
        </div>
      </div>
    </Modal>
  );
}
