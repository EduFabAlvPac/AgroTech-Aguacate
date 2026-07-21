"use client";

import { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import {
  Plus, Trash2, DollarSign, TrendingDown, TrendingUp, Wallet,
  FileDown, Users, Pencil, BarChart3, Calculator, ClipboardList, PiggyBank,
} from "lucide-react";
import { Button, Modal, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { RegistroJornalForm } from "@/components/finanzas/RegistroJornalForm";
import { ExportarFinagroButton } from "@/components/finanzas/ExportarFinagroButton";
import { CATEGORIA_LABELS, TIPO_GASTO_LABELS } from "@/types";
import { formatCOP, formatCOPFull, formatDate } from "@/lib/utils";
import { gastoFormSchema, ingresoFormSchema } from "@/lib/validations";
import { exportFinanciasPDF } from "@/lib/pdf-export";
import toast from "react-hot-toast";
import type { CategoriaGasto, Comprador, Cultivo, Gasto, Lote, Presupuesto, TipoGasto } from "@prisma/client";
import type { IngresoWithRelations } from "@/types";

type GastoWithRelations = Gasto & { cultivo: (Cultivo & { lote: Lote }) | null; lote: Lote | null };

interface FinanzasClientProps {
  gastos: GastoWithRelations[];
  ingresos: IngresoWithRelations[];
  cultivos: (Cultivo & { lote: Lote })[];
  compradores: Comprador[];
  lotes: { id: string; nombre: string; areaHa: number }[];
  presupuestos: Presupuesto[];
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

const TABS = [
  { id: "resumen", label: "Resumen", icon: BarChart3 },
  { id: "costos", label: "Costos", icon: Calculator },
  { id: "presupuesto", label: "Presupuesto", icon: PiggyBank },
  { id: "registros", label: "Registros", icon: ClipboardList },
] as const;

type TabId = (typeof TABS)[number]["id"];
const today = new Date().toISOString().split("T")[0];

export function FinanzasClient({
  gastos: initialGastos,
  ingresos: initialIngresos,
  cultivos,
  compradores,
  lotes,
  presupuestos: initialPresupuestos,
  nombreFinca = "Mi Finca",
}: FinanzasClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("resumen");

  // ── Gastos state ──────────────────────────────────────────────────────────
  const [gastos, setGastos] = useState(initialGastos);
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [showJornalModal, setShowJornalModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoWithRelations | null>(null);
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
    loteId: "",
    subcategoria: "",
    tipoGasto: "VARIABLE" as TipoGasto,
    cantidad: "",
    unidad: "",
    precioUnitario: "",
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

  // ── Presupuesto state ─────────────────────────────────────────────────────
  const [presupuestos, setPresupuestos] = useState(initialPresupuestos);
  const [presupuestoForm, setPresupuestoForm] = useState<Record<string, string>>({});
  const [presupuestoLoading, setPresupuestoLoading] = useState(false);

  // Auto-calculate precioKg display
  const precioKgCalc = useMemo(() => {
    const kg = Number(ingresoForm.cantidadKg);
    const monto = Number(ingresoForm.monto);
    if (kg > 0 && monto > 0) return (monto / kg).toFixed(0);
    return null;
  }, [ingresoForm.cantidadKg, ingresoForm.monto]);

  // Auto-calculate monto from cantidad × precioUnitario
  const montoCalc = useMemo(() => {
    const cant = Number(gastoForm.cantidad);
    const precio = Number(gastoForm.precioUnitario);
    if (cant > 0 && precio > 0) return (cant * precio).toString();
    return null;
  }, [gastoForm.cantidad, gastoForm.precioUnitario]);

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

  // Costos por tipo
  const costosPorTipo = useMemo(() => {
    const result = { FIJO: 0, VARIABLE: 0, INVERSION: 0 };
    gastosFiltrados.forEach((g) => { result[g.tipoGasto] += g.monto; });
    return result;
  }, [gastosFiltrados]);

  // Costos por lote
  const costosPorLote = useMemo(() => {
    const map: Record<string, { nombre: string; areaHa: number; total: number }> = {};
    let sinAsignar = 0;
    gastosFiltrados.forEach((g) => {
      const lote = g.lote || g.cultivo?.lote;
      if (lote) {
        if (!map[lote.id]) map[lote.id] = { nombre: lote.nombre, areaHa: lote.areaHa, total: 0 };
        map[lote.id].total += g.monto;
      } else {
        sinAsignar += g.monto;
      }
    });
    const result = Object.values(map).sort((a, b) => b.total - a.total);
    if (sinAsignar > 0) result.push({ nombre: "Sin asignar", areaHa: 0, total: sinAsignar });
    return result;
  }, [gastosFiltrados]);

  // Top 5 gastos
  const top5Gastos = useMemo(() => {
    return [...gastosFiltrados].sort((a, b) => b.monto - a.monto).slice(0, 5);
  }, [gastosFiltrados]);

  // Indicadores financieros
  const indicadores = useMemo(() => {
    const hectareasActivas = lotes.reduce((s, l) => s + l.areaHa, 0);
    const plantasActivas = cultivos.reduce((s, c) => s + (c.cantidadPlantas ?? 0), 0);
    const costoTotalPorHa = hectareasActivas > 0 ? totalGastos / hectareasActivas : 0;
    const costoTotalPorPlanta = plantasActivas > 0 ? totalGastos / plantasActivas : 0;
    const produccionEstimadaKg = lotes.reduce((s, l) => s + l.areaHa * 8000, 0);
    const puntoEquilibrioPrecio = produccionEstimadaKg > 0 ? totalGastos / produccionEstimadaKg : 0;
    const preciosCompradores = compradores.filter((c) => c.precioKg).map((c) => c.precioKg!);
    const precioPromedioCompradores = preciosCompradores.length > 0
      ? preciosCompradores.reduce((s, p) => s + p, 0) / preciosCompradores.length
      : 3200;
    const ingresoProyectado = produccionEstimadaKg * precioPromedioCompradores;
    const margenBruto = ingresoProyectado - totalGastos;
    const margenPorcentaje = ingresoProyectado > 0 ? (margenBruto / ingresoProyectado) * 100 : 0;
    const roi = totalGastos > 0 ? ((ingresoProyectado - totalGastos) / totalGastos) * 100 : 0;
    return {
      hectareasActivas, plantasActivas, costoTotalPorHa, costoTotalPorPlanta,
      produccionEstimadaKg, puntoEquilibrioPrecio, precioPromedioCompradores,
      ingresoProyectado, margenBruto, margenPorcentaje, roi,
    };
  }, [totalGastos, lotes, cultivos, compradores]);

  // Presupuesto vs Real
  const presupuestoVsReal = useMemo(() => {
    return presupuestos.map((p) => {
      const real = gastosFiltrados
        .filter((g) => g.categoria === p.categoria)
        .reduce((s, g) => s + g.monto, 0);
      const porcentaje = p.montoPlaneado > 0 ? (real / p.montoPlaneado) * 100 : 0;
      return { categoria: p.categoria, planeado: p.montoPlaneado, real, variacion: real - p.montoPlaneado, porcentaje };
    });
  }, [presupuestos, gastosFiltrados]);

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
    if (minDate.getMonth() === maxDate.getMonth() && minDate.getFullYear() === maxDate.getFullYear()) {
      return maxDate.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
    }
    return `${minDate.toLocaleDateString("es-CO", fmtOptions)} – ${maxDate.toLocaleDateString("es-CO", fmtOptions)}`;
  }, [gastos, ingresos]);

  const handleExportPDF = () => {
    try {
      exportFinanciasPDF({
        nombreFinca,
        periodo,
        gastos: gastos.map((g) => ({ concepto: g.concepto, categoria: g.categoria, monto: g.monto, fecha: g.fecha })),
        ingresos: ingresos.map((i) => ({ concepto: i.concepto, monto: i.monto, fecha: i.fecha })),
      });
      toast.success("PDF generado correctamente");
    } catch { toast.error("Error al generar el PDF"); }
  };

  // ── Gasto handlers ────────────────────────────────────────────────────────
  const handleGastoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGastoErrors({});

    const montoFinal = montoCalc || gastoForm.monto;
    const result = gastoFormSchema.safeParse({
      ...gastoForm,
      monto: montoFinal ? Number(montoFinal) : undefined,
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
      const url = editingGasto ? `/api/gastos/${editingGasto.id}` : "/api/gastos";
      const method = editingGasto ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...gastoForm,
          monto: Number(montoFinal || gastoForm.monto),
          cultivoId: gastoForm.cultivoId || undefined,
          loteId: gastoForm.loteId || undefined,
          subcategoria: gastoForm.subcategoria || undefined,
          cantidad: gastoForm.cantidad ? Number(gastoForm.cantidad) : undefined,
          unidad: gastoForm.unidad || undefined,
          precioUnitario: gastoForm.precioUnitario ? Number(gastoForm.precioUnitario) : undefined,
        }),
      });
      const { data } = await res.json();
      if (!res.ok) throw new Error();

      if (editingGasto) {
        setGastos((prev) => prev.map((g) => g.id === editingGasto.id ? data : g));
        toast.success("Gasto actualizado");
      } else {
        setGastos((prev) => [data, ...prev]);
        toast.success("Gasto registrado");
      }

      setShowGastoModal(false);
      setEditingGasto(null);
      resetGastoForm();
    } catch { toast.error("Error al registrar el gasto"); }
    finally { setGastoLoading(false); }
  };

  const resetGastoForm = () => {
    setGastoForm({
      concepto: "", categoria: "INSUMOS", monto: "", fecha: today,
      proveedor: "", notas: "", cultivoId: cultivos[0]?.id ?? "",
      loteId: "", subcategoria: "", tipoGasto: "VARIABLE",
      cantidad: "", unidad: "", precioUnitario: "",
    });
  };

  const handleGastoDelete = async (id: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-[13px]">¿Eliminar este gasto?</span>
        <button
          onClick={() => { toast.dismiss(t.id); doDeleteGasto(id); }}
          className="px-3 py-1 bg-red-500 text-white text-[12px] rounded-md font-medium"
        >Eliminar</button>
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
    } catch { toast.error("Error al eliminar"); }
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
      setIngresoForm({ concepto: "", monto: "", cantidadKg: "", fecha: today, compradorId: "", cultivoId: cultivos[0]?.id ?? "", notas: "" });
      toast.success("Ingreso registrado");
    } catch { toast.error("Error al registrar el ingreso"); }
    finally { setIngresoLoading(false); }
  };

  const handleIngresoDelete = async (id: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-[13px]">¿Eliminar este ingreso?</span>
        <button onClick={() => { toast.dismiss(t.id); doDeleteIngreso(id); }} className="px-3 py-1 bg-red-500 text-white text-[12px] rounded-md font-medium">Eliminar</button>
        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 border border-[var(--border-default)] text-[12px] rounded-md">Cancelar</button>
      </div>
    ), { duration: 10000 });
  };

  const doDeleteIngreso = async (id: string) => {
    try {
      await fetch(`/api/ingresos/${id}`, { method: "DELETE" });
      setIngresos((prev) => prev.filter((i) => i.id !== id));
      toast.success("Ingreso eliminado");
    } catch { toast.error("Error al eliminar"); }
  };

  // ── Presupuesto handler ───────────────────────────────────────────────────
  const handlePresupuestoSave = async () => {
    setPresupuestoLoading(true);
    try {
      const anio = new Date().getFullYear();
      const entries = Object.entries(presupuestoForm).filter(([, v]) => v && Number(v) > 0);
      const results = await Promise.all(
        entries.map(([categoria, monto]) =>
          fetch("/api/presupuesto", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ anio, categoria, montoPlaneado: Number(monto) }),
          }).then((r) => r.json())
        )
      );
      setPresupuestos(results.map((r) => r.data).filter(Boolean));
      toast.success("Presupuesto guardado");
    } catch { toast.error("Error al guardar presupuesto"); }
    finally { setPresupuestoLoading(false); }
  };

  // Cultivos filtrados por lote seleccionado
  const cultivosFiltrados = useMemo(() => {
    if (!gastoForm.loteId) return cultivos;
    return cultivos.filter((c) => c.loteId === gastoForm.loteId);
  }, [gastoForm.loteId, cultivos]);

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2" suppressHydrationWarning>
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
          <ExportarFinagroButton />
          <Button variant="secondary" size="sm" onClick={handleExportPDF}>
            <FileDown size={14} />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)] pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === id
                ? "border-agro-400 text-agro-600"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ════════ TAB: RESUMEN ════════ */}
      {activeTab === "resumen" && (
        <div className="space-y-6">
          {/* KPI Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total gastos", value: formatCOP(totalGastos), sub: `${gastos.length} registros`, color: "text-red-600", bg: "bg-red-50", icon: TrendingDown },
              { label: "Total ingresos", value: formatCOP(totalIngresos), sub: `${ingresos.length} registros`, color: "text-agro-600", bg: "bg-agro-50", icon: TrendingUp },
              { label: "Saldo", value: formatCOP(saldo), sub: saldo >= 0 ? "Ganancia neta" : "Inversión neta", color: saldo >= 0 ? "text-agro-600" : "text-red-600", bg: saldo >= 0 ? "bg-agro-50" : "bg-red-50", icon: Wallet },
              { label: "Costo por ha", value: formatCOP(indicadores.costoTotalPorHa), sub: `${indicadores.hectareasActivas} ha activas`, color: "text-harvest-400", bg: "bg-harvest-50", icon: DollarSign },
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

          {/* Additional KPIs row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Costo por planta</div>
              <div className="text-lg font-semibold text-[var(--text-primary)]">
                {indicadores.plantasActivas > 0 ? formatCOP(indicadores.costoTotalPorPlanta) : "—"}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">{indicadores.plantasActivas} plantas activas</div>
            </div>
            <div className="card p-4">
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Punto de equilibrio</div>
              <div className="text-lg font-semibold text-harvest-400">
                {indicadores.puntoEquilibrioPrecio > 0 ? `${formatCOP(indicadores.puntoEquilibrioPrecio)}/kg` : "—"}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">Precio mínimo para no perder</div>
            </div>
            <div className="card p-4 col-span-2 lg:col-span-1">
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Margen bruto proyectado</div>
              <div className={`text-lg font-semibold ${indicadores.margenBruto >= 0 ? "text-agro-600" : "text-red-600"}`}>
                {indicadores.margenPorcentaje.toFixed(1)}%
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">{formatCOP(indicadores.margenBruto)}</div>
            </div>
          </div>

          {/* Proyección ROI con lenguaje campesino */}
          <div className="card p-4" style={{ background: '#EAF3DE', border: '1px solid #C0DD97' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#3B6D11', marginBottom: 8 }}>
              📈 Proyección primera cosecha
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-[11px] text-[#5F7052]">Inversión acumulada</div>
                <div className="text-[16px] font-semibold text-red-600">{formatCOP(totalGastos)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#5F7052]">Ingreso proyectado</div>
                <div className="text-[16px] font-semibold text-agro-600">{formatCOP(indicadores.ingresoProyectado)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#5F7052]">ROI estimado</div>
                <div className="text-[16px] font-semibold text-[#185FA5]">{indicadores.roi.toFixed(0)}%</div>
              </div>
            </div>
            <div className="text-[12px] text-[#5F7052] mt-3 leading-relaxed">
              Con tus costos actuales de <strong>{formatCOP(totalGastos)}</strong>, necesitas vender el aguacate
              a mínimo <strong>{formatCOP(indicadores.puntoEquilibrioPrecio)}/kg</strong> para no perder.
              {indicadores.precioPromedioCompradores > 0 && (
                <> Tus compradores pagan <strong>{formatCOP(indicadores.precioPromedioCompradores)}/kg</strong>
                {indicadores.precioPromedioCompradores > indicadores.puntoEquilibrioPrecio
                  ? <> → margen de <strong>{formatCOP(indicadores.precioPromedioCompradores - indicadores.puntoEquilibrioPrecio)}/kg</strong> ✅</>
                  : <> → <span className="text-red-600">por debajo del punto de equilibrio</span> ⚠️</>
                }</>
              )}
            </div>
          </div>

          {/* Charts row */}
          {byCategory.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="card p-5 lg:col-span-2">
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">Gastos por categoría</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                      {byCategory.map((entry) => (<Cell key={entry.name} fill={CATEGORIA_COLORS[entry.name] ?? "#888"} />))}
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
              <div className="card p-5 lg:col-span-3">
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">Evolución financiera 2026</h3>
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
        </div>
      )}

      {/* ════════ TAB: COSTOS ════════ */}
      {activeTab === "costos" && (
        <div className="space-y-6">
          {/* Distribución por tipo */}
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">Distribución por tipo de costo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                { tipo: "FIJO" as const, desc: "No cambia con la producción: arrendamiento, administración", color: "#378ADD" },
                { tipo: "VARIABLE" as const, desc: "Cambia con la producción: insumos, jornales, transporte", color: "#639922" },
                { tipo: "INVERSION" as const, desc: "Activos a largo plazo: equipos, infraestructura", color: "#EF9F27" },
              ]).map(({ tipo, desc, color }) => {
                const monto = costosPorTipo[tipo];
                const pct = totalGastos > 0 ? (monto / totalGastos) * 100 : 0;
                return (
                  <div key={tipo} className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
                      <span className="text-[13px] font-semibold text-[var(--text-primary)]">{TIPO_GASTO_LABELS[tipo]}</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color }}>{formatCOP(monto)}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-1">{pct.toFixed(1)}% del total</div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-2">{desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Costos por lote */}
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">Costos por lote</h3>
            {costosPorLote.length === 0 ? (
              <p className="text-[12px] text-[var(--text-muted)]">Sin gastos registrados</p>
            ) : (
              <div className="space-y-3">
                {costosPorLote.map((l) => {
                  const pct = totalGastos > 0 ? (l.total / totalGastos) * 100 : 0;
                  return (
                    <div key={l.nombre}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="font-medium text-[var(--text-primary)]">{l.nombre}</span>
                        <span className="text-[var(--text-secondary)]">
                          {formatCOP(l.total)} {l.areaHa > 0 && `· ${formatCOP(l.total / l.areaHa)}/ha`} · {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-[var(--surface-page)] rounded-full overflow-hidden">
                        <div className="h-full bg-agro-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top 5 gastos mayores */}
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">Top 5 gastos mayores</h3>
            {top5Gastos.length === 0 ? (
              <p className="text-[12px] text-[var(--text-muted)]">Sin gastos registrados</p>
            ) : (
              <div className="space-y-3">
                {top5Gastos.map((g, i) => (
                  <div key={g.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-[11px] font-bold text-red-600">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{g.concepto}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {CATEGORIA_LABELS[g.categoria]} · {formatDate(g.fecha, true)}
                      </div>
                    </div>
                    <div className="text-[13px] font-semibold text-red-600 whitespace-nowrap">{formatCOP(g.monto)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════ TAB: PRESUPUESTO ════════ */}
      {activeTab === "presupuesto" && (
        <div className="space-y-6">
          {/* Formulario presupuesto */}
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
              Presupuesto anual {new Date().getFullYear()} por categoría
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(CATEGORIA_LABELS).map(([cat, label]) => {
                const existing = presupuestos.find((p) => p.categoria === cat);
                return (
                  <div key={cat}>
                    <label className="text-[11px] text-[var(--text-secondary)] mb-1 block">{label}</label>
                    <input
                      type="number"
                      className="w-full h-9 px-3 text-[13px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white"
                      placeholder={existing ? formatCOPFull(existing.montoPlaneado) : "0"}
                      value={presupuestoForm[cat] ?? (existing?.montoPlaneado?.toString() || "")}
                      onChange={(e) => setPresupuestoForm((prev) => ({ ...prev, [cat]: e.target.value }))}
                      min="0"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handlePresupuestoSave} loading={presupuestoLoading}>
                <PiggyBank size={14} />
                Guardar presupuesto
              </Button>
            </div>
          </div>

          {/* Tabla comparativa presupuesto vs real */}
          {presupuestoVsReal.length > 0 && (
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">Presupuesto vs Ejecución real</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-[var(--border-subtle)]">
                      <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] uppercase">Categoría</th>
                      <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] uppercase">Presupuesto</th>
                      <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] uppercase">Ejecutado</th>
                      <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] uppercase">Variación</th>
                      <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] uppercase">% Ejecución</th>
                      <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presupuestoVsReal.map((row) => {
                      const estado = row.porcentaje > 100 ? "🔴" : row.porcentaje >= 80 ? "🟡" : "🟢";
                      return (
                        <tr key={row.categoria} className="border-b border-[var(--border-subtle)]">
                          <td className="px-3 py-2.5 text-[12px] font-medium text-[var(--text-primary)]">{CATEGORIA_LABELS[row.categoria as CategoriaGasto]}</td>
                          <td className="px-3 py-2.5 text-[12px] text-[var(--text-secondary)]">{formatCOP(row.planeado)}</td>
                          <td className="px-3 py-2.5 text-[12px] text-[var(--text-secondary)]">{formatCOP(row.real)}</td>
                          <td className={`px-3 py-2.5 text-[12px] font-medium ${row.variacion > 0 ? "text-red-600" : "text-agro-600"}`}>
                            {row.variacion > 0 ? "+" : ""}{formatCOP(row.variacion)}
                          </td>
                          <td className="px-3 py-2.5 text-[12px] text-[var(--text-secondary)]">{row.porcentaje.toFixed(0)}%</td>
                          <td className="px-3 py-2.5 text-[14px]">{estado}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gráfica barras agrupadas */}
          {presupuestoVsReal.length > 0 && (
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">Presupuestado vs Ejecutado</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={presupuestoVsReal.map((r) => ({
                  categoria: (CATEGORIA_LABELS[r.categoria as CategoriaGasto] ?? r.categoria).substring(0, 10),
                  Presupuestado: r.planeado,
                  Ejecutado: r.real,
                }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE8" vertical={false} />
                  <XAxis dataKey="categoria" tick={{ fontSize: 10, fill: "#8FA080" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8FA080" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCOP(v)} />
                  <Tooltip formatter={(v: number) => formatCOPFull(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Presupuestado" fill="#97C459" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ejecutado" fill="#F09595" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {presupuestoVsReal.length === 0 && (
            <EmptyState
              title="Sin presupuesto definido"
              description="Define un presupuesto anual por categoría para ver la comparación con la ejecución real."
            />
          )}
        </div>
      )}

      {/* ════════ TAB: REGISTROS ════════ */}
      {activeTab === "registros" && (
        <div className="space-y-6">
          {/* ── Ingresos table ── */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Registro de ingresos</h3>
              <Button size="sm" className="self-start sm:self-auto" onClick={() => setShowIngresoModal(true)}>
                <Plus size={14} /> Registrar ingreso
              </Button>
            </div>
            {ingresos.length === 0 ? (
              <EmptyState title="Sin ingresos registrados" description="Registra tus primeras ventas del cultivo." action={<Button onClick={() => setShowIngresoModal(true)}>Registrar ingreso</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-[var(--border-subtle)]">
                      <th className="px-4 sm:px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Concepto</th>
                      <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Comprador</th>
                      <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Kg</th>
                      <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Fecha</th>
                      <th className="px-4 sm:px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Monto</th>
                      <th className="px-4 sm:px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingresos.map((i) => (
                      <tr key={i.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-page)] transition-colors">
                        <td className="px-4 sm:px-5 py-3">
                          <div className="text-[13px] font-medium text-[var(--text-primary)]">{i.concepto}</div>
                          {i.cultivo && <div className="text-[11px] text-[var(--text-muted)]">{i.cultivo.lote.nombre}</div>}
                        </td>
                        <td className="hidden sm:table-cell px-5 py-3 text-[12px] text-[var(--text-secondary)]">{i.comprador?.nombre ?? "—"}</td>
                        <td className="hidden sm:table-cell px-5 py-3 text-[12px] text-[var(--text-secondary)]">{i.cantidadKg != null ? `${i.cantidadKg} kg` : "—"}</td>
                        <td className="hidden sm:table-cell px-5 py-3 text-[12px] text-[var(--text-secondary)] whitespace-nowrap">{formatDate(i.fecha, true)}</td>
                        <td className="px-4 sm:px-5 py-3 text-[13px] font-semibold text-agro-600 whitespace-nowrap">{formatCOPFull(i.monto)}</td>
                        <td className="px-4 sm:px-5 py-3">
                          <button onClick={() => handleIngresoDelete(i.id)} className="p-1.5 hover:bg-red-50 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-red-500 transition-colors" aria-label="Eliminar ingreso"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Gastos table ── */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Registro de gastos</h3>
                <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="h-8 px-2 text-[12px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white">
                  <option value="">Todas</option>
                  {Object.entries(CATEGORIA_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                </select>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button size="sm" onClick={() => setShowJornalModal(true)}><Users size={14} /> Jornal</Button>
                <Button size="sm" onClick={() => { setEditingGasto(null); resetGastoForm(); setShowGastoModal(true); }}><Plus size={14} /> Nuevo gasto</Button>
              </div>
            </div>
            {filteredGastos.length === 0 ? (
              <EmptyState title="Sin gastos registrados" description="Registra tus primeros gastos del cultivo." action={<Button onClick={() => setShowGastoModal(true)}>Registrar gasto</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-[var(--border-subtle)]">
                      <th className="px-4 sm:px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Concepto</th>
                      <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Categoría</th>
                      <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Tipo</th>
                      <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Lote</th>
                      <th className="hidden sm:table-cell px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Fecha</th>
                      <th className="px-4 sm:px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Monto</th>
                      <th className="px-4 sm:px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGastos.map((g) => (
                      <tr key={g.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-page)] transition-colors">
                        <td className="px-4 sm:px-5 py-3">
                          <div className="text-[13px] font-medium text-[var(--text-primary)]">{g.concepto}</div>
                          {g.proveedor && <div className="text-[11px] text-[var(--text-muted)]">{g.proveedor}</div>}
                          {g.subcategoria && <div className="text-[10px] text-[var(--text-muted)]">{g.subcategoria}</div>}
                        </td>
                        <td className="hidden sm:table-cell px-5 py-3">
                          <span className="badge text-[10px]" style={{ background: `${CATEGORIA_COLORS[g.categoria]}22`, color: CATEGORIA_COLORS[g.categoria] }}>{CATEGORIA_LABELS[g.categoria]}</span>
                        </td>
                        <td className="hidden sm:table-cell px-5 py-3 text-[11px] text-[var(--text-secondary)]">{TIPO_GASTO_LABELS[g.tipoGasto]}</td>
                        <td className="hidden sm:table-cell px-5 py-3 text-[12px] text-[var(--text-secondary)]">{g.lote?.nombre || g.cultivo?.lote?.nombre || "—"}</td>
                        <td className="hidden sm:table-cell px-5 py-3 text-[12px] text-[var(--text-secondary)] whitespace-nowrap">{formatDate(g.fecha, true)}</td>
                        <td className="px-4 sm:px-5 py-3 text-[13px] font-semibold text-red-600 whitespace-nowrap">{formatCOPFull(g.monto)}</td>
                        <td className="px-4 sm:px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingGasto(g); setGastoForm({ concepto: g.concepto, categoria: g.categoria, monto: g.monto.toString(), fecha: new Date(g.fecha).toISOString().split("T")[0], proveedor: g.proveedor ?? "", notas: g.notas ?? "", cultivoId: g.cultivoId ?? "", loteId: g.loteId ?? "", subcategoria: g.subcategoria ?? "", tipoGasto: g.tipoGasto, cantidad: g.cantidad?.toString() ?? "", unidad: g.unidad ?? "", precioUnitario: g.precioUnitario?.toString() ?? "" }); setShowGastoModal(true); }} className="p-1.5 hover:bg-[var(--surface-page)] rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-agro-600 transition-colors" aria-label="Editar gasto"><Pencil size={14} /></button>
                            <button onClick={() => handleGastoDelete(g.id)} className="p-1.5 hover:bg-red-50 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-red-500 transition-colors" aria-label="Eliminar gasto"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Ingreso Modal ── */}
      <Modal isOpen={showIngresoModal} onClose={() => setShowIngresoModal(false)} title="Registrar ingreso">
        <form onSubmit={handleIngresoSubmit} className="space-y-4">
          <Input label="Concepto" value={ingresoForm.concepto} onChange={(e) => { setIngresoForm({ ...ingresoForm, concepto: e.target.value }); if (ingresoErrors.concepto) setIngresoErrors((prev) => ({ ...prev, concepto: undefined! })); }} placeholder="Ej: Venta aguacate Hass" error={ingresoErrors.concepto} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto total (COP)" type="number" value={ingresoForm.monto} onChange={(e) => { setIngresoForm({ ...ingresoForm, monto: e.target.value }); if (ingresoErrors.monto) setIngresoErrors((prev) => ({ ...prev, monto: undefined! })); }} placeholder="0" min="1" error={ingresoErrors.monto} />
            <Input label="Cantidad (kg)" type="number" value={ingresoForm.cantidadKg} onChange={(e) => { setIngresoForm({ ...ingresoForm, cantidadKg: e.target.value }); }} placeholder="Opcional" min="0" />
          </div>
          {precioKgCalc && (
            <p className="text-[12px] text-agro-600 bg-agro-50 px-3 py-2 rounded-[var(--radius-md)]">
              Precio calculado: <strong>{formatCOP(Number(precioKgCalc))}/kg</strong>
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Fecha" type="date" value={ingresoForm.fecha} max={today} onChange={(e) => setIngresoForm({ ...ingresoForm, fecha: e.target.value })} error={ingresoErrors.fecha} />
            <Select label="Cultivo asociado" value={ingresoForm.cultivoId} onChange={(e) => setIngresoForm({ ...ingresoForm, cultivoId: e.target.value })} options={cultivos.map((c) => ({ value: c.id, label: `${c.lote.nombre} · ${c.variedad}` }))} placeholder="Sin asociar" />
          </div>
          {compradores.length > 0 && (
            <Select label="Comprador" value={ingresoForm.compradorId} onChange={(e) => setIngresoForm({ ...ingresoForm, compradorId: e.target.value })} options={compradores.map((c) => ({ value: c.id, label: c.nombre }))} placeholder="Sin comprador" />
          )}
          <Textarea label="Notas (opcional)" value={ingresoForm.notas} onChange={(e) => setIngresoForm({ ...ingresoForm, notas: e.target.value })} placeholder="Detalles adicionales..." rows={2} />
          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowIngresoModal(false)}>Cancelar</Button>
            <Button type="submit" loading={ingresoLoading}>Guardar ingreso</Button>
          </div>
        </form>
      </Modal>

      {/* ── Gasto Modal (mejorado) ── */}
      <Modal isOpen={showGastoModal} onClose={() => { setShowGastoModal(false); setEditingGasto(null); }} title={editingGasto ? "Editar gasto" : "Registrar gasto"} size="md">
        <form onSubmit={handleGastoSubmit} className="space-y-4">
          <Input label="Concepto del gasto" value={gastoForm.concepto} onChange={(e) => { setGastoForm({ ...gastoForm, concepto: e.target.value }); if (gastoErrors.concepto) setGastoErrors((prev) => ({ ...prev, concepto: undefined! })); }} placeholder="Ej: Plántulas Hass certificadas" error={gastoErrors.concepto} />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoría" value={gastoForm.categoria} onChange={(e) => { setGastoForm({ ...gastoForm, categoria: e.target.value as CategoriaGasto }); }} options={Object.entries(CATEGORIA_LABELS).map(([v, l]) => ({ value: v, label: l }))} error={gastoErrors.categoria} />
            <Select label="Tipo de gasto" value={gastoForm.tipoGasto} onChange={(e) => setGastoForm({ ...gastoForm, tipoGasto: e.target.value as TipoGasto })} options={Object.entries(TIPO_GASTO_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          </div>

          <Input label="Subcategoría (opcional)" value={gastoForm.subcategoria} onChange={(e) => setGastoForm({ ...gastoForm, subcategoria: e.target.value })} placeholder="Ej: Fungicida, Jornal poda" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Lote (opcional)" value={gastoForm.loteId} onChange={(e) => setGastoForm({ ...gastoForm, loteId: e.target.value, cultivoId: "" })} options={lotes.map((l) => ({ value: l.id, label: `${l.nombre} (${l.areaHa} ha)` }))} placeholder="Sin asignar" />
            <Select label="Cultivo (opcional)" value={gastoForm.cultivoId} onChange={(e) => setGastoForm({ ...gastoForm, cultivoId: e.target.value })} options={cultivosFiltrados.map((c) => ({ value: c.id, label: `${c.lote.nombre} · ${c.variedad}` }))} placeholder="Sin asociar" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Cantidad" type="number" value={gastoForm.cantidad} onChange={(e) => setGastoForm({ ...gastoForm, cantidad: e.target.value })} placeholder="Ej: 10" min="0" />
            <Input label="Unidad" value={gastoForm.unidad} onChange={(e) => setGastoForm({ ...gastoForm, unidad: e.target.value })} placeholder="kg, litros, jornales" />
            <Input label="Precio unitario" type="number" value={gastoForm.precioUnitario} onChange={(e) => setGastoForm({ ...gastoForm, precioUnitario: e.target.value })} placeholder="$/unidad" min="0" />
          </div>

          {montoCalc && (
            <p className="text-[12px] text-agro-600 bg-agro-50 px-3 py-2 rounded-[var(--radius-md)]">
              Monto calculado: <strong>{formatCOPFull(Number(montoCalc))}</strong> ({gastoForm.cantidad} × {formatCOP(Number(gastoForm.precioUnitario))})
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto total (COP)" type="number" value={montoCalc || gastoForm.monto} onChange={(e) => { setGastoForm({ ...gastoForm, monto: e.target.value }); if (gastoErrors.monto) setGastoErrors((prev) => ({ ...prev, monto: undefined! })); }} placeholder="0" min="0" error={gastoErrors.monto} disabled={!!montoCalc} />
            <Input label="Fecha" type="date" value={gastoForm.fecha} max={today} onChange={(e) => setGastoForm({ ...gastoForm, fecha: e.target.value })} error={gastoErrors.fecha} />
          </div>

          <Input label="Proveedor (opcional)" value={gastoForm.proveedor} onChange={(e) => setGastoForm({ ...gastoForm, proveedor: e.target.value })} placeholder="Nombre del proveedor" />

          <Textarea label="Notas (opcional)" value={gastoForm.notas} onChange={(e) => setGastoForm({ ...gastoForm, notas: e.target.value })} placeholder="Detalles adicionales..." rows={2} />

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={() => { setShowGastoModal(false); setEditingGasto(null); }}>Cancelar</Button>
            <Button type="submit" loading={gastoLoading}>Guardar gasto</Button>
          </div>
        </form>
      </Modal>

      {/* ── Jornal Modal ── */}
      <Modal isOpen={showJornalModal} onClose={() => setShowJornalModal(false)} title="Registrar jornal" size="md">
        <RegistroJornalForm
          onSuccess={async () => {
            setShowJornalModal(false);
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
