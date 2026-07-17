/**
 * pdf-export.ts
 * Utilidad para exportar el resumen financiero de la finca a PDF.
 * Usa jsPDF 4.x + jspdf-autotable 5.x.
 * Llamado desde componentes "use client" (FinanzasClient).
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CATEGORIA_LABELS } from "@/types";
import { formatCOPFull } from "@/lib/utils";
import type { CategoriaGasto } from "@prisma/client";

// ── Colores de marca AgroTech ─────────────────────────────────────────────────
const COLOR_PRIMARY: [number, number, number] = [99, 153, 34];   // agro-400 #639922
const COLOR_DARK: [number, number, number] = [59, 109, 17];      // agro-600 #3B6D11
const COLOR_LIGHT_BG: [number, number, number] = [234, 243, 222]; // agro-50  #EAF3DE
const COLOR_TEXT: [number, number, number] = [26, 43, 20];       // text-primary #1A2B14
const COLOR_MUTED: [number, number, number] = [143, 160, 128];   // text-muted #8FA080
const COLOR_WHITE: [number, number, number] = [255, 255, 255];
const COLOR_RED: [number, number, number] = [220, 38, 38];

// ── Tipos de entrada ──────────────────────────────────────────────────────────

export interface GastoPDF {
  concepto: string;
  categoria: CategoriaGasto;
  monto: number;
  fecha: Date | string;
}

export interface IngresoPDF {
  concepto: string;
  monto: number;
  fecha: Date | string;
}

export interface ExportFinanzasData {
  /** Nombre de la finca (ej: "Finca Álvarez Pacheco") */
  nombreFinca: string;
  /** Período del reporte (ej: "Enero – Diciembre 2024") */
  periodo: string;
  gastos: GastoPDF[];
  ingresos: IngresoPDF[];
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function drawLogoPlaceholder(doc: jsPDF, x: number, y: number, size: number): void {
  // Hoja estilizada como logo AgroTech
  doc.setFillColor(...COLOR_PRIMARY);
  doc.roundedRect(x, y, size, size, 3, 3, "F");

  // Hoja simplificada con líneas
  doc.setDrawColor(...COLOR_WHITE);
  doc.setLineWidth(0.8);
  // Tallo
  doc.line(x + size / 2, y + size * 0.75, x + size / 2, y + size * 0.9);
  // Hoja (óvalo usando ellipse)
  doc.setFillColor(...COLOR_LIGHT_BG);
  doc.ellipse(x + size / 2, y + size * 0.45, size * 0.28, size * 0.35, "F");
  // Nervadura central
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(x + size / 2, y + size * 0.15, x + size / 2, y + size * 0.75);
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Genera y descarga un PDF con el resumen financiero de la finca.
 *
 * @example
 * exportFinanciasPDF({
 *   nombreFinca: "Finca Álvarez Pacheco",
 *   periodo: "Enero – Diciembre 2024",
 *   gastos: [...],
 *   ingresos: [...],
 * });
 */
export function exportFinanciasPDF(data: ExportFinanzasData): void {
  const { nombreFinca, periodo, gastos, ingresos } = data;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const contentW = pageW - marginX * 2;
  let cursorY = 0;

  // ── HEADER ────────────────────────────────────────────────────────────────

  // Fondo verde del header
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 0, pageW, 40, "F");

  // Logo AgroTech
  drawLogoPlaceholder(doc, marginX, 8, 24);

  // Título de la app
  doc.setTextColor(...COLOR_WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AgroTech", marginX + 28, 17);

  // Subtítulo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Plataforma de Gestión Agrícola", marginX + 28, 23);

  // Nombre de la finca + período (alineado a la derecha)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(nombreFinca, pageW - marginX, 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Período: ${periodo}`, pageW - marginX, 23, { align: "right" });
  doc.text("Reporte Financiero", pageW - marginX, 29, { align: "right" });

  cursorY = 50;

  // ── RESUMEN FINANCIERO ────────────────────────────────────────────────────

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const totalIngresos = ingresos.reduce((s, i) => s + i.monto, 0);
  const saldo = totalIngresos - totalGastos;

  // Título sección
  doc.setTextColor(...COLOR_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumen Financiero", marginX, cursorY);

  // Línea separadora
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(marginX, cursorY + 2, pageW - marginX, cursorY + 2);
  cursorY += 8;

  // Tres KPIs lado a lado
  const kpiW = (contentW - 8) / 3;
  const kpiData = [
    { label: "Total Gastos", value: formatCOPFull(totalGastos), color: COLOR_RED, bg: [253, 242, 242] as [number, number, number] },
    { label: "Total Ingresos", value: formatCOPFull(totalIngresos), color: COLOR_DARK, bg: COLOR_LIGHT_BG },
    {
      label: "Saldo Neto",
      value: formatCOPFull(saldo),
      color: saldo >= 0 ? COLOR_DARK : COLOR_RED,
      bg: saldo >= 0 ? COLOR_LIGHT_BG : [253, 242, 242] as [number, number, number],
    },
  ];

  kpiData.forEach(({ label, value, color, bg }, i) => {
    const kx = marginX + i * (kpiW + 4);
    const ky = cursorY;

    doc.setFillColor(...bg);
    doc.roundedRect(kx, ky, kpiW, 18, 2, 2, "F");
    doc.setDrawColor(...COLOR_MUTED);
    doc.setLineWidth(0.2);
    doc.roundedRect(kx, ky, kpiW, 18, 2, 2, "S");

    doc.setTextColor(...COLOR_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(label.toUpperCase(), kx + kpiW / 2, ky + 6, { align: "center" });

    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(value, kx + kpiW / 2, ky + 14, { align: "center" });
  });

  cursorY += 26;

  // ── TABLA: GASTOS POR CATEGORÍA ───────────────────────────────────────────

  // Agrupar gastos por categoría
  const porCategoria: Record<string, number> = {};
  gastos.forEach((g) => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] ?? 0) + g.monto;
  });
  const categoriaRows = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => [
      CATEGORIA_LABELS[cat as CategoriaGasto] ?? cat,
      `${Math.round((total / totalGastos) * 100)}%`,
      formatCOPFull(total),
    ]);

  // Título sección
  doc.setTextColor(...COLOR_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Gastos por Categoría", marginX, cursorY);
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(marginX, cursorY + 2, pageW - marginX, cursorY + 2);
  cursorY += 6;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [["Categoría", "% del total", "Monto (COP)"]],
    body: categoriaRows,
    foot: [["TOTAL GASTOS", "100%", formatCOPFull(totalGastos)]],
    theme: "plain",
    headStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: COLOR_WHITE,
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLOR_TEXT,
      cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
    },
    alternateRowStyles: {
      fillColor: [248, 251, 244] as [number, number, number],
    },
    footStyles: {
      fillColor: COLOR_DARK,
      textColor: COLOR_WHITE,
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 45, halign: "right" },
    },
    tableLineColor: [220, 220, 220] as [number, number, number],
    tableLineWidth: 0.1,
    showFoot: "lastPage",
  });

  // Actualizar cursorY tras la tabla
  cursorY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 60;
  cursorY += 10;

  // ── TABLA: DETALLE DE INGRESOS ────────────────────────────────────────────

  if (ingresos.length > 0) {
    // Si queda poco espacio, nueva página
    if (cursorY > pageH - 80) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setTextColor(...COLOR_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Ingresos Registrados", marginX, cursorY);
    doc.setDrawColor(...COLOR_PRIMARY);
    doc.setLineWidth(0.5);
    doc.line(marginX, cursorY + 2, pageW - marginX, cursorY + 2);
    cursorY += 6;

    const ingresoRows = ingresos.map((i) => [
      i.concepto,
      formatDateShort(i.fecha),
      formatCOPFull(i.monto),
    ]);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [["Concepto", "Fecha", "Monto (COP)"]],
      body: ingresoRows,
      foot: [["TOTAL INGRESOS", "", formatCOPFull(totalIngresos)]],
      theme: "plain",
      headStyles: {
        fillColor: COLOR_DARK,
        textColor: COLOR_WHITE,
        fontSize: 9,
        fontStyle: "bold",
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLOR_TEXT,
        cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
      },
      alternateRowStyles: {
        fillColor: COLOR_LIGHT_BG,
      },
      footStyles: {
        fillColor: COLOR_PRIMARY,
        textColor: COLOR_WHITE,
        fontSize: 9,
        fontStyle: "bold",
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 35, halign: "center" },
        2: { cellWidth: 45, halign: "right" },
      },
      tableLineColor: [220, 220, 220] as [number, number, number],
      tableLineWidth: 0.1,
      showFoot: "lastPage",
    });

    cursorY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 60;
    cursorY += 10;
  }

  // ── NOTA DE SALDO ─────────────────────────────────────────────────────────

  if (cursorY > pageH - 40) {
    doc.addPage();
    cursorY = 20;
  }

  const saldoBg: [number, number, number] = saldo >= 0 ? COLOR_LIGHT_BG : [253, 242, 242];
  const saldoTextColor: [number, number, number] = saldo >= 0 ? COLOR_DARK : COLOR_RED;
  const saldoLabel = saldo >= 0 ? "Ganancia neta del período" : "Inversión neta del período";

  doc.setFillColor(...saldoBg);
  doc.roundedRect(marginX, cursorY, contentW, 14, 2, 2, "F");
  doc.setTextColor(...COLOR_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(saldoLabel, marginX + 6, cursorY + 5.5);
  doc.setTextColor(...saldoTextColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(formatCOPFull(Math.abs(saldo)), pageW - marginX, cursorY + 9, { align: "right" });

  // ── FOOTER ────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPages = (doc.internal as any).getNumberOfPages() as number;
  const fechaGeneracion = new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Línea footer
    doc.setDrawColor(...COLOR_MUTED);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12);

    // Texto izquierda
    doc.setTextColor(...COLOR_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Generado por AgroTech · ${fechaGeneracion}`, marginX, pageH - 7);

    // Número de página derecha
    doc.text(`Pág. ${p} / ${totalPages}`, pageW - marginX, pageH - 7, { align: "right" });
  }

  // ── DESCARGA ──────────────────────────────────────────────────────────────

  const safeName = nombreFinca.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const safePeriod = periodo.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`finanzas_${safeName}_${safePeriod}.pdf`);
}
