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

// ─── PDF Generation Helper ───────────────────────────────────────────────────

async function generateReportPDF(data: ReportData) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  // Load background template
  const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = "/work-order-bg.jpg";
  });
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = bgImg.naturalWidth;
  bgCanvas.height = bgImg.naturalHeight;
  bgCanvas.getContext("2d")!.drawImage(bgImg, 0, 0);
  const bgDataUrl = bgCanvas.toDataURL("image/jpeg", 0.9);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();  // 210 mm
  const pageH = doc.internal.pageSize.getHeight(); // 297 mm

  // Place template as background on page 1
  doc.addImage(bgDataUrl, "JPEG", 0, 0, pageW, pageH);

  const contentTop = 52;   // mm from top — below green header
  const contentBot = 275;  // mm from top — above green footer bar
  const marginX = 14;
  const contentW = pageW - marginX * 2;

  let y = contentTop + 4;

  // Title Box
  doc.setFillColor(30, 70, 32); // Dark green matching template
  doc.roundedRect(marginX, y, contentW, 18, 2, 2, "F");

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.text(data.title.toUpperCase(), pageW / 2, y + 5.5, { align: "center" });

  // Subtitle (Period and generated details)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(212, 175, 55); // Gold text
  doc.text(`Period: ${data.dateRange.from} to ${data.dateRange.to}`, pageW / 2, y + 10.5, { align: "center" });
  doc.setTextColor(220, 225, 230);
  doc.text(`Generated: ${data.generatedAt}`, pageW / 2, y + 14.5, { align: "center" });

  y += 24; // space below header card

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
    startY: y,
    margin: { left: marginX, right: marginX, top: contentTop + 4, bottom: pageH - contentBot + 4 },
    theme: "striped",
    headStyles: {
      fillColor: [30, 70, 32],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [247, 248, 250],
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    didDrawPage: (hookData) => {
      // Draw background template on subsequent pages
      if (hookData.pageNumber > 1) {
        doc.addImage(bgDataUrl, "JPEG", 0, 0, pageW, pageH);
      }
    },
  });

  return doc;
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportButtons({ data }: ExportButtonsProps) {
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [xlsxLoading,  setXlsxLoading]  = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [waLoading,    setWaLoading]    = useState(false);

  const handlePDF = async () => {
    setPdfLoading(true);
    try {
      const doc = await generateReportPDF(data);
      doc.save(`${data.title}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExcel = async () => {
    setXlsxLoading(true);
    try { await exportToExcel(data); }
    finally { setXlsxLoading(false); }
  };

  const handlePrint = async () => {
    setPrintLoading(true);
    try {
      const doc = await generateReportPDF(data);
      const pdfBlob = doc.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);

      // Create a hidden iframe to send print instruction directly to the browser
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.border = "none";
      iframe.src = blobUrl;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      };
    } catch (err) {
      console.error("Print failed:", err);
    } finally {
      setPrintLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    setWaLoading(true);
    try {
      const doc = await generateReportPDF(data);
      const fileName = `${data.title.replace(/\s+/g, "-")}.pdf`;
      const pdfBlob = doc.output("blob");

      // Download the PDF file first
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(blobUrl);

      // Redirect to WhatsApp Web after download triggers
      setTimeout(() => {
        window.open("https://web.whatsapp.com/send", "_blank");
      }, 700);
    } catch (err) {
      console.error("WhatsApp share failed:", err);
    } finally {
      setWaLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <ExportBtn
        onClick={handlePDF}
        disabled={pdfLoading || xlsxLoading || printLoading || waLoading}
        icon={<FileText size={13} />}
        label={pdfLoading ? "Exporting…" : "Export PDF"}
        className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white"
      />
      <ExportBtn
        onClick={handleExcel}
        disabled={pdfLoading || xlsxLoading || printLoading || waLoading}
        icon={<BarChart3 size={13} />}
        label={xlsxLoading ? "Exporting…" : "Export Excel"}
        className="bg-green-600 hover:bg-green-700 text-white"
      />
      <ExportBtn
        onClick={handlePrint}
        disabled={pdfLoading || xlsxLoading || printLoading || waLoading}
        icon={<Printer size={13} />}
        label={printLoading ? "Preparing…" : "Print"}
        className="bg-gray-700 hover:bg-gray-800 text-white"
      />
      <ExportBtn
        onClick={handleWhatsApp}
        disabled={pdfLoading || xlsxLoading || printLoading || waLoading}
        icon={<MessageCircle size={13} />}
        label={waLoading ? "Preparing…" : "WhatsApp"}
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
