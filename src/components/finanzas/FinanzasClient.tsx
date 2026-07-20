"use client";

import { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Plus, Trash2, DollarSign, TrendingDown, TrendingUp, Wallet, FileDown, Users,
} from "lucide-react";
import { Button, Modal, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { RegistroJornalForm } from "@/components/finanzas/RegistroJornalForm";
import { ExportarFinagroButton } from "@/components/finanzas/ExportarFinagroButton";
import { CATEGORIA_LABELS } from "@/types";
import { formatCOP, formatCOPFull, formatDate } from "@/lib/utils";
import { gastoFormSchema, ingresoFormSchema } from "@/lib/validations";
import { exportFinanciasPDF } from "@/lib/pdf-export";
import toast from "react-hot-toast";
import type { CategoriaGasto, Comprador, Cultivo, Gasto, Lote } from "@prisma/client";
import type { IngresoWithRelations } from "@/types";

type GastoWithCultivo = Gasto & { cultivo: (Cultivo & { lote: Lote }) | null };

interface FinanzasClientProps {
  gastos: GastoWithCultivo[];
  ingresos: IngresoWithRelations[];
  cultivos: (Cultivo & { lote: Lote })[];
  compradores: Comprador[];
  nombreFinca?: string;
}

const CATEGORIA_COLORS: Record<string, string> = {
  INSUMOS: "#639922",
  MANO_OBRA: "#1D9E75",
  MAQUINARIA: "#EF9F27",
  AGUA_RIEGO: "#378ADD",
  SEMILLAS_PLANTULAS: "#97C459",
  TRANSPORTE: "#BA7517",
  CERTIFICACIONES: "#D85A30",
  TIERRA: "#888780",
  HERRAMIENTAS: "#534AB7",
  ENERGIA: "#E24B4A",
  OTROS: "#B4B2A9",
};

const today = new Date().toISOString().split("T")[0];

export function FinanzasClient({
  gastos: initialGastos,
  ingresos: initialIngresos,
  cultivos,
  compradores,
  nombreFinca = "Mi Finca",
}: FinanzasClientProps) {
  // ── Gastos state ──────────────────────────────────────────────────────────
  const [gastos, setGastos] = useState(initialGastos);
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [showJornalModal, setShowJornalModal] = useState(false);
  const [gastoLoading, setGastoLoading] = useState(false);
  const [filterCat, setFilterCat] = useState("");
  const [filterPeriodo, setFilterPeriodo] = useState("2026");

  const [gastoForm, setGastoForm] = useState({
    concepto: "",
    categoria: "INSUMOS" as CategoriaGasto,
    monto: "",
    fecha: today,
    proveedor: "",
    notas: "",
    cultivoId: cultivos[0]?.id ?? "",
  });
  const [gastoErrors, setGastoErrors] = useState<Record<string, string>>({});

  // ── Ingresos state ────────────────────────────────────────────────────────
  const [ingresos, setIngresos] = useState(initialIngresos);
  const [showIngresoModal, setShowIngresoModal] = useState(false);
  const [ingresoLoading, setIngresoLoading] = useState(false);

  const [ingresoForm, setIngresoForm] = useState({
    concepto: "",
    monto: "",
    cantidadKg: "",
    fecha: today,
    compradorId: "",
    cultivoId: cultivos[0]?.id ?? "",
    notas: "",
  });
  const [ingresoErrors, setIngresoErrors] = useState<Record<string, string>>({});

  // Auto-calculate precioKg display
  const precioKgCalc = useMemo(() => {
    const kg = Number(ingresoForm.cantidadKg);
    const monto = Number(ingresoForm.monto);
    if (kg > 0 && monto > 0) return (monto / kg).toFixed(0);
    return null;
  }, [ingresoForm.cantidadKg, ingresoForm.monto]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      const fecha = new Date(g.fecha);
      if (filterPeriodo === "mes") {
        const hoy = new Date();
        return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
      }
      if (filterPeriodo === "2026") return fecha.getFullYear() === 2026;
      return true;
    });
  }, [gastos, filterPeriodo]);

  const ingresosFiltrados = useMemo(() => {
    return ingresos.filter((i) => {
      const fecha = new Date(i.fecha);
      if (filterPeriodo === "mes") {
        const hoy = new Date();
        return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
      }
      if (filterPeriodo === "2026") return fecha.getFullYear() === 2026;
      return true;
    });
  }, [ingresos, filterPeriodo]);

  const totalGastos = useMemo(() => gastosFiltrados.reduce((s, g) => s + g.monto, 0), [gastosFiltrados]);
  const totalIngresos = useMemo(() => ingresosFiltrados.reduce((s, i) => s + i.monto, 0), [ingresosFiltrados]);
  const saldo = totalIngresos - totalGastos;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    gastosFiltrados.forEach((g) => {
      map[g.categoria] = (map[g.categoria] ?? 0) + g.monto;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, label: CATEGORIA_LABELS[name as CategoriaGasto] ?? name, value }))
      .sort((a, b) => b.value - a.value);
  }, [gastosFiltrados]);

  const gastosPorMes = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mes = new Date(2026, i, 1);
      const label = mes.toLocaleDateString("es-CO", { month: "short" });
      const totalGastosMonth = gastosFiltrados
        .filter((g) => new Date(g.fecha).getMonth() === i && new Date(g.fecha).getFullYear() === 2026)
        .reduce((s, g) => s + g.monto, 0);
      const totalIngresosMonth = ingresosFiltrados
        .filter((ing) => new Date(ing.fecha).getMonth() === i && new Date(ing.fecha).getFullYear() === 2026)
        .reduce((s, ing) => s + ing.monto, 0);
      return { mes: label, gastos: totalGastosMonth, ingresos: totalIngresosMonth };
    });
  }, [gastosFiltrados, ingresosFiltrados]);

  const filteredGastos = filterCat ? gastosFiltrados.filter((g) => g.categoria === filterCat) : gastosFiltrados;

  // ── PDF Export ────────────────────────────────────────────────────────────
  const periodo = useMemo(() => {
    const allDates = [
      ...gastos.map((g) => new Date(g.fecha)),
      ...ingresos.map((i) => new Date(i.fecha)),
    ];
    if (allDates.length === 0) {
      const now = new Date();
      return now.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
    }
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const fmtOptions: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
    if (
      minDate.getMonth() === maxDate.getMonth() &&
      minDate.getFullYear() === maxDate.getFullYear()
    ) {
      return maxDate.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
    }
    return `${minDate.toLocaleDateString("es-CO", fmtOptions)} – ${maxDate.toLocaleDateString("es-CO", fmtOptions)}`;
  }, [gastos, ingresos]);

  const handleExportPDF = () => {
    try {
      exportFinanciasPDF({
        nombreFinca,
        periodo,
        gastos: gastos.map((g) => ({
          concepto: g.concepto,
          categoria: g.categoria,
          monto: g.monto,
          fecha: g.fecha,
        })),
        ingresos: ingresos.map((i) => ({
          concepto: i.concepto,
          monto: i.monto,
          fecha: i.fecha,
        })),
      });
      toast.success("PDF generado correctamente");
    } catch {
      toast.error("Error al generar el PDF");
    }
  };

  // ── Gasto handlers ────────────────────────────────────────────────────────
  const handleGastoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGastoErrors({});

    const result = gastoFormSchema.safeParse({
      ...gastoForm,
      monto: gastoForm.monto ? Number(gastoForm.monto) : undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setGastoErrors(fieldErrors);
      return;
    }

    setGastoLoading(true);
    try {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...gastoForm,
          monto: Number(gastoForm.monto),
          cultivoId: gastoForm.cultivoId || undefined,
        }),
      });
      const { data } = await res.json();
      if (!res.ok) throw new Error();
      setGastos((prev) => [data, ...prev]);
      setShowGastoModal(false);
      setGastoForm({
        concepto: "", categoria: "INSUMOS", monto: "", fecha: today,
        proveedor: "", notas: "", cultivoId: cultivos[0]?.id ?? "",
      });
      toast.success("Gasto registrado");
    } catch {
      toast.error("Error al registrar el gasto");
    } finally {
      setGastoLoading(false);
    }
  };

  const handleGastoDelete = async (id: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-[13px]">¿Eliminar este gasto?</span>
        <button
          onClick={() => { toast.dismiss(t.id); doDeleteGasto(id); }}
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

  const doDeleteGasto = async (id: string) => {
    try {
      await fetch(`/api/gastos/${id}`, { method: "DELETE" });
      setGastos((prev) => prev.filter((g) => g.id !== id));
      toast.success("Gasto eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  // ── Ingreso handlers ──────────────────────────────────────────────────────
  const handleIngresoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngresoErrors({});

    const result = ingresoFormSchema.safeParse({
      concepto: ingresoForm.concepto,
      monto: ingresoForm.monto ? Number(ingresoForm.monto) : undefined,
      cantidadKg: ingresoForm.cantidadKg ? Number(ingresoForm.cantidadKg) : undefined,
      fecha: ingresoForm.fecha,
      compradorId: ingresoForm.compradorId || undefined,
      cultivoId: ingresoForm.cultivoId || undefined,
      notas: ingresoForm.notas || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setIngresoErrors(fieldErrors);
      return;
    }

    setIngresoLoading(true);
    try {
      const res = await fetch("/api/ingresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concepto: ingresoForm.concepto,
          monto: Number(ingresoForm.monto),
          cantidadKg: ingresoForm.cantidadKg ? Number(ingresoForm.cantidadKg) : undefined,
          fecha: ingresoForm.fecha,
          compradorId: ingresoForm.compradorId || undefined,
          cultivoId: ingresoForm.cultivoId || undefined,
          notas: ingresoForm.notas || undefined,
        }),
      });
      const { data } = await res.json();
      if (!res.ok) throw new Error();
      setIngresos((prev) => [data, ...prev]);
      setShowIngresoModal(false);
      setIngresoForm({
        concepto: "", monto: "", cantidadKg: "", fecha: today,
        compradorId: "", cultivoId: cultivos[0]?.id ?? "", notas: "",
      });
      toast.success("Ingreso registrado");
    } catch {
      toast.error("Error al registrar el ingreso");
    } finally {
      setIngresoLoading(false);
    }
  };

  const handleIngresoDelete = async (id: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-[13px]">¿Eliminar este ingreso?</span>
        <button
          onClick={() => { toast.dismiss(t.id); doDeleteIngreso(id); }}
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

  const doDeleteIngreso = async (id: string) => {
    try {
      await fetch(`/api/ingresos/${id}`, { method: "DELETE" });
      setIngresos((prev) => prev.filter((i) => i.id !== id));
      toast.success("Ingreso eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <select
          value={filterPeriodo}
          onChange={(e) => setFilterPeriodo(e.target.value)}
          className="h-8 px-3 text-[12px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white"
        >
          <option value="todos">Todo el historial</option>
          <option value="2026">Año 2026</option>
          <option value="mes">Este mes</option>
        </select>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowJornalModal(true)} style={{ minHeight: 44 }}>
            <Users size={14} />
            Registrar jornal
          </Button>
          <ExportarFinagroButton />
          <Button variant="secondary" size="sm" onClick={handleExportPDF}>
            <FileDown size={14} />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total gastos",
            value: formatCOP(totalGastos),
            sub: `${gastos.length} registro${gastos.length !== 1 ? "s" : ""}`,
            color: "text-red-600",
            bg: "bg-red-50",
            icon: TrendingDown,
          },
          {
            label: "Total ingresos",
            value: formatCOP(totalIngresos),
            sub: `${ingresos.length} registro${ingresos.length !== 1 ? "s" : ""}`,
            color: "text-agro-600",
            bg: "bg-agro-50",
            icon: TrendingUp,
          },
          {
            label: "Saldo",
            value: formatCOP(saldo),
            sub: saldo >= 0 ? "Ganancia neta" : "Inversión neta",
            color: saldo >= 0 ? "text-agro-600" : "text-red-600",
            bg: saldo >= 0 ? "bg-agro-50" : "bg-red-50",
            icon: Wallet,
          },
          {
            label: "Mayor categoría",
            value: byCategory[0]?.label ?? "—",
            sub: byCategory[0] ? formatCOP(byCategory[0].value) : "",
            color: "text-harvest-400",
            bg: "bg-harvest-50",
            icon: DollarSign,
          },
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

      {/* Proyección financiera */}
      {(() => {
        const produccionEstimada = 16000;
        const preciosCompradores = compradores.filter((c) => c.precioKg).map((c) => c.precioKg!);
        const precioPromedio = preciosCompradores.length > 0
          ? preciosCompradores.reduce((s, p) => s + p, 0) / preciosCompradores.length
          : 3200;
        const ingresoProyectado = produccionEstimada * precioPromedio;
        const roi = totalGastos > 0 ? ((ingresoProyectado - totalGastos) / totalGastos) * 100 : 0;

        return (
          <div className="card p-4" style={{ background: '#EAF3DE', border: '1px solid #C0DD97' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#3B6D11', marginBottom: 8 }}>
              📈 Proyección primera cosecha (Ene 2028)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#5F7052' }}>Inversión acumulada</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#A32D2D' }}>{formatCOP(totalGastos)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#5F7052' }}>Ingreso proyectado</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#3B6D11' }}>{formatCOP(ingresoProyectado)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#5F7052' }}>ROI estimado</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#185FA5' }}>{roi.toFixed(0)}%</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#5F7052', marginTop: 8 }}>
              Basado en 16 ton estimadas × {formatCOP(precioPromedio)}/kg promedio compradores registrados
            </div>
          </div>
        );
      })()}

      {/* Charts row */}
      {byCategory.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Donut */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
              Gastos por categoría
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={byCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {byCategory.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORIA_COLORS[entry.name] ?? "#888"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCOPFull(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {byCategory.slice(0, 5).map((c) => (
                <div key={c.name} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CATEGORIA_COLORS[c.name] ?? "#888" }} />
                    {c.label}
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">{formatCOP(c.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly bar */}
          <div className="card p-5 lg:col-span-3">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
              Evolución financiera 2026
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gastosPorMes} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE8" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#8FA080" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8FA080" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCOP(v)} />
                <Tooltip formatter={(v: number) => formatCOPFull(v)} />
                <Bar dataKey="gastos" name="Gastos" fill="#F09595" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#97C459" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Ingresos table ── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 border-b border-[var(--border-subtle)]">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Registro de ingresos
          </h3>
          <Button size="sm" className="self-start sm:self-auto" onClick={() => setShowIngresoModal(true)}>
            <Plus size={14} />
            Registrar ingreso
          </Button>
        </div>

        {ingresos.length === 0 ? (
          <EmptyState
            title="Sin ingresos registrados"
            description="Registra tus primeras ventas del cultivo."
            action={<Button onClick={() => setShowIngresoModal(true)}>Registrar ingreso</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-[var(--border-subtle)]">
                  <th className="px-4 sm:px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Concepto</th>
                  <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Comprador</th>
                  <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Kg</th>
                  <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Precio/kg</th>
                  <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Fecha</th>
                  <th className="px-4 sm:px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Monto</th>
                  <th className="px-4 sm:px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody>
                {ingresos.map((i) => (
                  <tr key={i.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-page)] transition-colors">
                    <td className="px-4 sm:px-5 py-3">
                      <div className="text-[13px] font-medium text-[var(--text-primary)]">{i.concepto}</div>
                      {i.cultivo && (
                        <div className="text-[11px] text-[var(--text-muted)]">{i.cultivo.lote.nombre}</div>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3 text-[12px] text-[var(--text-secondary)]">
                      {i.comprador?.nombre ?? "—"}
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3 text-[12px] text-[var(--text-secondary)]">
                      {i.cantidadKg != null ? `${i.cantidadKg} kg` : "—"}
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3 text-[12px] text-[var(--text-secondary)]">
                      {i.precioKg != null ? `${formatCOP(i.precioKg)}/kg` : "—"}
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3 text-[12px] text-[var(--text-secondary)] whitespace-nowrap">
                      {formatDate(i.fecha, true)}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-[13px] font-semibold text-agro-600 whitespace-nowrap">
                      {formatCOPFull(i.monto)}
                    </td>
                    <td className="px-4 sm:px-5 py-3">
                      <button
                        onClick={() => handleIngresoDelete(i.id)}
                        className="p-1.5 hover:bg-red-50 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-red-500 transition-colors"
                        aria-label="Eliminar ingreso"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--surface-page)]">
                  <td colSpan={5} className="px-4 sm:px-5 py-3 text-[12px] font-semibold text-[var(--text-secondary)] hidden sm:table-cell">
                    Total ingresos
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-[12px] font-semibold text-[var(--text-secondary)] sm:hidden">
                    Total
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-[14px] font-bold text-agro-600 whitespace-nowrap">
                    {formatCOPFull(totalIngresos)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Gastos table ── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
              Registro de gastos
            </h3>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="h-8 px-2 text-[12px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white"
            >
              <option value="">Todas las categorías</option>
              {Object.entries(CATEGORIA_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <Button size="sm" className="self-start sm:self-auto" onClick={() => setShowGastoModal(true)}>
            <Plus size={14} />
            Nuevo gasto
          </Button>
        </div>

        {filteredGastos.length === 0 ? (
          <EmptyState
            title="Sin gastos registrados"
            description="Registra tus primeros gastos del cultivo."
            action={<Button onClick={() => setShowGastoModal(true)}>Registrar gasto</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-[var(--border-subtle)]">
                  <th className="px-4 sm:px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Concepto</th>
                  <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Categoría</th>
                  <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Lote</th>
                  <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Fecha</th>
                  <th className="px-4 sm:px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Monto</th>
                  <th className="px-4 sm:px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody>
                {filteredGastos.map((g) => (
                  <tr key={g.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-page)] transition-colors">
                    <td className="px-4 sm:px-5 py-3">
                      <div className="text-[13px] font-medium text-[var(--text-primary)]">{g.concepto}</div>
                      {g.proveedor && <div className="text-[11px] text-[var(--text-muted)]">{g.proveedor}</div>}
                      <span
                        className="sm:hidden inline-block mt-1 badge text-[10px]"
                        style={{ background: `${CATEGORIA_COLORS[g.categoria]}22`, color: CATEGORIA_COLORS[g.categoria] }}
                      >
                        {CATEGORIA_LABELS[g.categoria]}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3">
                      <span
                        className="badge text-[10px]"
                        style={{ background: `${CATEGORIA_COLORS[g.categoria]}22`, color: CATEGORIA_COLORS[g.categoria] }}
                      >
                        {CATEGORIA_LABELS[g.categoria]}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3 text-[12px] text-[var(--text-secondary)]">
                      {g.cultivo?.lote?.nombre ?? "—"}
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3 text-[12px] text-[var(--text-secondary)] whitespace-nowrap">
                      {formatDate(g.fecha, true)}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-[13px] font-semibold text-red-600 whitespace-nowrap">
                      {formatCOPFull(g.monto)}
                    </td>
                    <td className="px-4 sm:px-5 py-3">
                      <button
                        onClick={() => handleGastoDelete(g.id)}
                        className="p-1.5 hover:bg-red-50 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-red-500 transition-colors"
                        aria-label="Eliminar gasto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--surface-page)]">
                  <td colSpan={4} className="px-4 sm:px-5 py-3 text-[12px] font-semibold text-[var(--text-secondary)] hidden sm:table-cell">
                    Total gastos
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-[12px] font-semibold text-[var(--text-secondary)] sm:hidden">
                    Total
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-[14px] font-bold text-red-600 whitespace-nowrap">
                    {formatCOPFull(totalGastos)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Ingreso Modal ── */}
      <Modal isOpen={showIngresoModal} onClose={() => setShowIngresoModal(false)} title="Registrar ingreso">
        <form onSubmit={handleIngresoSubmit} className="space-y-4">
          <Input
            label="Concepto"
            value={ingresoForm.concepto}
            onChange={(e) => {
              setIngresoForm({ ...ingresoForm, concepto: e.target.value });
              if (ingresoErrors.concepto) setIngresoErrors((prev) => ({ ...prev, concepto: undefined! }));
            }}
            placeholder="Ej: Venta aguacate Hass primera cosecha"
            error={ingresoErrors.concepto}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto total (COP)"
              type="number"
              value={ingresoForm.monto}
              onChange={(e) => {
                setIngresoForm({ ...ingresoForm, monto: e.target.value });
                if (ingresoErrors.monto) setIngresoErrors((prev) => ({ ...prev, monto: undefined! }));
              }}
              placeholder="0"
              min="1"
              error={ingresoErrors.monto}
            />
            <Input
              label="Cantidad (kg)"
              type="number"
              value={ingresoForm.cantidadKg}
              onChange={(e) => {
                setIngresoForm({ ...ingresoForm, cantidadKg: e.target.value });
                if (ingresoErrors.cantidadKg) setIngresoErrors((prev) => ({ ...prev, cantidadKg: undefined! }));
              }}
              placeholder="Opcional"
              min="0"
              error={ingresoErrors.cantidadKg}
            />
          </div>

          {precioKgCalc && (
            <p className="text-[12px] text-agro-600 bg-agro-50 px-3 py-2 rounded-[var(--radius-md)]">
              Precio calculado: <strong>{formatCOP(Number(precioKgCalc))}/kg</strong>
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fecha"
              type="date"
              value={ingresoForm.fecha}
              max={today}
              onChange={(e) => {
                setIngresoForm({ ...ingresoForm, fecha: e.target.value });
                if (ingresoErrors.fecha) setIngresoErrors((prev) => ({ ...prev, fecha: undefined! }));
              }}
              error={ingresoErrors.fecha}
            />
            <Select
              label="Cultivo asociado"
              value={ingresoForm.cultivoId}
              onChange={(e) => setIngresoForm({ ...ingresoForm, cultivoId: e.target.value })}
              options={cultivos.map((c) => ({
                value: c.id,
                label: `${c.lote.nombre} · ${c.variedad}`,
              }))}
              placeholder="Sin asociar"
            />
          </div>

          {compradores.length > 0 && (
            <Select
              label="Comprador"
              value={ingresoForm.compradorId}
              onChange={(e) => setIngresoForm({ ...ingresoForm, compradorId: e.target.value })}
              options={compradores.map((c) => ({ value: c.id, label: c.nombre }))}
              placeholder="Sin comprador"
            />
          )}

          <Textarea
            label="Notas (opcional)"
            value={ingresoForm.notas}
            onChange={(e) => {
              setIngresoForm({ ...ingresoForm, notas: e.target.value });
              if (ingresoErrors.notas) setIngresoErrors((prev) => ({ ...prev, notas: undefined! }));
            }}
            placeholder="Detalles adicionales..."
            rows={2}
            error={ingresoErrors.notas}
          />

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowIngresoModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={ingresoLoading}>
              Guardar ingreso
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Gasto Modal ── */}
      <Modal isOpen={showGastoModal} onClose={() => setShowGastoModal(false)} title="Registrar gasto">
        <form onSubmit={handleGastoSubmit} className="space-y-4">
          <Input
            label="Concepto del gasto"
            value={gastoForm.concepto}
            onChange={(e) => {
              setGastoForm({ ...gastoForm, concepto: e.target.value });
              if (gastoErrors.concepto) setGastoErrors((prev) => ({ ...prev, concepto: undefined! }));
            }}
            placeholder="Ej: Plántulas Hass certificadas"
            error={gastoErrors.concepto}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoría"
              value={gastoForm.categoria}
              onChange={(e) => {
                setGastoForm({ ...gastoForm, categoria: e.target.value as CategoriaGasto });
                if (gastoErrors.categoria) setGastoErrors((prev) => ({ ...prev, categoria: undefined! }));
              }}
              options={Object.entries(CATEGORIA_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              error={gastoErrors.categoria}
            />
            <Input
              label="Monto (COP)"
              type="number"
              value={gastoForm.monto}
              onChange={(e) => {
                setGastoForm({ ...gastoForm, monto: e.target.value });
                if (gastoErrors.monto) setGastoErrors((prev) => ({ ...prev, monto: undefined! }));
              }}
              placeholder="0"
              min="0"
              error={gastoErrors.monto}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fecha"
              type="date"
              value={gastoForm.fecha}
              max={today}
              onChange={(e) => {
                setGastoForm({ ...gastoForm, fecha: e.target.value });
                if (gastoErrors.fecha) setGastoErrors((prev) => ({ ...prev, fecha: undefined! }));
              }}
              error={gastoErrors.fecha}
            />
            <Select
              label="Cultivo asociado"
              value={gastoForm.cultivoId}
              onChange={(e) => setGastoForm({ ...gastoForm, cultivoId: e.target.value })}
              options={cultivos.map((c) => ({
                value: c.id,
                label: `${c.lote.nombre} · ${c.variedad}`,
              }))}
              placeholder="Sin asociar"
            />
          </div>

          <Input
            label="Proveedor (opcional)"
            value={gastoForm.proveedor}
            onChange={(e) => {
              setGastoForm({ ...gastoForm, proveedor: e.target.value });
              if (gastoErrors.proveedor) setGastoErrors((prev) => ({ ...prev, proveedor: undefined! }));
            }}
            placeholder="Nombre del proveedor"
            error={gastoErrors.proveedor}
          />

          <Textarea
            label="Notas (opcional)"
            value={gastoForm.notas}
            onChange={(e) => {
              setGastoForm({ ...gastoForm, notas: e.target.value });
              if (gastoErrors.notas) setGastoErrors((prev) => ({ ...prev, notas: undefined! }));
            }}
            placeholder="Detalles adicionales..."
            rows={2}
            error={gastoErrors.notas}
          />

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowGastoModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={gastoLoading}>
              Guardar gasto
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Jornal Modal ── */}
      <Modal isOpen={showJornalModal} onClose={() => setShowJornalModal(false)} title="Registrar jornal" size="md">
        <RegistroJornalForm
          onSuccess={async () => {
            setShowJornalModal(false);
            // Refresh gastos to show the auto-created MANO_OBRA entry
            try {
              const res = await fetch("/api/gastos");
              const { data } = await res.json();
              if (Array.isArray(data)) setGastos(data);
            } catch {}
          }}
          onCancel={() => setShowJornalModal(false)}
        />
      </Modal>
    </div>
  );
}
