"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui";
import { formatCOPFull } from "@/lib/utils";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReporteFinagroData } from "@/app/api/reportes/finagro/route";

const CATEGORIA_NOMBRES: Record<string, string> = {
  MAQUINARIA: "Maquinaria y equipos",
  AGUA_RIEGO: "Agua y riego",
  TRANSPORTE: "Transporte",
  CERTIFICACIONES: "Certificaciones",
  TIERRA: "Adecuación de tierra",
  HERRAMIENTAS: "Herramientas",
  ENERGIA: "Energía",
  OTROS: "Otros gastos",
};

export function ExportarFinagroButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reportes/finagro");
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Error al generar");
      }

      const { data } = await res.json() as { data: ReporteFinagroData };
      generatePDF(data);
      toast.success("Reporte FINAGRO generado");
    } catch (err: any) {
      toast.error(err.message || "Error al generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleExport}
        loading={loading}
        style={{ minHeight: 44 }}
      >
        <FileText size={14} />
        {loading ? "Generando..." : "Reporte FINAGRO"}
      </Button>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1A2B14] text-white text-[11px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        Genera formato Plan de Inversión compatible con Banco Agrario y FINAGRO
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A2B14]" />
      </div>
    </div>
  );
}

// ── PDF Generation ──────────────────────────────────────────────────────────────

function generatePDF(data: ReporteFinagroData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // ── Header ────────────────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PLAN DE INVERSIÓN — CULTIVO PERMANENTE", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Formato compatible FINAGRO / Banco Agrario de Colombia", pageWidth / 2, y, { align: "center" });
  y += 12;

  // ── 1. Datos del Predio ─────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("1. DATOS DEL PREDIO", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [99, 153, 34] },
    body: [
      ["Nombre de la Finca", data.predio.nombre],
      ["Municipio / Departamento", `${data.predio.municipio}, ${data.predio.departamento}`],
      ["Área total", `${data.predio.areaTotal ?? "—"} ha`],
      ["Cultivo", `${data.predio.cultivo} ${data.predio.variedad}`],
      ["Etapa actual", data.predio.etapa],
      ["Fecha de siembra", data.predio.fechaSiembra ?? "No registrada"],
      ["Total plantas", data.predio.cantidadPlantas.toString()],
      ["Altitud", data.predio.altitud ? `${data.predio.altitud} msnm` : "—"],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── 2. Costos Directos ──────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("2. COSTOS DIRECTOS", 14, y);
  y += 6;

  // Mano de obra
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`2.1 Mano de Obra — ${data.costosDirectos.manoObra.jornales} jornales`, 14, y);
  y += 2;

  if (data.costosDirectos.manoObra.detalle.length > 0) {
    autoTable(doc, {
      startY: y,
      theme: "striped",
      headStyles: { fillColor: [29, 158, 117] },
      head: [["Operario", "Actividad", "Fecha", "Valor COP"]],
      body: data.costosDirectos.manoObra.detalle.slice(0, 15).map((j) => [
        j.operario, j.actividad, j.fecha, formatCOPFull(j.valor),
      ]),
      foot: [["", "", "TOTAL MANO DE OBRA", formatCOPFull(data.costosDirectos.manoObra.total)]],
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${formatCOPFull(data.costosDirectos.manoObra.total)}`, 14, y + 4);
    y += 10;
  }

  // Insumos
  doc.setFont("helvetica", "bold");
  doc.text("2.2 Insumos y Agroquímicos", 14, y);
  y += 2;

  if (data.costosDirectos.insumos.detalle.length > 0) {
    autoTable(doc, {
      startY: y,
      theme: "striped",
      headStyles: { fillColor: [99, 153, 34] },
      head: [["Concepto", "Fecha", "Monto COP"]],
      body: data.costosDirectos.insumos.detalle.slice(0, 10).map((g) => [
        g.concepto, g.fecha, formatCOPFull(g.monto),
      ]),
      foot: [["", "TOTAL INSUMOS", formatCOPFull(data.costosDirectos.insumos.total)]],
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Check page overflow
  if (y > 240) { doc.addPage(); y = 20; }

  // ── 3. Costos Indirectos ────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("3. COSTOS INDIRECTOS", 14, y);
  y += 6;

  if (data.costosIndirectos.porCategoria.length > 0) {
    autoTable(doc, {
      startY: y,
      theme: "striped",
      headStyles: { fillColor: [186, 117, 23] },
      head: [["Categoría", "Total COP"]],
      body: data.costosIndirectos.porCategoria.map((c) => [
        CATEGORIA_NOMBRES[c.categoria] ?? c.categoria, formatCOPFull(c.total),
      ]),
      foot: [["TOTAL INDIRECTOS", formatCOPFull(data.costosIndirectos.total)]],
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (y > 240) { doc.addPage(); y = 20; }

  // ── 4. Resumen Financiero ───────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("4. RESUMEN FINANCIERO DEL PERÍODO", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [99, 153, 34] },
    body: [
      ["Costos Directos (mano obra + insumos + semillas)", formatCOPFull(data.resumen.totalCostosDirectos)],
      ["Costos Indirectos", formatCOPFull(data.resumen.totalCostosIndirectos)],
      ["COSTO TOTAL DEL PERÍODO", formatCOPFull(data.resumen.costoTotal)],
      ["Ingresos registrados", formatCOPFull(data.resumen.ingresosRegistrados)],
      ["SALDO NETO", formatCOPFull(data.resumen.saldoNeto)],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
    bodyStyles: { fontSize: 10 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (y > 240) { doc.addPage(); y = 20; }

  // ── 5. Proyección de Producción ─────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("5. PROYECCIÓN DE PRODUCCIÓN E INGRESOS", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [24, 95, 165] },
    body: [
      ["Producción estimada (plena producción)", `${data.proyeccion.produccionEstimadaKg.toLocaleString("es-CO")} kg/año`],
      ["Precio promedio por kg", formatCOPFull(data.proyeccion.precioPromedioKg)],
      ["Ingreso anual proyectado", formatCOPFull(data.proyeccion.ingresoProyectado)],
      ["Retorno sobre inversión (ROI)", `${data.proyeccion.roi.toFixed(1)}%`],
      ["Meses restantes para primera cosecha", `${data.proyeccion.cicloMesesRestantes} meses`],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // ── Footer ────────────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Generado por AgroTech — ${new Date().toLocaleDateString("es-CO")} | Período: ${data.periodo.desde} a ${data.periodo.hasta}`,
    pageWidth / 2, doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  // ── Download ──────────────────────────────────────────────────────────────────
  const filename = `Plan-Inversion-FINAGRO-${data.predio.nombre.replace(/\s+/g, "-")}-${data.periodo.desde}.pdf`;
  doc.save(filename);
}
