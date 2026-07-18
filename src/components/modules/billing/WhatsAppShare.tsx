"use client";

import { useCallback, useState } from "react";
import type { IBill } from "@/types";

interface WhatsAppShareProps {
  bill: IBill;
}

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export async function generateBillPDF(bill: IBill) {
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
  doc.roundedRect(marginX, y, contentW, 10, 2, 2, "F");

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE / BILL", pageW / 2, y + 6.5, { align: "center" });

  y += 15;

  // Info Grid (2-column card)
  const fieldsCount = 5 + (bill.customerPhone ? 1 : 0) + (bill.customerAddress ? 1 : 0);
  const infoRows = Math.ceil(fieldsCount / 2);
  const rowH = 10;
  const cardH = infoRows * rowH + 6;
  const col1X = marginX + 4;
  const col2X = pageW / 2 + 6;

  // Card background
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, y, contentW, cardH, 3, 3, "FD");

  const fields: [string, string][] = [
    ["Bill No", bill.billNumber],
    ["Date", formatDate(bill.billDate)],
    ["Customer", bill.customerName],
    ...(bill.customerPhone ? [["Phone", bill.customerPhone] as [string, string]] : []),
    ...(bill.customerAddress ? [["Address", bill.customerAddress] as [string, string]] : []),
    ["Source", bill.salesSource],
    ["Payment Mode", bill.paymentMethod],
  ];

  fields.forEach(([label, value], i) => {
    const cx = i % 2 === 0 ? col1X : col2X;
    const cy = y + 5 + Math.floor(i / 2) * rowH;
    doc.setTextColor(120, 130, 145);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), cx, cy);
    doc.setTextColor(20, 30, 48);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(value, cx, cy + 4.5);
  });

  y += cardH + 8;

  // Items Table
  const tableHead = [["Item Description", "Qty", "Rate", "Total"]];
  const tableBody = bill.items.map((item) => [
    item.designName + (item.hsnCodes && item.hsnCodes.length > 0 ? `\nHSN: ${item.hsnCodes.join(", ")}` : ""),
    String(item.qty),
    `Rs.${item.sellingPrice.toFixed(2)}`,
    `Rs.${(item.sellingPrice * item.qty).toFixed(2)}`,
  ]);

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
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
    columnStyles: {
      1: { halign: "center", cellWidth: 15 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 30 },
    },
    didDrawPage: (hookData) => {
      // Draw background template on subsequent pages
      if (hookData.pageNumber > 1) {
        doc.addImage(bgDataUrl, "JPEG", 0, 0, pageW, pageH);
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY: number = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Check if we need to add a new page if space is too tight
  if (finalY > contentBot - 45) {
    doc.addPage();
    doc.addImage(bgDataUrl, "JPEG", 0, 0, pageW, pageH);
    finalY = contentTop + 6;
  }

  // Totals Area
  y = finalY + 6;
  const totalsW = 75;
  const totalsX = pageW - marginX - totalsW;
  
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  
  const totalsRows = [
    ["Subtotal", `Rs.${bill.subtotal.toFixed(2)}`],
    ...(bill.discountTotal > 0 ? [["Item Discounts", `-Rs.${bill.discountTotal.toFixed(2)}`]] : []),
    ...((bill.billDiscount ?? 0) > 0 ? [["Bill Discount", `-Rs.${(bill.billDiscount ?? 0).toFixed(2)}`]] : []),
    ...(bill.gstEnabled && bill.taxAmount > 0 ? [[`GST (${bill.gstRate}%)`, `Rs.${bill.taxAmount.toFixed(2)}`]] : []),
    ["Grand Total", `Rs.${bill.grandTotal.toFixed(2)}`],
  ];

  const totalsH = totalsRows.length * 6 + 6;
  doc.roundedRect(totalsX, y, totalsW, totalsH, 2, 2, "FD");

  totalsRows.forEach(([lbl, val], idx) => {
    const isGrand = idx === totalsRows.length - 1;
    const rowY = y + 5 + idx * 6 + (isGrand ? 2 : 0);
    if (isGrand) {
      // Draw border separator above grand total with ample clearance
      doc.setDrawColor(200, 200, 200);
      doc.line(totalsX + 2, rowY - 4, totalsX + totalsW - 2, rowY - 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(211, 47, 47); // Red accent for grand total
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(80, 90, 105);
    }
    doc.text(lbl, totalsX + 4, rowY);
    doc.text(val, pageW - marginX - 4, rowY, { align: "right" });
  });

  y += totalsH + 6;

  // GSTIN & Legal disclaimer / thank you note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 145, 155);

  let disclaimerY = y;
  if (bill.gstEnabled && bill.gstNumber) {
    doc.text(`GSTIN: ${bill.gstNumber}`, marginX, disclaimerY);
    disclaimerY += 4;
  }
  doc.text("Thank you for shopping with Dhagaji Creation!", marginX, disclaimerY);

  return doc;
}

export function WhatsAppShare({ bill }: WhatsAppShareProps) {
  const [waLoading, setWaLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleWhatsApp = useCallback(async () => {
    setWaLoading(true);
    try {
      const doc = await generateBillPDF(bill);
      const fileName = `Bill-${bill.billNumber}.pdf`;
      const pdfBlob = doc.output("blob");

      // Download the PDF file first
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(blobUrl);

      // Redirect to WhatsApp Web (opening directly to contact phone if available, or send screen)
      const raw = bill.customerPhone?.replace(/\D/g, "") ?? "";
      const phone = raw.length === 10 ? `91${raw}` : raw;
      
      setTimeout(() => {
        const url = phone 
          ? `https://web.whatsapp.com/send?phone=${phone}` 
          : "https://web.whatsapp.com/send";
        window.open(url, "_blank", "noopener,noreferrer");
      }, 700);
    } catch (err) {
      console.error("WhatsApp share failed:", err);
    } finally {
      setWaLoading(false);
    }
  }, [bill]);

  const handleDownloadPDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      const doc = await generateBillPDF(bill);
      doc.save(`Bill-${bill.billNumber}.pdf`);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setPdfLoading(false);
    }
  }, [bill]);

  return (
    <div className="flex gap-2">
      <button
        onClick={handleWhatsApp}
        disabled={waLoading || pdfLoading}
        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] text-white py-2.5 px-4 text-sm font-medium active:bg-[#128C7E] transition-colors disabled:opacity-60"
      >
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        {waLoading ? "Sharing..." : "Share on WhatsApp"}
      </button>
      <button
        onClick={handleDownloadPDF}
        disabled={waLoading || pdfLoading}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 py-2.5 px-3 text-sm font-medium hover:border-gray-400 transition-colors disabled:opacity-60"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {pdfLoading ? "Preparing..." : "PDF"}
      </button>
    </div>
  );
}
