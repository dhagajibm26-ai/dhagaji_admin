"use client";
import { useState } from "react";
import { FileText, BarChart3, Printer, MessageCircle } from "lucide-react";
import type { ReportData, ReportColumn } from "@/types/reports";

interface ExportButtonsProps {
  data: ReportData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellValue(value: string | number | null, col: ReportColumn): string {
  if (value === null || value === undefined) return "";
  if (col.type === "currency" && typeof value === "number") {
    return `Rs.${value.toFixed(2)}`;
  }
  if (col.type === "percent" && typeof value === "number") {
    return `${value.toFixed(1)}%`;
  }
  return String(value);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

async function exportToPDF(data: ReportData) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("DHAGAJI CREATION", W / 2, 14, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(data.title, W / 2, 21, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Period: ${data.dateRange.from} to ${data.dateRange.to}`, W / 2, 27, { align: "center" });
  doc.text(`Generated: ${data.generatedAt}`, W / 2, 32, { align: "center" });

  // Body rows
  const head = [data.columns.map((c) => c.label)];
  const body = data.rows.map((row) =>
    data.columns.map((col) => cellValue(row[col.key] ?? null, col))
  );

  // Summary row
  if (data.summary && Object.keys(data.summary).length > 0) {
    const summaryRow = data.columns.map((col, i) =>
      i === 0
        ? "TOTAL"
        : col.isSummable && data.summary![col.key] !== undefined
          ? cellValue(data.summary![col.key] as number, col)
          : ""
    );
    body.push(summaryRow);
  }

  autoTable(doc, {
    head,
    body,
    startY: 36,
    theme: "striped",
    headStyles:  { fillColor: [211, 47, 47], fontSize: 8, fontStyle: "bold" },
    bodyStyles:  { fontSize: 7 },
    footStyles:  { fillColor: [26,  26,  26], textColor: 255, fontStyle: "bold" },
    didDrawPage: (hookData) => {
      doc.setFontSize(7);
      doc.text(
        `Page ${hookData.pageNumber}`,
        W - 10,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" }
      );
    },
  });

  doc.save(`${data.title}.pdf`);
}

// ─── Excel ────────────────────────────────────────────────────────────────────

async function exportToExcel(data: ReportData) {
  const XLSX = await import("xlsx");

  const headerRows = [
    ["DHAGAJI CREATION"],
    [data.title],
    [`Period: ${data.dateRange.from} to ${data.dateRange.to}`],
    [`Generated: ${data.generatedAt}`],
    [],
    data.columns.map((c) => c.label),
  ];

  const dataRows = data.rows.map((row) =>
    data.columns.map((col) => row[col.key] ?? "")
  );

  const summaryRow =
    data.summary && Object.keys(data.summary).length > 0
      ? data.columns.map((col, i) =>
          i === 0
            ? "TOTAL"
            : col.isSummable && data.summary![col.key] !== undefined
              ? (data.summary![col.key] as number)
              : ""
        )
      : null;

  const allRows = summaryRow
    ? [...headerRows, ...dataRows, [], summaryRow]
    : [...headerRows, ...dataRows];

  const ws = XLSX.utils.aoa_to_sheet(allRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${data.title}.xlsx`);
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

function shareOnWhatsApp(data: ReportData) {
  const summaryLines = Object.entries(data.summary ?? {}).map(([key, val]) => {
    const col = data.columns.find((c) => c.key === key);
    const label = col?.label ?? key;
    const formatted =
      col?.type === "currency" && typeof val === "number"
        ? `Rs.${(val as number).toLocaleString("en-IN")}`
        : String(val);
    return `• ${label}: ${formatted}`;
  });

  const text = [
    `*DHAGAJI CREATION*`,
    `*${data.title}*`,
    `Period: ${data.dateRange.from} to ${data.dateRange.to}`,
    `Records: ${data.rows.length}`,
    summaryLines.length ? `\n*Summary*\n${summaryLines.join("\n")}` : "",
    `\nGenerated: ${data.generatedAt}`,
  ]
    .filter(Boolean)
    .join("\n");

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportButtons({ data }: ExportButtonsProps) {
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [xlsxLoading,  setXlsxLoading]  = useState(false);

  const handlePDF = async () => {
    setPdfLoading(true);
    try { await exportToPDF(data); }
    finally { setPdfLoading(false); }
  };

  const handleExcel = async () => {
    setXlsxLoading(true);
    try { await exportToExcel(data); }
    finally { setXlsxLoading(false); }
  };

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <ExportBtn
        onClick={handlePDF}
        disabled={pdfLoading}
        icon={<FileText size={13} />}
        label={pdfLoading ? "Exporting…" : "Export PDF"}
        className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white"
      />
      <ExportBtn
        onClick={handleExcel}
        disabled={xlsxLoading}
        icon={<BarChart3 size={13} />}
        label={xlsxLoading ? "Exporting…" : "Export Excel"}
        className="bg-green-600 hover:bg-green-700 text-white"
      />
      <ExportBtn
        onClick={() => window.print()}
        icon={<Printer size={13} />}
        label="Print"
        className="bg-gray-700 hover:bg-gray-800 text-white"
      />
      <ExportBtn
        onClick={() => shareOnWhatsApp(data)}
        icon={<MessageCircle size={13} />}
        label="WhatsApp"
        className="bg-[#25D366] hover:bg-[#1DA851] text-white"
      />
    </div>
  );
}

function ExportBtn({
  onClick,
  disabled,
  icon,
  label,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
