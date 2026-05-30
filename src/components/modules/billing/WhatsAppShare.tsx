"use client";

import { useCallback } from "react";
import type { IBill } from "@/types";

interface WhatsAppShareProps {
  bill: IBill;
}

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function buildWhatsAppText(bill: IBill): string {
  const itemLines = bill.items
    .map(
      (item) =>
        `• ${item.designName} × ${item.qty} = Rs.${(item.sellingPrice * item.qty).toFixed(0)}`
    )
    .join("\n");

  const lines: string[] = [
    "*DHAGAJI CREATION*",
    "_Handmade Bangles & Jewellery_",
    "",
    `Bill No: ${bill.billNumber}`,
    `Date: ${formatDate(bill.billDate)}`,
    `Customer: ${bill.customerName}`,
    ...(bill.customerPhone ? [`Phone: ${bill.customerPhone}`] : []),
    "",
    "ITEMS:",
    itemLines,
    "",
    `Subtotal: Rs.${bill.subtotal.toFixed(0)}`,
    ...(bill.discountTotal > 0 ? [`Discount: -Rs.${bill.discountTotal.toFixed(0)}`] : []),
    ...((bill.billDiscount ?? 0) > 0
      ? [`Bill Discount: -Rs.${(bill.billDiscount ?? 0).toFixed(0)}`]
      : []),
    ...(bill.gstEnabled && bill.taxAmount > 0
      ? [`GST (${bill.gstRate}%): Rs.${bill.taxAmount.toFixed(2)}`]
      : []),
    `*TOTAL: Rs.${bill.grandTotal.toFixed(2)}*`,
    "",
    `Payment: ${bill.paymentMethod}`,
    "",
    "Thank you for shopping! \uD83D\uDE4F",
  ];

  return lines.join("\n");
}

async function downloadPDF(bill: IBill) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });

  const W = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = 18;
  const lh = 6;

  const right = (text: string, yCur: number) =>
    doc.text(text, W - margin, yCur, { align: "right" });
  const left = (text: string, yCur: number) => doc.text(text, margin, yCur);
  const center = (text: string, yCur: number) =>
    doc.text(text, W / 2, yCur, { align: "center" });
  const line = (yCur: number) =>
    doc.line(margin, yCur, W - margin, yCur);

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  center("DHAGAJI CREATION", y);
  y += lh;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  center("Handmade Bangles & Jewellery", y);
  y += lh;
  line(y);
  y += lh;

  // Bill info
  doc.setFontSize(9);
  left(`Bill No: ${bill.billNumber}`, y);
  right(`Date: ${formatDate(bill.billDate)}`, y);
  y += lh - 1;
  left(`Customer: ${bill.customerName}`, y);
  if (bill.customerPhone) right(`Phone: ${bill.customerPhone}`, y);
  y += lh - 1;
  left(`Source: ${bill.salesSource}`, y);
  right(`Payment: ${bill.paymentMethod}`, y);
  y += lh;
  line(y);
  y += lh;

  // Items header
  doc.setFont("helvetica", "bold");
  left("Item", y);
  doc.text("Qty", W / 2 + 10, y, { align: "center" });
  doc.text("Rate", W - margin - 20, y, { align: "right" });
  right("Total", y);
  y += 2;
  line(y);
  y += lh - 1;

  // Items
  doc.setFont("helvetica", "normal");
  for (const item of bill.items) {
    left(item.designName.substring(0, 32), y);
    doc.text(String(item.qty), W / 2 + 10, y, { align: "center" });
    doc.text(`Rs.${item.sellingPrice}`, W - margin - 20, y, { align: "right" });
    right(`Rs.${(item.sellingPrice * item.qty).toFixed(0)}`, y);
    y += lh - 1;
  }

  y += 2;
  line(y);
  y += lh;

  // Totals
  doc.setFontSize(9);
  const totalsX = W / 2;
  const addRow = (label: string, value: string) => {
    doc.text(label, totalsX, y, { align: "right" });
    right(value, y);
    y += lh - 1;
  };

  addRow("Subtotal:", `Rs.${bill.subtotal.toFixed(2)}`);
  if (bill.discountTotal > 0) addRow("Discount:", `-Rs.${bill.discountTotal.toFixed(2)}`);
  if ((bill.billDiscount ?? 0) > 0)
    addRow("Bill Discount:", `-Rs.${(bill.billDiscount ?? 0).toFixed(2)}`);
  if (bill.gstEnabled && bill.taxAmount > 0)
    addRow(`GST (${bill.gstRate}%):`, `Rs.${bill.taxAmount.toFixed(2)}`);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("GRAND TOTAL:", totalsX, y, { align: "right" });
  right(`Rs.${bill.grandTotal.toFixed(2)}`, y);
  y += lh * 2;

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  center("Thank you for shopping with Dhagaji Creation!", y);

  doc.save(`${bill.billNumber}.pdf`);
}

export function WhatsAppShare({ bill }: WhatsAppShareProps) {
  const handleWhatsApp = useCallback(() => {
    const text = buildWhatsAppText(bill);
    const raw = bill.customerPhone?.replace(/\D/g, "") ?? "";
    // Prepend 91 for 10-digit Indian numbers
    const phone = raw.length === 10 ? `91${raw}` : raw;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [bill]);

  const handleDownloadPDF = useCallback(() => {
    downloadPDF(bill).catch(() => {});
  }, [bill]);

  return (
    <div className="flex gap-2">
      <button
        onClick={handleWhatsApp}
        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] text-white py-2.5 px-4 text-sm font-medium active:bg-[#128C7E] transition-colors"
      >
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Share on WhatsApp
      </button>
      <button
        onClick={handleDownloadPDF}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 py-2.5 px-3 text-sm font-medium hover:border-gray-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        PDF
      </button>
    </div>
  );
}
