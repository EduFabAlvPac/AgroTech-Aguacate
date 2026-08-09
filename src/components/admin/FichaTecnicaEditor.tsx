"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, Pencil, Rocket, Copy, Sprout,
  Layers, Bug, DollarSign, TrendingUp, Users,
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

// Mismo patrón de mapa de color que ETAPA_COLORS/TIPO_BADGE_COLORS en CultivosList.tsx
const ESTADO_COLORS: Record<string, { bg: string; color: string }> = {
  BORRADOR: { bg: "#F1EFE8", color: "#5F5E5A" },
  PUBLICADA: { bg: "#EAF3DE", color: "#3B6D11" },
  ARCHIVADA: { bg: "#FAEEDA", color: "#BA7517" },
};

const TIPO_PLAGA_COLORS: Record<TipoPlagaEnfermedad, { bg: string; color: string }> = {
  PLAGA: { bg: "#FCEBEB", color: "#A32D2D" },
  ENFERMEDAD: { bg: "#FAEEDA", color: "#BA7517" },
  DEFICIENCIA_NUTRICIONAL: { bg: "#E6F1FB", color: "#185FA5" },
};

const numOrNull = (v: string) => (v === "" ? null : Number(v));
const fmt = (n: number | null | undefined, suf = "") => (n === null || n === undefined ? "—" : `${n}${suf}`);

export function FichaTecnicaEditor({ ficha: initial }: { ficha: FichaCompleta }) {
  const [ficha, setFicha] = useState(initial);
  const editable = ficha.estado === "BORRADOR";
  const nombreFicha = `${ficha.variedad.especie.nombre} ${ficha.variedad.nombre} v${ficha.version}`;

  const [publishing, setPublishing] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [showCoreModal, setShowCoreModal] = useState(false);

  // Eliminar ficha (solo BORRADOR) — mismo patrón de confirmación con nombre
  // escrito que Lote/Cultivo en CultivosList.tsx.
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleEliminarFicha = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/fichas-tecnicas/${ficha.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Error al eliminar");
      }
      toast.success("Ficha técnica eliminada");
      window.location.href = "/dashboard/admin/fichas-tecnicas";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
      setDeleting(false);
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
    <div className="space-y-4">
      <Link
        href={"/dashboard/admin/fichas-tecnicas" as any}
        className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] hover:text-agro-600 transition-colors"
      >
        <ArrowLeft size={14} /> Fichas técnicas
      </Link>

      {/* Card principal — mismo patrón que la card de Cultivo en CultivosList.tsx */}
      <div className="card p-5 animate-fade-in">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-agro-50 flex items-center justify-center flex-shrink-0">
              <Sprout size={20} className="text-agro-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                  {ficha.variedad.especie.nombre} {ficha.variedad.nombre}
                </span>
                <span
                  className="badge text-[10px] font-medium rounded-full px-2 py-0.5"
                  style={{ background: ESTADO_COLORS[ficha.estado].bg, color: ESTADO_COLORS[ficha.estado].color }}
                >
                  v{ficha.version} · {ESTADO_FICHA_LABELS[ficha.estado]}
                </span>
              </div>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                {ficha.variedad.especie.familia ?? "Ficha técnica"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {editable ? (
              <>
                <button
                  onClick={() => setShowCoreModal(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--surface-page)] transition-colors"
                  aria-label="Editar rango y ciclo"
                >
                  <Pencil size={14} className="text-[var(--text-muted)]" />
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-red-50 transition-colors"
                  aria-label="Eliminar ficha"
                >
                  <Trash2 size={14} className="text-[var(--text-muted)] hover:text-red-500" />
                </button>
                <Button size="sm" onClick={handlePublicar} loading={publishing}>
                  <Rocket size={14} /> Publicar
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={handleNuevaVersion} loading={cloning}>
                <Copy size={14} /> Nueva versión editable
              </Button>
            )}
          </div>
        </div>

        {/* Stats row — mismo patrón left-aligned que CultivosList.tsx */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
          <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
            <div className="text-[11px] text-[var(--text-muted)] mb-0.5"><Layers size={11} className="inline mr-1" />Etapas</div>
            <div className="text-[16px] font-semibold text-[var(--text-primary)]">{etapas.length}</div>
          </div>
          <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
            <div className="text-[11px] text-[var(--text-muted)] mb-0.5"><Bug size={11} className="inline mr-1" />Plagas</div>
            <div className="text-[16px] font-semibold text-[var(--text-primary)]">{plagas.length}</div>
          </div>
          <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
            <div className="text-[11px] text-[var(--text-muted)] mb-0.5"><DollarSign size={11} className="inline mr-1" />Costos</div>
            <div className="text-[16px] font-semibold text-[var(--text-primary)]">{costos.length}</div>
          </div>
          <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
            <div className="text-[11px] text-[var(--text-muted)] mb-0.5"><TrendingUp size={11} className="inline mr-1" />Curva</div>
            <div className="text-[16px] font-semibold text-[var(--text-primary)]">{curva.length}</div>
          </div>
          <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
            <div className="text-[11px] text-[var(--text-muted)] mb-0.5"><Users size={11} className="inline mr-1" />Cultivos</div>
            <div className="text-[16px] font-semibold text-[var(--text-primary)]">{ficha._count.cultivos}</div>
          </div>
        </div>

        {/* Info chips — mismo patrón de emoji + badge-neutral que CultivosList.tsx */}
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-neutral text-[11px]">🏔️ {fmt(ficha.altitudMinM)}–{fmt(ficha.altitudMaxM)} msnm</span>
          <span className="badge badge-neutral text-[11px]">🌡️ {fmt(ficha.tempMinC)}–{fmt(ficha.tempMaxC)}°C</span>
          <span className="badge badge-neutral text-[11px]">💧 pH {fmt(ficha.phMin)}–{fmt(ficha.phMax)}</span>
          <span className="badge badge-neutral text-[11px]">📅 Ciclo: {fmt(ficha.cicloProductivoMeses)} meses</span>
          {ficha.distanciaSiembraM && <span className="badge badge-neutral text-[11px]">📐 {ficha.distanciaSiembraM}</span>}
        </div>

        {!editable && (
          <p className="mt-3 text-[12px] text-[var(--text-secondary)] bg-[var(--surface-page)] rounded-[var(--radius-md)] px-3 py-2">
            🔒 Esta ficha está {ESTADO_FICHA_LABELS[ficha.estado].toLowerCase()} y es de solo lectura — así los cultivos ya
            pinneados a esta versión nunca cambian retroactivamente. Crea una nueva versión para editarla.
          </p>
        )}
      </div>

      {/* Etapas fenológicas */}
      <SeccionFicha
        titulo="Etapas fenológicas"
        icono={<Layers size={24} />}
        vacio="Sin etapas definidas."
        editable={editable}
        onAgregar={() => setShowEtapaModal(true)}
        labelAgregar="Etapa"
      >
        {etapas.map((e) => (
          <FilaActividad
            key={e.id}
            texto={`${e.orden}. ${e.nombre}`}
            meta={[
              e.duracionDiasMin || e.duracionDiasMax ? `${e.duracionDiasMin ?? "?"}–${e.duracionDiasMax ?? "?"} días` : null,
              e.descripcion,
            ].filter(Boolean).join(" · ")}
            editable={editable}
            onEliminar={() => handleEliminarEtapa(e.id)}
          />
        ))}
      </SeccionFicha>

      {/* Plagas y enfermedades */}
      <SeccionFicha
        titulo="Plagas y enfermedades"
        subtitulo="catálogo base para diagnóstico IA"
        icono={<Bug size={24} />}
        vacio="Sin plagas/enfermedades registradas."
        editable={editable}
        onAgregar={() => setShowPlagaModal(true)}
        labelAgregar="Plaga"
      >
        {plagas.map((p) => (
          <FilaActividad
            key={p.id}
            texto={p.nombre}
            meta={[p.sintomas && `Síntomas: ${p.sintomas}`, p.manejoRecomendado && `Manejo: ${p.manejoRecomendado}`].filter(Boolean).join(" · ")}
            badge={{ label: TIPO_PLAGA_LABELS[p.tipo], ...TIPO_PLAGA_COLORS[p.tipo] }}
            editable={editable}
            onEliminar={() => handleEliminarPlaga(p.id)}
          />
        ))}
      </SeccionFicha>

      {/* Costos de referencia */}
      <SeccionFicha
        titulo="Costos de referencia"
        icono={<DollarSign size={24} />}
        vacio="Sin costos de referencia."
        editable={editable}
        onAgregar={() => setShowCostoModal(true)}
        labelAgregar="Costo"
      >
        {costos.map((c) => (
          <FilaActividad
            key={c.id}
            texto={[
              c.montoPorHa && `$${c.montoPorHa.toLocaleString("es-CO")}/ha`,
              c.montoPorPlanta && `$${c.montoPorPlanta.toLocaleString("es-CO")}/planta`,
            ].filter(Boolean).join(" · ") || "Sin monto"}
            meta={c.frecuencia ?? ""}
            badge={{ label: CATEGORIA_LABELS[c.categoria], bg: "#F1EFE8", color: "#5F5E5A" }}
            editable={editable}
            onEliminar={() => handleEliminarCosto(c.id)}
          />
        ))}
      </SeccionFicha>

      {/* Curva de producción */}
      <SeccionFicha
        titulo="Curva de producción esperada"
        icono={<TrendingUp size={24} />}
        vacio="Sin puntos de curva de producción."
        editable={editable}
        onAgregar={() => setShowCurvaModal(true)}
        labelAgregar="Punto"
      >
        {curva.map((p) => (
          <FilaActividad
            key={p.id}
            texto={`Año ${p.anioProduccion}`}
            meta={[p.kgPorPlantaEsperado && `${p.kgPorPlantaEsperado} kg/planta`, p.kgPorHaEsperado && `${p.kgPorHaEsperado} kg/ha`].filter(Boolean).join(" · ")}
            editable={editable}
            onEliminar={() => handleEliminarPunto(p.id)}
          />
        ))}
      </SeccionFicha>

      {/* ── Popups ─────────────────────────────────────────────────────────── */}
      <FichaCoreModal
        isOpen={showCoreModal}
        onClose={() => setShowCoreModal(false)}
        ficha={ficha}
        onSaved={(actualizada) => setFicha((prev) => ({ ...prev, ...actualizada }))}
      />

      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirm(""); }} title="Eliminar ficha técnica" size="sm">
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Esta acción eliminará la ficha <strong>{nombreFicha}</strong> permanentemente. Para confirmar, escribe la versión exacta:
          </p>
          <Input
            label={`Escribe "v${ficha.version}" para confirmar`}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={`v${ficha.version}`}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}>Cancelar</Button>
            <Button variant="danger" disabled={deleteConfirm !== `v${ficha.version}`} loading={deleting} onClick={handleEliminarFicha}>
              Eliminar ficha
            </Button>
          </div>
        </div>
      </Modal>

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

// ── Sección de ficha (card con header + lista) ──────────────────────────────
// Mismo patrón que las cards "Historial de actividades"/"Gastos asociados" de
// CultivoDetail.tsx: header con título+contador+acción, EmptyState si vacío.

function SeccionFicha({
  titulo,
  subtitulo,
  icono,
  vacio,
  editable,
  onAgregar,
  labelAgregar,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  icono: React.ReactNode;
  vacio: string;
  editable: boolean;
  onAgregar: () => void;
  labelAgregar: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
          {titulo}
          {subtitulo && <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">{subtitulo}</span>}
        </h2>
        {editable && (
          <Button size="sm" variant="ghost" onClick={onAgregar}><Plus size={14} /> {labelAgregar}</Button>
        )}
      </div>
      {!hasChildren ? (
        <EmptyState icon={icono} title={vacio} />
      ) : (
        <div className="px-5 py-2">{children}</div>
      )}
    </div>
  );
}

// ── Fila de actividad (dot-timeline) ────────────────────────────────────────
// Mismo patrón que "Actividad reciente" dentro de la card de Cultivo en
// CultivosList.tsx: punto + texto + badge + iconos que aparecen en hover.

function FilaActividad({
  texto,
  meta,
  badge,
  editable,
  onEliminar,
}: {
  texto: string;
  meta?: string;
  badge?: { label: string; bg: string; color: string };
  editable: boolean;
  onEliminar: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5 border-b border-[var(--border-subtle)] last:border-0 group">
      <span className="stage-dot bg-agro-200 mt-1.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[12px] text-[var(--text-primary)] block truncate">{texto}</span>
        {meta && <span className="text-[11px] text-[var(--text-muted)]">{meta}</span>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {badge && (
          <span className="badge text-[10px] font-medium" style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        )}
        {editable && (
          <button
            onClick={onEliminar}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Eliminar"
          >
            <Trash2 size={14} className="text-[var(--text-muted)] hover:text-red-500" />
          </button>
        )}
      </div>
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
