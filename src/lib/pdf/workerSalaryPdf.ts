import type { IWorker, IWorkOrder } from "@/types";

export async function generateWorkerSalaryPdf(worker: IWorker, orders: IWorkOrder[]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  // Load letterhead background template if available
  let bgDataUrl = "";
  try {
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
    const ctx = bgCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bgImg, 0, 0);
      bgDataUrl = bgCanvas.toDataURL("image/jpeg", 0.9);
    }
  } catch (e) {
    console.warn("Background image template could not be loaded, generating plain PDF.", e);
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();  // 210 mm
  const pageH = doc.internal.pageSize.getHeight(); // 297 mm

  if (bgDataUrl) {
    doc.addImage(bgDataUrl, "JPEG", 0, 0, pageW, pageH);
  }

  const contentTop = bgDataUrl ? 50 : 15;
  const marginX = 12;
  const contentW = pageW - marginX * 2;
  let y = contentTop;

  // ── Header Banner ──────────────────────────────────────────────────────────
  doc.setFillColor(30, 70, 32); // Dark Green matching brand theme
  doc.roundedRect(marginX, y, contentW, 16, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("WORKER SALARY & PAY STATEMENT", pageW / 2, y + 6.5, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(212, 175, 55); // Gold text accent
  doc.text(
    `Generated on: ${new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    pageW / 2,
    y + 11.5,
    { align: "center" }
  );

  y += 20;

  // ── Worker & Bank Details Box (2 Columns) ───────────────────────────────────
  const cardY = y;
  const cardH = 34;
  const col1X = marginX + 4;
  const col2X = pageW / 2 + 4;

  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, cardY, contentW, cardH, 2.5, 2.5, "FD");

  // Section Dividers / Header
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 70, 32);
  doc.text("WORKER DETAILS", col1X, cardY + 5.5);
  doc.text("BANK ACCOUNT DETAILS", col2X, cardY + 5.5);

  doc.setDrawColor(230, 235, 240);
  doc.line(col1X, cardY + 7, pageW / 2 - 4, cardY + 7);
  doc.line(col2X, cardY + 7, marginX + contentW - 4, cardY + 7);
  doc.line(pageW / 2, cardY + 2, pageW / 2, cardY + cardH - 2);

  // Worker Info Fields
  const workerInfo = [
    ["Worker Name:", worker.name || "N/A"],
    ["Worker ID:", worker._id || "N/A"],
    ["Mobile / Phone:", worker.mobile || worker.phone || "N/A"],
    ["Designation:", worker.designation || "Worker"],
  ];

  // Bank Info Fields
  const bankInfo = [
    ["Bank Name:", worker.bankDetails?.bankName || "N/A"],
    ["Account No:", worker.bankDetails?.accountNo || "N/A"],
    ["IFSC Code:", worker.bankDetails?.ifsc || "N/A"],
    ["Status:", worker.isActive ? "Active Worker" : "Inactive"],
  ];

  workerInfo.forEach(([label, val], idx) => {
    const fy = cardY + 11.5 + idx * 5.2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 110, 125);
    doc.text(label, col1X, fy);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(20, 30, 45);
    doc.text(val, col1X + 24, fy);
  });

  bankInfo.forEach(([label, val], idx) => {
    const fy = cardY + 11.5 + idx * 5.2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 110, 125);
    doc.text(label, col2X, fy);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(20, 30, 45);
    doc.text(val, col2X + 24, fy);
  });

  y += cardH + 6;

  // ── Work & Pay Table Header Title ──────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 40, 55);
  doc.text("WORK ORDER & PAYMENT HISTORY", marginX, y);
  y += 3;

  // Calculate totals from orders
  const closedOrders = orders.filter((o) => o.status !== "Open");
  const totalOKPcs = closedOrders.reduce((s, o) => s + (o.qualityOK || 0), 0);
  const totalRejPcs = closedOrders.reduce(
    (s, o) => s + Math.max(0, (o.finishedPieces || 0) - (o.qualityOK || 0)),
    0
  );
  const totalGrossEarned = closedOrders.reduce((s, o) => s + (o.amountDue || 0), 0);
  const totalRejCut = closedOrders.reduce((s, o) => s + (o.rejectionDeduction || 0), 0);
  const totalNetPayable = closedOrders.reduce((s, o) => s + (o.netAmountDue || 0), 0);
  const totalPaid = worker.totalPaid || 0;
  const currentBalance = worker.balance ?? 0;

  // ── AutoTable Data Preparation ──────────────────────────────────────────────
  const tableHead = [
    [
      "Date",
      "Work Type",
      "OK Pcs",
      "Rej Pcs",
      "Rate",
      "Gross Pay",
      "Rej Cut",
      "Net Payable",
      "Paid",
      "Balance",
      "Status",
    ],
  ];

  const tableBody = orders.map((o) => {
    const dateStr = o.date
      ? new Date(o.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
      : "—";
    const rejPcs = Math.max(0, (o.finishedPieces || 0) - (o.qualityOK || 0));
    const grossStr = o.amountDue ? `Rs.${o.amountDue.toLocaleString("en-IN")}` : "Rs.0";
    const rejCutStr = o.rejectionDeduction ? `-Rs.${o.rejectionDeduction.toLocaleString("en-IN")}` : "—";
    const netStr = o.netAmountDue ? `Rs.${o.netAmountDue.toLocaleString("en-IN")}` : "Rs.0";
    const paidStr = o.amountPaid ? `Rs.${o.amountPaid.toLocaleString("en-IN")}` : "Rs.0";
    const balStr = o.balance ? `Rs.${o.balance.toLocaleString("en-IN")}` : "Rs.0";

    return [
      dateStr,
      o.workType || "Standard",
      String(o.qualityOK || 0),
      String(rejPcs),
      `Rs.${o.perPieceRate || 0}`,
      grossStr,
      rejCutStr,
      netStr,
      paidStr,
      balStr,
      o.status === "Open" ? "Open" : o.paymentStatus || o.status,
    ];
  });

  // Add Summary Row
  if (orders.length > 0) {
    tableBody.push([
      "TOTAL",
      "—",
      String(totalOKPcs),
      String(totalRejPcs),
      "—",
      `Rs.${totalGrossEarned.toLocaleString("en-IN")}`,
      `-Rs.${totalRejCut.toLocaleString("en-IN")}`,
      `Rs.${totalNetPayable.toLocaleString("en-IN")}`,
      `Rs.${totalPaid.toLocaleString("en-IN")}`,
      `Rs.${currentBalance.toLocaleString("en-IN")}`,
      currentBalance > 0 ? "Pending" : "Clear",
    ]);
  }

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: y,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [30, 40, 50],
      valign: "middle",
    },
    headStyles: {
      fillColor: [211, 47, 47], // #D32F2F brand red header
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 16 },
      1: { halign: "left", cellWidth: 26 },
      2: { halign: "center", cellWidth: 13 },
      3: { halign: "center", cellWidth: 13 },
      4: { halign: "right", cellWidth: 13 },
      5: { halign: "right", cellWidth: 19 },
      6: { halign: "right", cellWidth: 18 },
      7: { halign: "right", cellWidth: 20 },
      8: { halign: "right", cellWidth: 18 },
      9: { halign: "right", cellWidth: 18 },
      10: { halign: "center", cellWidth: 12 },
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
    didParseCell: (data) => {
      // Style the summary/total row
      if (data.row.index === tableBody.length - 1 && orders.length > 0) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [238, 242, 246];
      }
    },
  });

  // ── Financial Summary Cards Footer ─────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 60;

  if (finalY < pageH - 45) {
    const summaryCardH = 22;
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(215, 220, 228);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, finalY, contentW, summaryCardH, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 70, 32);
    doc.text("SALARY FINANCIAL SUMMARY", marginX + 4, finalY + 5);

    const sumCols = [
      { label: "Gross Earnings", val: `Rs. ${totalGrossEarned.toLocaleString("en-IN")}`, color: [30, 40, 50] },
      { label: "Rejection Cut", val: `-Rs. ${totalRejCut.toLocaleString("en-IN")}`, color: [225, 29, 72] },
      { label: "Net Payable", val: `Rs. ${totalNetPayable.toLocaleString("en-IN")}`, color: [21, 128, 61] },
      { label: "Total Paid", val: `Rs. ${totalPaid.toLocaleString("en-IN")}`, color: [71, 85, 105] },
      { label: "Outstanding Balance", val: `Rs. ${currentBalance.toLocaleString("en-IN")}`, color: currentBalance > 0 ? [225, 29, 72] : [21, 128, 61] },
    ];

    const colW = contentW / sumCols.length;
    sumCols.forEach((col, idx) => {
      const cx = marginX + idx * colW + 3;
      const cy = finalY + 11;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(110, 120, 135);
      doc.text(col.label.toUpperCase(), cx, cy);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(col.color[0], col.color[1], col.color[2]);
      doc.text(col.val, cx, cy + 5);
    });
  }

  // Save the generated PDF
  const safeName = (worker.name || "Worker").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`Salary_Statement_${safeName}_${Date.now()}.pdf`);
}
