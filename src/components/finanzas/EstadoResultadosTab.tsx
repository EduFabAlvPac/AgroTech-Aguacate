"use client";

import { useEffect, useState, useCallback } from "react";
import { FileDown, TrendingUp, TrendingDown, Wallet, Users } from "lucide-react";
import { Button, Select, Input, Skeleton, EmptyState } from "@/components/ui";
import { formatCOP, formatCOPFull, formatDate } from "@/lib/utils";
import { exportPyGPDF } from "@/lib/pdf-export";
import toast from "react-hot-toast";
import type { Cultivo, Lote } from "@prisma/client";

interface PyGData {
  fincaNombre: string;
  periodo: { desde: string; hasta: string };
  cultivoFiltroId: string | null;
  ingresosOperativos: number;
  costosDirectos: number;
  costosIndirectos: number;
  utilidadBruta: number;
  utilidadNeta: number;
  margenBrutoPct: number;
  margenNetoPct: number;
  desgloseCostosDirectos: { categoria: string; label: string; monto: number }[];
  desgloseCostosIndirectos: { categoria: string; label: string; monto: number }[];
  porCultivo: {
    cultivoId: string;
    nombre: string;
    ingresos: number;
    costosDirectos: number;
    utilidadBruta: number;
    costosIndirectosProrrateados: number;
    utilidadNeta: number;
  }[];
  distribucionInversionistas: {
    inversionId: string;
    inversionistaNombre: string;
    cultivoId: string;
    cultivoNombre: string;
    montoAportado: number;
    porcentajeParticipacion: number;
    utilidadNetaCultivo: number;
    montoDistribuible: number;
  }[];
}

interface EstadoResultadosTabProps {
  cultivos: (Cultivo & { lote: Lote })[];
  nombreFinca?: string;
}

function primerDiaAnio() {
  return `${new Date().getFullYear()}-01-01`;
}
function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

export function EstadoResultadosTab({ cultivos, nombreFinca }: EstadoResultadosTabProps) {
  const [desde, setDesde] = useState(primerDiaAnio());
  const [hasta, setHasta] = useState(hoyISO());
  const [cultivoId, setCultivoId] = useState("");
  const [data, setData] = useState<PyGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const cultivoLabel = (c: Cultivo & { lote: Lote }) => `${c.especie} ${c.variedad} — ${c.lote.nombre}`;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ desde, hasta });
      if (cultivoId) params.set("cultivoId", cultivoId);
      const res = await fetch(`/api/finanzas/pyg?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar el estado de resultados");
      setData(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar el estado de resultados");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, cultivoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleExport = () => {
    if (!data) return;
    setExporting(true);
    try {
      const cultivoNombre = cultivoId ? cultivos.find((c) => c.id === cultivoId) : null;
      exportPyGPDF({
        fincaNombre: data.fincaNombre,
        periodo: `${formatDate(data.periodo.desde)} – ${formatDate(data.periodo.hasta)}`,
        cultivoNombre: cultivoNombre ? cultivoLabel(cultivoNombre) : null,
        ingresosOperativos: data.ingresosOperativos,
        costosDirectos: data.costosDirectos,
        costosIndirectos: data.costosIndirectos,
        utilidadBruta: data.utilidadBruta,
        utilidadNeta: data.utilidadNeta,
        margenBrutoPct: data.margenBrutoPct,
        margenNetoPct: data.margenNetoPct,
        desgloseCostosDirectos: data.desgloseCostosDirectos,
        desgloseCostosIndirectos: data.desgloseCostosIndirectos,
        porCultivo: data.porCultivo,
        distribucionInversionistas: data.distribucionInversionistas,
      });
      toast.success("Estado de resultados exportado");
    } catch {
      toast.error("Error al generar el PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filtros */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <Input label="Desde" type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
        <Input label="Hasta" type="date" value={hasta} min={desde} max={hoyISO()} onChange={(e) => setHasta(e.target.value)} />
        <div className="min-w-[220px]">
          <Select
            label="Cultivo"
            value={cultivoId}
            onChange={(e) => setCultivoId(e.target.value)}
            options={[{ value: "", label: "Toda la finca" }, ...cultivos.map((c) => ({ value: c.id, label: cultivoLabel(c) }))]}
          />
        </div>
        <Button variant="secondary" onClick={handleExport} loading={exporting} disabled={!data || loading} className="ml-auto">
          <FileDown size={14} /> Exportar PDF
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-[var(--radius-md)]" />)}
          </div>
          <Skeleton className="h-64 rounded-[var(--radius-md)]" />
        </div>
      ) : !data ? (
        <EmptyState icon={<Wallet size={28} />} title="No se pudo cargar el estado de resultados" />
      ) : (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Ingresos operativos", value: data.ingresosOperativos, color: "text-positive-600", bg: "bg-positive-50", icon: TrendingUp },
              { label: "Costos directos", value: data.costosDirectos, color: "text-negative-400", bg: "bg-negative-50", icon: TrendingDown },
              { label: "Utilidad bruta", value: data.utilidadBruta, color: data.utilidadBruta >= 0 ? "text-positive-600" : "text-negative-400", bg: data.utilidadBruta >= 0 ? "bg-positive-50" : "bg-negative-50", icon: Wallet, sub: `${data.margenBrutoPct.toFixed(1)}% margen` },
              { label: "Costos indirectos", value: data.costosIndirectos, color: "text-harvest-500", bg: "bg-harvest-50", icon: TrendingDown },
              { label: "Utilidad neta", value: data.utilidadNeta, color: data.utilidadNeta >= 0 ? "text-positive-600" : "text-negative-400", bg: data.utilidadNeta >= 0 ? "bg-positive-50" : "bg-negative-50", icon: Wallet, sub: `${data.margenNetoPct.toFixed(1)}% margen` },
            ].map(({ label, value, color, bg, icon: Icon, sub }) => (
              <div key={label} className={`card p-4 ${bg}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon size={13} className={color} />
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
                </div>
                <div className={`text-[16px] font-bold ${color}`}>{formatCOP(value)}</div>
                {sub && <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</div>}
              </div>
            ))}
          </div>

          {/* Estado de resultados formal */}
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">Estado de Resultados</h3>
            <div className="space-y-1 text-[13px] max-w-md">
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--text-secondary)]">Ingresos operativos</span>
                <span className="font-medium">{formatCOPFull(data.ingresosOperativos)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--text-secondary)]">(–) Costos directos</span>
                <span className="font-medium text-negative-400">({formatCOPFull(data.costosDirectos)})</span>
              </div>
              <div className="flex justify-between py-2 border-t border-[var(--border-subtle)] font-semibold">
                <span>= Utilidad bruta</span>
                <span className={data.utilidadBruta >= 0 ? "text-positive-600" : "text-negative-400"}>{formatCOPFull(data.utilidadBruta)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--text-secondary)]">(–) Costos indirectos</span>
                <span className="font-medium text-negative-400">({formatCOPFull(data.costosIndirectos)})</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-[var(--border-default)] font-bold text-[14px]">
                <span>= Utilidad neta</span>
                <span className={data.utilidadNeta >= 0 ? "text-positive-600" : "text-negative-400"}>{formatCOPFull(data.utilidadNeta)}</span>
              </div>
            </div>
          </div>

          {/* Desgloses */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">Costos directos por categoría</h3>
              {data.desgloseCostosDirectos.length === 0 ? (
                <p className="text-[12px] text-[var(--text-muted)]">Sin gastos asignados a un cultivo en el período.</p>
              ) : (
                <div className="space-y-2">
                  {data.desgloseCostosDirectos.map((d) => (
                    <div key={d.categoria} className="flex justify-between text-[12px]">
                      <span className="text-[var(--text-secondary)]">{d.label}</span>
                      <span className="font-medium">{formatCOP(d.monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card p-5">
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">Costos indirectos por categoría</h3>
              {data.desgloseCostosIndirectos.length === 0 ? (
                <p className="text-[12px] text-[var(--text-muted)]">Sin gastos de finca (sin cultivo asignado) en el período.</p>
              ) : (
                <div className="space-y-2">
                  {data.desgloseCostosIndirectos.map((d) => (
                    <div key={d.categoria} className="flex justify-between text-[12px]">
                      <span className="text-[var(--text-secondary)]">{d.label}</span>
                      <span className="font-medium">{formatCOP(d.monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Por cultivo */}
          {!cultivoId && data.porCultivo.length > 0 && (
            <div className="card p-5 overflow-x-auto">
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">Detalle por cultivo</h3>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    <th className="pb-2 font-medium">Cultivo</th>
                    <th className="pb-2 font-medium text-right">Ingresos</th>
                    <th className="pb-2 font-medium text-right">Costos directos</th>
                    <th className="pb-2 font-medium text-right">Utilidad bruta</th>
                    <th className="pb-2 font-medium text-right">Utilidad neta*</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porCultivo.map((c) => (
                    <tr key={c.cultivoId} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="py-2 text-[var(--text-primary)]">{c.nombre}</td>
                      <td className="py-2 text-right">{formatCOP(c.ingresos)}</td>
                      <td className="py-2 text-right text-negative-400">{formatCOP(c.costosDirectos)}</td>
                      <td className={`py-2 text-right font-medium ${c.utilidadBruta >= 0 ? "text-positive-600" : "text-negative-400"}`}>{formatCOP(c.utilidadBruta)}</td>
                      <td className={`py-2 text-right font-medium ${c.utilidadNeta >= 0 ? "text-positive-600" : "text-negative-400"}`}>{formatCOP(c.utilidadNeta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                * Costos indirectos prorrateados proporcionalmente a la participación de cada cultivo en los costos directos totales.
              </p>
            </div>
          )}

          {/* Inversionistas */}
          {data.distribucionInversionistas.length > 0 && (
            <div className="card p-5 overflow-x-auto">
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                <Users size={14} className="text-agro-500" /> Distribución de utilidad a inversionistas
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                Solo cultivos con inversión activa (InversionCultivo) — según % de participación de cada inversionista.
              </p>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    <th className="pb-2 font-medium">Inversionista</th>
                    <th className="pb-2 font-medium">Cultivo</th>
                    <th className="pb-2 font-medium text-right">% Participación</th>
                    <th className="pb-2 font-medium text-right">Utilidad neta cultivo</th>
                    <th className="pb-2 font-medium text-right">Monto distribuible</th>
                  </tr>
                </thead>
                <tbody>
                  {data.distribucionInversionistas.map((d) => (
                    <tr key={d.inversionId} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="py-2 text-[var(--text-primary)]">{d.inversionistaNombre}</td>
                      <td className="py-2 text-[var(--text-secondary)]">{d.cultivoNombre}</td>
                      <td className="py-2 text-right">{d.porcentajeParticipacion}%</td>
                      <td className={`py-2 text-right ${d.utilidadNetaCultivo >= 0 ? "text-positive-600" : "text-negative-400"}`}>{formatCOP(d.utilidadNetaCultivo)}</td>
                      <td className="py-2 text-right font-semibold text-positive-600">{formatCOP(d.montoDistribuible)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
