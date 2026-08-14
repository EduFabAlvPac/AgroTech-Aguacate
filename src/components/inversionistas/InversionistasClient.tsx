"use client";

import { useMemo, useState } from "react";
import {
  Plus, User, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, Sprout, Wallet, Users,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button, Modal, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { formatCOP, formatCOPFull } from "@/lib/utils";
import toast from "react-hot-toast";
import type { EstadoInversion } from "@prisma/client";

interface RetornoData {
  id: string;
  monto: number;
  fecha: string | Date;
  concepto: string | null;
}

interface InversionData {
  id: string;
  cultivoId: string;
  montoAportado: number;
  porcentajeParticipacion: number;
  fechaAporte: string | Date;
  condiciones: string | null;
  estado: EstadoInversion;
  cultivo: { id: string; especie: string; variedad: string; lote: { nombre: string } };
  retornos: RetornoData[];
}

interface InversionistaData {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  inversiones: InversionData[];
}

interface CultivoOption {
  id: string;
  especie: string;
  variedad: string;
  lote: { nombre: string };
}

const ESTADO_COLORS: Record<EstadoInversion, { bg: string; color: string }> = {
  ACTIVA: { bg: "var(--color-positive-bg)", color: "var(--color-positive)" },
  RETIRADA: { bg: "var(--color-surface-gray)", color: "var(--color-text-soft)" },
  FINALIZADA: { bg: "var(--color-info-bg)", color: "var(--color-info)" },
};

const ESTADO_LABELS: Record<EstadoInversion, string> = {
  ACTIVA: "Activa",
  RETIRADA: "Retirada",
  FINALIZADA: "Finalizada",
};

const emptyInversionistaForm = { nombre: "", email: "", telefono: "", notas: "" };
const emptyInversionForm = { cultivoId: "", montoAportado: "", porcentajeParticipacion: "", condiciones: "" };
const emptyRetornoForm = { monto: "", concepto: "" };

function rentabilidad(aportado: number, retornado: number): number {
  if (aportado <= 0) return 0;
  return ((retornado - aportado) / aportado) * 100;
}

// Mismo tooltip que FinancialChart.tsx — estilo transversal de los gráficos.
const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-2.5 shadow-sm text-[12px]">
        <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {formatCOP(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function InversionistasClient({
  inversionistas: initial,
  cultivos,
}: {
  inversionistas: InversionistaData[];
  cultivos: CultivoOption[];
}) {
  const [inversionistas, setInversionistas] = useState(initial);

  // Modal: nuevo/editar inversionista
  const [showInversionistaModal, setShowInversionistaModal] = useState(false);
  const [editingInversionistaId, setEditingInversionistaId] = useState<string | null>(null);
  const [inversionistaForm, setInversionistaForm] = useState(emptyInversionistaForm);
  const [savingInversionista, setSavingInversionista] = useState(false);

  // Modal: eliminar inversionista
  const [deletingInversionista, setDeletingInversionista] = useState<InversionistaData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Modal: nueva inversión
  const [inversionModalInversionistaId, setInversionModalInversionistaId] = useState<string | null>(null);
  const [inversionForm, setInversionForm] = useState(emptyInversionForm);
  const [savingInversion, setSavingInversion] = useState(false);

  // Modal: nuevo retorno
  const [retornoModal, setRetornoModal] = useState<{ inversionistaId: string; inversionId: string } | null>(null);
  const [retornoForm, setRetornoForm] = useState(emptyRetornoForm);
  const [savingRetorno, setSavingRetorno] = useState(false);

  const cultivoLabel = (c: { especie: string; variedad: string; lote: { nombre: string } }) =>
    `${c.especie} ${c.variedad} — ${c.lote.nombre}`;

  // ── Dashboard: KPIs globales + comportamiento por inversionista ─────────────
  const dashboard = useMemo(() => {
    const porInversionista = inversionistas.map((inv) => {
      const aportado = inv.inversiones.reduce((s, i) => s + i.montoAportado, 0);
      const retornado = inv.inversiones.reduce((s, i) => s + i.retornos.reduce((rs, r) => rs + r.monto, 0), 0);
      return { nombre: inv.nombre.split(" ")[0], aportado, retornado };
    });

    const totalAportado = porInversionista.reduce((s, i) => s + i.aportado, 0);
    const totalRetornado = porInversionista.reduce((s, i) => s + i.retornado, 0);
    const activos = inversionistas.filter((i) => i.inversiones.some((inv) => inv.estado === "ACTIVA")).length;
    const cultivosFinanciados = new Set(
      inversionistas.flatMap((i) => i.inversiones.map((inv) => inv.cultivoId))
    ).size;

    return { porInversionista, totalAportado, totalRetornado, activos, cultivosFinanciados };
  }, [inversionistas]);

  const rentGlobal = rentabilidad(dashboard.totalAportado, dashboard.totalRetornado);

  // ── Inversionista CRUD ───────────────────────────────────────────────────
  const handleOpenNuevoInversionista = () => {
    setEditingInversionistaId(null);
    setInversionistaForm(emptyInversionistaForm);
    setShowInversionistaModal(true);
  };

  const handleOpenEditInversionista = (inv: InversionistaData) => {
    setEditingInversionistaId(inv.id);
    setInversionistaForm({ nombre: inv.nombre, email: inv.email ?? "", telefono: inv.telefono ?? "", notas: inv.notas ?? "" });
    setShowInversionistaModal(true);
  };

  const handleGuardarInversionista = async () => {
    if (!inversionistaForm.nombre.trim()) return toast.error("El nombre es requerido");
    setSavingInversionista(true);
    try {
      const isEditing = !!editingInversionistaId;
      const url = isEditing ? `/api/inversionistas/${editingInversionistaId}` : "/api/inversionistas";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inversionistaForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");

      if (isEditing) {
        setInversionistas((prev) => prev.map((i) => (i.id === editingInversionistaId ? { ...i, ...json.data } : i)));
        toast.success("Inversionista actualizado");
      } else {
        setInversionistas((prev) => [{ ...json.data, inversiones: [] }, ...prev]);
        toast.success("Inversionista registrado");
      }
      setShowInversionistaModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingInversionista(false);
    }
  };

  const handleEliminarInversionista = async () => {
    if (!deletingInversionista) return;
    setDeletingLoading(true);
    try {
      const res = await fetch(`/api/inversionistas/${deletingInversionista.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Error al eliminar");
      }
      setInversionistas((prev) => prev.filter((i) => i.id !== deletingInversionista.id));
      toast.success("Inversionista eliminado");
      setDeletingInversionista(null);
      setDeleteConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeletingLoading(false);
    }
  };

  // ── Inversión (aporte a cultivo) ─────────────────────────────────────────
  const handleAgregarInversion = async () => {
    if (!inversionModalInversionistaId) return;
    const { cultivoId, montoAportado, porcentajeParticipacion } = inversionForm;
    if (!cultivoId || !montoAportado || !porcentajeParticipacion) {
      return toast.error("Cultivo, monto y % de participación son requeridos");
    }
    setSavingInversion(true);
    try {
      const res = await fetch(`/api/inversionistas/${inversionModalInversionistaId}/inversiones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inversionForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al registrar la inversión");

      setInversionistas((prev) =>
        prev.map((i) =>
          i.id === inversionModalInversionistaId ? { ...i, inversiones: [json.data, ...i.inversiones] } : i
        )
      );
      toast.success("Inversión registrada");
      setInversionModalInversionistaId(null);
      setInversionForm(emptyInversionForm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar la inversión");
    } finally {
      setSavingInversion(false);
    }
  };

  const handleEliminarInversion = async (inversionistaId: string, inversionId: string) => {
    if (!confirm("¿Eliminar esta inversión? También se eliminan sus retornos registrados.")) return;
    const anterior = inversionistas;
    setInversionistas((prev) =>
      prev.map((i) => (i.id === inversionistaId ? { ...i, inversiones: i.inversiones.filter((inv) => inv.id !== inversionId) } : i))
    );
    const res = await fetch(`/api/inversionistas/${inversionistaId}/inversiones/${inversionId}`, { method: "DELETE" });
    if (!res.ok) {
      setInversionistas(anterior);
      toast.error("Error al eliminar la inversión");
    }
  };

  // ── Retornos ──────────────────────────────────────────────────────────────
  const handleAgregarRetorno = async () => {
    if (!retornoModal) return;
    if (!retornoForm.monto) return toast.error("El monto es requerido");
    setSavingRetorno(true);
    try {
      const res = await fetch(
        `/api/inversionistas/${retornoModal.inversionistaId}/inversiones/${retornoModal.inversionId}/retornos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(retornoForm),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al registrar el retorno");

      setInversionistas((prev) =>
        prev.map((i) =>
          i.id === retornoModal.inversionistaId
            ? {
                ...i,
                inversiones: i.inversiones.map((inv) =>
                  inv.id === retornoModal.inversionId ? { ...inv, retornos: [json.data, ...inv.retornos] } : inv
                ),
              }
            : i
        )
      );
      toast.success("Retorno registrado");
      setRetornoModal(null);
      setRetornoForm(emptyRetornoForm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar el retorno");
    } finally {
      setSavingRetorno(false);
    }
  };

  const handleEliminarRetorno = async (inversionistaId: string, inversionId: string, retornoId: string) => {
    const anterior = inversionistas;
    setInversionistas((prev) =>
      prev.map((i) =>
        i.id === inversionistaId
          ? {
              ...i,
              inversiones: i.inversiones.map((inv) =>
                inv.id === inversionId ? { ...inv, retornos: inv.retornos.filter((r) => r.id !== retornoId) } : inv
              ),
            }
          : i
      )
    );
    const res = await fetch(
      `/api/inversionistas/${inversionistaId}/inversiones/${inversionId}/retornos/${retornoId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      setInversionistas(anterior);
      toast.error("Error al eliminar el retorno");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenNuevoInversionista}>
          <Plus size={16} /> Nuevo inversionista
        </Button>
      </div>

      {inversionistas.length === 0 ? (
        <EmptyState
          icon={<Wallet size={28} />}
          title="Sin inversionistas registrados"
          description="Registra a las personas que financian tus cultivos para llevar el control de aportes, retornos y rentabilidad."
          action={<Button onClick={handleOpenNuevoInversionista}><Plus size={14} /> Nuevo inversionista</Button>}
        />
      ) : (
        <div className="space-y-6">
          {/* ════════ DASHBOARD: resumen global + comportamiento por inversionista ════════ */}
          <div className="space-y-4">
            {/* KPI Summary — mismo patrón que el tab Resumen de Finanzas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total aportado", value: formatCOP(dashboard.totalAportado), sub: `${inversionistas.length} inversionista(s)`, color: "text-harvest-400", bg: "bg-harvest-50", icon: DollarSign },
                { label: "Total retornado", value: formatCOP(dashboard.totalRetornado), sub: "Distribuido a la fecha", color: "text-agro-600", bg: "bg-agro-50", icon: TrendingUp },
                // "-100%" cuando aún no hay ningún retorno es matemáticamente
                // correcto pero comunica mal (lee como "perdiste todo" en vez
                // de "todavía no hay distribuciones") — estado neutro en su
                // lugar hasta que exista al menos un retorno real.
                dashboard.totalRetornado === 0
                  ? { label: "Rentabilidad global", value: "Sin retornos", sub: "Aún no hay distribuciones registradas", color: "text-[var(--text-muted)]", bg: "bg-[var(--surface-page)]", icon: Wallet }
                  : { label: "Rentabilidad global", value: `${rentGlobal >= 0 ? "+" : ""}${rentGlobal.toFixed(1)}%`, sub: rentGlobal >= 0 ? "Sobre el capital aportado" : "Aún no se recupera el capital", color: rentGlobal >= 0 ? "text-agro-600" : "text-negative-600", bg: rentGlobal >= 0 ? "bg-agro-50" : "bg-negative-50", icon: rentGlobal >= 0 ? TrendingUp : TrendingDown },
                { label: "Inversionistas activos", value: dashboard.activos.toString(), sub: `${dashboard.cultivosFinanciados} cultivo(s) financiado(s)`, color: "text-[var(--color-info)]", bg: "bg-[var(--color-info-bg)]", icon: Users },
              ].map(({ label, value, sub, color, bg, icon: Icon }) => (
                <div key={label} className="card p-4">
                  <div className={`w-8 h-8 rounded-[var(--radius-md)] ${bg} flex items-center justify-center mb-3`}>
                    <Icon size={16} className={color} />
                  </div>
                  <div className={`text-xl font-semibold ${color} mb-0.5`}>{value}</div>
                  <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">{label}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{sub}</div>
                </div>
              ))}
            </div>

            {/* Gráfico: aportado vs retornado por inversionista */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Aportado vs. retornado por inversionista</h2>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Seguimiento visual del comportamiento de cada inversión</p>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-negative-100 inline-block" />Aportado</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-positive-100 inline-block" />Retornado</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dashboard.porInversionista} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "var(--color-text-mute)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-text-mute)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v === 0 ? "" : `$${(v / 1000000).toFixed(1)}M`)}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="aportado" name="Aportado" fill="var(--color-negative)" radius={[3, 3, 0, 0]} maxBarSize={56} />
                  <Bar dataKey="retornado" name="Retornado" fill="var(--color-positive)" radius={[3, 3, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
              {dashboard.totalRetornado === 0 && (
                <p className="text-[11px] text-[var(--text-muted)] mt-3 text-center">
                  Todavía no hay retornos registrados — la barra verde aparecerá cuando registres el primero.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
          {inversionistas.map((inv) => {
            const totalAportado = inv.inversiones.reduce((s, i) => s + i.montoAportado, 0);
            const totalRetornado = inv.inversiones.reduce(
              (s, i) => s + i.retornos.reduce((rs, r) => rs + r.monto, 0),
              0
            );
            const rent = rentabilidad(totalAportado, totalRetornado);

            return (
              <div key={inv.id} className="card p-5 animate-fade-in">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-agro-50 flex items-center justify-center flex-shrink-0">
                      <User size={20} className="text-agro-400" />
                    </div>
                    <div>
                      <span className="text-[14px] font-semibold text-[var(--text-primary)]">{inv.nombre}</span>
                      <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                        {[inv.email, inv.telefono].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditInversionista(inv)}
                      className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--surface-page)] transition-colors"
                      aria-label="Editar inversionista"
                    >
                      <Pencil size={14} className="text-[var(--text-muted)]" />
                    </button>
                    <button
                      onClick={() => { setDeletingInversionista(inv); setDeleteConfirm(""); }}
                      className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-negative-50 transition-colors"
                      aria-label="Eliminar inversionista"
                    >
                      <Trash2 size={14} className="text-[var(--text-muted)] hover:text-negative-400" />
                    </button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setInversionModalInversionistaId(inv.id);
                        setInversionForm(emptyInversionForm);
                      }}
                    >
                      <Plus size={14} /> Inversión
                    </Button>
                  </div>
                </div>

                {/* Stats row — mismo patrón left-aligned que CultivosList.tsx */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                    <div className="text-[11px] text-[var(--text-muted)] mb-0.5"><DollarSign size={11} className="inline mr-1" />Aportado</div>
                    <div className="text-[15px] font-semibold text-[var(--text-primary)]">{formatCOP(totalAportado)}</div>
                  </div>
                  <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                    <div className="text-[11px] text-[var(--text-muted)] mb-0.5"><Wallet size={11} className="inline mr-1" />Retornado</div>
                    <div className="text-[15px] font-semibold text-[var(--text-primary)]">{formatCOP(totalRetornado)}</div>
                  </div>
                  <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                    <div className="text-[11px] text-[var(--text-muted)] mb-0.5"><TrendingUp size={11} className="inline mr-1" />Rentabilidad</div>
                    {totalRetornado === 0 ? (
                      <div className="text-[13px] font-medium text-[var(--text-muted)]">Sin retornos</div>
                    ) : (
                      <div className={`text-[15px] font-semibold ${rent >= 0 ? "text-agro-600" : "text-negative-600"}`}>
                        {rent >= 0 ? "+" : ""}{rent.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                    <div className="text-[11px] text-[var(--text-muted)] mb-0.5"><Sprout size={11} className="inline mr-1" />Cultivos</div>
                    <div className="text-[15px] font-semibold text-[var(--text-primary)]">{inv.inversiones.length}</div>
                  </div>
                </div>

                {/* Inversiones por cultivo */}
                {inv.inversiones.length === 0 ? (
                  <p className="text-[12px] text-[var(--text-muted)] italic">Sin inversiones registradas todavía.</p>
                ) : (
                  <div className="space-y-1.5">
                    {inv.inversiones.map((inversion) => {
                      const retornadoInv = inversion.retornos.reduce((s, r) => s + r.monto, 0);
                      const rentInv = rentabilidad(inversion.montoAportado, retornadoInv);
                      return (
                        <div key={inversion.id} className="px-3 py-2.5 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                  {cultivoLabel(inversion.cultivo)}
                                </span>
                                <span
                                  className="badge text-[10px] font-medium rounded-full px-2 py-0.5"
                                  style={{ background: ESTADO_COLORS[inversion.estado].bg, color: ESTADO_COLORS[inversion.estado].color }}
                                >
                                  {ESTADO_LABELS[inversion.estado]}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                {formatCOPFull(inversion.montoAportado)} aportado · {inversion.porcentajeParticipacion}% participación
                                {retornadoInv > 0 && ` · ${formatCOPFull(retornadoInv)} retornado (${rentInv >= 0 ? "+" : ""}${rentInv.toFixed(1)}%)`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setRetornoModal({ inversionistaId: inv.id, inversionId: inversion.id }); setRetornoForm(emptyRetornoForm); }}
                              >
                                <Plus size={12} /> Retorno
                              </Button>
                              <button
                                onClick={() => handleEliminarInversion(inv.id, inversion.id)}
                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-negative-50 transition-colors"
                                aria-label="Eliminar inversión"
                              >
                                <Trash2 size={13} className="text-[var(--text-muted)] hover:text-negative-400" />
                              </button>
                            </div>
                          </div>

                          {inversion.retornos.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-1">
                              {inversion.retornos.map((r) => (
                                <div key={r.id} className="flex items-center justify-between gap-2 group">
                                  <span className="text-[11px] text-[var(--text-secondary)]">
                                    <span className="stage-dot bg-positive-100 mr-1.5" />
                                    {formatCOPFull(r.monto)}{r.concepto ? ` — ${r.concepto}` : ""}
                                  </span>
                                  <button
                                    onClick={() => handleEliminarRetorno(inv.id, inversion.id, r.id)}
                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-negative-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                    aria-label="Eliminar retorno"
                                  >
                                    <Trash2 size={11} className="text-[var(--text-muted)] hover:text-negative-400" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* Modal: nuevo/editar inversionista */}
      <Modal
        isOpen={showInversionistaModal}
        onClose={() => setShowInversionistaModal(false)}
        title={editingInversionistaId ? "Editar inversionista" : "Nuevo inversionista"}
      >
        <div className="space-y-3">
          <Input
            label="Nombre *"
            value={inversionistaForm.nombre}
            onChange={(e) => setInversionistaForm({ ...inversionistaForm, nombre: e.target.value })}
            placeholder="Ej: Carlos Ramírez"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={inversionistaForm.email}
              onChange={(e) => setInversionistaForm({ ...inversionistaForm, email: e.target.value })}
            />
            <Input
              label="Teléfono"
              value={inversionistaForm.telefono}
              onChange={(e) => setInversionistaForm({ ...inversionistaForm, telefono: e.target.value })}
            />
          </div>
          <Textarea
            label="Notas"
            value={inversionistaForm.notas}
            onChange={(e) => setInversionistaForm({ ...inversionistaForm, notas: e.target.value })}
            rows={2}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowInversionistaModal(false)}>Cancelar</Button>
            <Button loading={savingInversionista} onClick={handleGuardarInversionista}>
              {editingInversionistaId ? "Guardar cambios" : "Registrar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: eliminar inversionista */}
      <Modal
        isOpen={!!deletingInversionista}
        onClose={() => { setDeletingInversionista(null); setDeleteConfirm(""); }}
        title="Eliminar inversionista"
        size="sm"
      >
        {deletingInversionista && (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--text-secondary)]">
              Esta acción eliminará a <strong>{deletingInversionista.nombre}</strong> y todas sus inversiones y retornos
              registrados. Para confirmar, escribe su nombre:
            </p>
            <Input
              label={`Escribe "${deletingInversionista.nombre}" para confirmar`}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deletingInversionista.nombre}
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => { setDeletingInversionista(null); setDeleteConfirm(""); }}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={deleteConfirm !== deletingInversionista.nombre}
                loading={deletingLoading}
                onClick={handleEliminarInversionista}
              >
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: nueva inversión */}
      <Modal
        isOpen={!!inversionModalInversionistaId}
        onClose={() => setInversionModalInversionistaId(null)}
        title="Nueva inversión"
      >
        <div className="space-y-3">
          {cultivos.length === 0 ? (
            <p className="text-[12px] text-[var(--text-muted)]">No tienes cultivos registrados todavía — crea uno primero en el módulo Cultivos.</p>
          ) : (
            <Select
              label="Cultivo *"
              value={inversionForm.cultivoId}
              onChange={(e) => setInversionForm({ ...inversionForm, cultivoId: e.target.value })}
              options={cultivos.map((c) => ({ value: c.id, label: cultivoLabel(c) }))}
              placeholder="Selecciona el cultivo que financia"
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto aportado (COP) *"
              type="number"
              min="0"
              value={inversionForm.montoAportado}
              onChange={(e) => setInversionForm({ ...inversionForm, montoAportado: e.target.value })}
              placeholder="Ej: 5000000"
            />
            <Input
              label="% de participación *"
              type="number"
              min="0"
              max="100"
              value={inversionForm.porcentajeParticipacion}
              onChange={(e) => setInversionForm({ ...inversionForm, porcentajeParticipacion: e.target.value })}
              placeholder="Ej: 30"
            />
          </div>
          <Textarea
            label="Condiciones (opcional)"
            value={inversionForm.condiciones}
            onChange={(e) => setInversionForm({ ...inversionForm, condiciones: e.target.value })}
            placeholder="Ej: participación sobre utilidad neta, plazo 3 años..."
            rows={2}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setInversionModalInversionistaId(null)}>Cancelar</Button>
            <Button loading={savingInversion} onClick={handleAgregarInversion}>Registrar inversión</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: nuevo retorno */}
      <Modal isOpen={!!retornoModal} onClose={() => setRetornoModal(null)} title="Registrar retorno">
        <div className="space-y-3">
          <Input
            label="Monto (COP) *"
            type="number"
            min="0"
            value={retornoForm.monto}
            onChange={(e) => setRetornoForm({ ...retornoForm, monto: e.target.value })}
            placeholder="Ej: 1500000"
          />
          <Input
            label="Concepto (opcional)"
            value={retornoForm.concepto}
            onChange={(e) => setRetornoForm({ ...retornoForm, concepto: e.target.value })}
            placeholder="Ej: distribución utilidad primera cosecha"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setRetornoModal(null)}>Cancelar</Button>
            <Button loading={savingRetorno} onClick={handleAgregarRetorno}>Registrar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
