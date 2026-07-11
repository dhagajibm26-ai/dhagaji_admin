import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Bill } from "@/models/Bill";
import { RawMaterial } from "@/models/RawMaterial";
import { FinishedProduct } from "@/models/FinishedProduct";
import { WorkOrder } from "@/models/WorkOrder";
import { Worker } from "@/models/Worker";
import { Expense } from "@/models/Expense";
import { BanglesStock } from "@/models/BanglesStock";
import { ThreadsStock } from "@/models/ThreadsStock";
import type { IFinishedProductDocument } from "@/models/FinishedProduct";
import type { IWorkerDocument } from "@/models/Worker";
import type { ApiResponse } from "@/types";
import type {
  ReportType,
  ReportData,
  ReportRow,
  ReportSummary,
  ReportColumn,
} from "@/types/reports";
import { REPORT_LABELS } from "@/types/reports";
import type { Types } from "mongoose";

export const dynamic = "force-dynamic";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseDateRange(url: string): { from: Date; to: Date; fromStr: string; toStr: string } {
  const sp = new URL(url).searchParams;
  const fromStr = sp.get("from") ?? "";
  const toStr   = sp.get("to")   ?? "";

  const to   = toStr   ? new Date(toStr   + "T23:59:59.999Z") : new Date();
  const raw  = fromStr ? new Date(fromStr + "T00:00:00.000Z") : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    from:    raw,
    to,
    fromStr: fromStr || raw.toISOString().split("T")[0],
    toStr:   toStr   || to.toISOString().split("T")[0],
  };
}

function sumCols(columns: ReportColumn[], rows: ReportRow[]): ReportSummary {
  const summary: ReportSummary = {};
  for (const col of columns) {
    if (col.isSummable) {
      summary[col.key] = rows.reduce(
        (acc, row) => acc + (typeof row[col.key] === "number" ? (row[col.key] as number) : 0),
        0
      );
    }
  }
  return summary;
}

// ─── Report handlers ──────────────────────────────────────────────────────────

async function salesReport(from: Date, to: Date): Promise<Omit<ReportData, "generatedAt" | "dateRange">> {
  const bills = await Bill.find({ billDate: { $gte: from, $lte: to } }).sort({ billDate: -1 });

  const columns: ReportColumn[] = [
    { key: "billNumber",  label: "Bill #",      type: "text" },
    { key: "date",        label: "Date",         type: "date" },
    { key: "customer",    label: "Customer",     type: "text" },
    { key: "phone",       label: "Phone",        type: "text" },
    { key: "source",      label: "Source",       type: "badge" },
    { key: "items",       label: "Items",        type: "number" },
    { key: "subtotal",    label: "Subtotal",     type: "currency", isSummable: true },
    { key: "discount",    label: "Discount",     type: "currency", isSummable: true },
    { key: "tax",         label: "Tax",          type: "currency", isSummable: true },
    { key: "grandTotal",  label: "Grand Total",  type: "currency", isSummable: true },
    { key: "payment",     label: "Payment",      type: "badge" },
  ];

  const rows: ReportRow[] = bills.map((b) => {
    const j = b.toJSON() as {
      subtotal: number; discountTotal: number; taxAmount: number;
      grandTotal: number; billDate: Date; paymentMethod: string;
    };
    return {
      billNumber: b.billNumber,
      date:       new Date(b.billDate).toISOString().split("T")[0],
      customer:   b.customerName,
      phone:      b.customerPhone ?? "",
      source:     b.salesSource,
      items:      b.items.length,
      subtotal:   j.subtotal,
      discount:   j.discountTotal,
      tax:        j.taxAmount,
      grandTotal: j.grandTotal,
      payment:    b.paymentMethod,
    };
  });

  return { title: REPORT_LABELS.sales, columns, rows, summary: sumCols(columns, rows) };
}

// ─────────────────────────────────────────────────────────────────────────────

async function rawMaterialReport(): Promise<Omit<ReportData, "generatedAt" | "dateRange">> {
  const mats = await RawMaterial.find({ isDeleted: { $ne: true } }).sort({ itemName: 1 });

  const columns: ReportColumn[] = [
    { key: "name",      label: "Item Name",     type: "text" },
    { key: "category",  label: "Category",      type: "badge" },
    { key: "unit",      label: "Unit",          type: "text" },
    { key: "opening",   label: "Opening",       type: "number" },
    { key: "purchased", label: "Purchased",     type: "number" },
    { key: "used",      label: "Used",          type: "number" },
    { key: "closing",   label: "Closing",       type: "number" },
    { key: "rate",      label: "Rate",          type: "currency" },
    { key: "value",     label: "Total Value",   type: "currency", isSummable: true },
    { key: "threshold", label: "Min Stock",     type: "number" },
    { key: "status",    label: "Status",        type: "badge" },
  ];

  const rows: ReportRow[] = mats.map((m) => {
    const closing = m.openingStock + m.purchasedQty - m.usedQty;
    return {
      name:      m.itemName,
      category:  m.category,
      unit:      m.unit,
      opening:   m.openingStock,
      purchased: m.purchasedQty,
      used:      m.usedQty,
      closing,
      rate:      m.ratePerUnit,
      value:     closing * m.ratePerUnit,
      threshold: m.lowStockThreshold,
      status:    closing <= m.lowStockThreshold ? "Low Stock" : "OK",
    };
  });

  return { title: REPORT_LABELS["raw-material"], columns, rows, summary: sumCols(columns, rows) };
}

// ─────────────────────────────────────────────────────────────────────────────

async function finishedStockReport(): Promise<Omit<ReportData, "generatedAt" | "dateRange">> {
  const products = await FinishedProduct.find({}).sort({ designName: 1 });

  const columns: ReportColumn[] = [
    { key: "designName",   label: "Design",        type: "text" },
    { key: "code",         label: "Code",          type: "text" },
    { key: "size",         label: "Size",          type: "text" },
    { key: "barcode",      label: "Barcode",       type: "text" },
    { key: "makingCost",   label: "Making Cost",   type: "currency" },
    { key: "otherCost",    label: "Other Cost",    type: "currency" },
    { key: "totalCost",    label: "Total Cost",    type: "currency" },
    { key: "MRP",          label: "MRP",           type: "currency" },
    { key: "sellingPrice", label: "Selling Price", type: "currency" },
    { key: "readyStock",   label: "Ready Stock",   type: "number",  isSummable: true },
    { key: "totalSold",    label: "Total Sold",    type: "number",  isSummable: true },
    { key: "stockValue",   label: "Stock Value",   type: "currency", isSummable: true },
  ];

  const rows: ReportRow[] = products.map((p) => ({
    designName:   p.designName,
    code:         p.designCode,
    size:         p.size,
    barcode:      p.barcodeId,
    makingCost:   p.makingCostPerPc,
    otherCost:    p.otherCostPerPc,
    totalCost:    p.makingCostPerPc + p.otherCostPerPc,
    MRP:          p.MRP,
    sellingPrice: p.sellingPrice,
    readyStock:   p.readyStock,
    totalSold:    p.totalSold,
    stockValue:   p.readyStock * p.sellingPrice,
  }));

  return { title: REPORT_LABELS["finished-stock"], columns, rows, summary: sumCols(columns, rows) };
}

// ─────────────────────────────────────────────────────────────────────────────

async function workerPaymentReport(workerId?: string | null): Promise<Omit<ReportData, "generatedAt" | "dateRange">> {
  const query: any = {};
  let workerName = "";

  if (workerId && workerId !== "all") {
    query._id = workerId;
    const worker = await Worker.findById(workerId);
    if (worker) {
      workerName = worker.name;
    }
  }

  const workers = await Worker.find(query).sort({ name: 1 });

  const columns: ReportColumn[] = [
    { key: "name",        label: "Worker",       type: "text" },
    { key: "phone",       label: "Phone",        type: "text" },
    { key: "status",      label: "Status",       type: "badge" },
    { key: "totalEarned", label: "Total Earned", type: "currency", isSummable: true },
    { key: "totalPaid",   label: "Total Paid",   type: "currency", isSummable: true },
    { key: "balance",     label: "Balance",      type: "currency", isSummable: true },
  ];

  const rows: ReportRow[] = workers.map((w) => {
    const balance = w.totalEarned - w.totalPaid;
    return {
      name:        w.name,
      phone:       w.phone ?? "",
      status:      w.isActive ? "Active" : "Inactive",
      totalEarned: w.totalEarned,
      totalPaid:   w.totalPaid,
      balance,
    };
  });

  const title = workerName
    ? `${REPORT_LABELS["worker-payment"]} - ${workerName}`
    : REPORT_LABELS["worker-payment"];

  return { title, columns, rows, summary: sumCols(columns, rows) };
}

// ─────────────────────────────────────────────────────────────────────────────

async function workOrdersReport(from: Date, to: Date): Promise<Omit<ReportData, "generatedAt" | "dateRange">> {
  const orders = await WorkOrder.find({ date: { $gte: from, $lte: to } })
    .populate<{ workerId: Pick<IWorkerDocument, "name"> }>("workerId", "name")
    .sort({ date: -1 });

  const columns: ReportColumn[] = [
    { key: "date",          label: "Date",          type: "date" },
    { key: "worker",        label: "Worker",        type: "text" },
    { key: "workType",      label: "Work Type",     type: "text" },
    { key: "finished",      label: "Finished Pcs",  type: "number" },
    { key: "qualityOK",     label: "Quality OK",    type: "number" },
    { key: "rejected",      label: "Rejected",      type: "number" },
    { key: "ratePerPc",     label: "Rate/Pc",       type: "currency" },
    { key: "amountDue",     label: "Amount Due",    type: "currency", isSummable: true },
    { key: "amountPaid",    label: "Amount Paid",   type: "currency", isSummable: true },
    { key: "balance",       label: "Balance",       type: "currency", isSummable: true },
    { key: "paymentStatus", label: "Status",        type: "badge" },
  ];

  const rows: ReportRow[] = orders.map((o) => {
    const j = o.toJSON() as {
      amountDue: number; balance: number; paymentStatus: string; rejected: number;
    };
    const workerName =
      o.workerId && typeof o.workerId === "object"
        ? (o.workerId as Pick<IWorkerDocument, "name">).name
        : "Unknown";
    return {
      date:          new Date(o.date).toISOString().split("T")[0],
      worker:        workerName,
      workType:      o.workType,
      finished:      o.finishedPieces,
      qualityOK:     o.qualityOK,
      rejected:      j.rejected,
      ratePerPc:     o.perPieceRate,
      amountDue:     j.amountDue,
      amountPaid:    o.amountPaid,
      balance:       j.balance,
      paymentStatus: j.paymentStatus,
    };
  });

  return { title: REPORT_LABELS["work-orders"], columns, rows, summary: sumCols(columns, rows) };
}

// ─────────────────────────────────────────────────────────────────────────────

async function profitLossReport(from: Date, to: Date): Promise<Omit<ReportData, "generatedAt" | "dateRange">> {
  // Fetch bills + costs + expenses in parallel
  const [bills, expenses] = await Promise.all([
    Bill.find({ billDate: { $gte: from, $lte: to } }).sort({ billDate: 1 }),
    Expense.find({ date: { $gte: from, $lte: to } }).sort({ date: 1 }),
  ]);

  // Get all product costs for COGS calculation
  const productIds = [
    ...new Set(
      bills.flatMap((b) => b.items.map((i) => (i.finishedProductId as Types.ObjectId).toString()))
    ),
  ];
  const products = productIds.length
    ? await FinishedProduct.find({ _id: { $in: productIds } }).select("makingCostPerPc otherCostPerPc")
    : [];
  const costMap = new Map(
    products.map((p) => [p._id.toString(), (p as IFinishedProductDocument).makingCostPerPc + (p as IFinishedProductDocument).otherCostPerPc])
  );

  // Group by date
  const byDate = new Map<string, { revenue: number; cogs: number; expenses: number }>();

  for (const bill of bills) {
    const j = bill.toJSON() as { grandTotal: number };
    const dateKey = new Date(bill.billDate).toISOString().split("T")[0];
    if (!byDate.has(dateKey)) byDate.set(dateKey, { revenue: 0, cogs: 0, expenses: 0 });
    const day = byDate.get(dateKey)!;
    day.revenue += j.grandTotal;
    for (const item of bill.items) {
      const cost = costMap.get((item.finishedProductId as Types.ObjectId).toString()) ?? 0;
      day.cogs += cost * item.qty;
    }
  }

  for (const exp of expenses) {
    const dateKey = new Date(exp.date).toISOString().split("T")[0];
    if (!byDate.has(dateKey)) byDate.set(dateKey, { revenue: 0, cogs: 0, expenses: 0 });
    byDate.get(dateKey)!.expenses += exp.amount;
  }

  const columns: ReportColumn[] = [
    { key: "date",        label: "Date",           type: "date" },
    { key: "revenue",     label: "Revenue",        type: "currency", isSummable: true },
    { key: "cogs",        label: "Cost of Goods",  type: "currency", isSummable: true },
    { key: "grossProfit", label: "Gross Profit",   type: "currency", isSummable: true },
    { key: "expenses",    label: "Expenses",       type: "currency", isSummable: true },
    { key: "netProfit",   label: "Net Profit",     type: "currency", isSummable: true },
    { key: "margin",      label: "Margin %",       type: "percent" },
  ];

  const rows: ReportRow[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      const grossProfit = d.revenue - d.cogs;
      const netProfit   = grossProfit - d.expenses;
      const margin      = d.revenue > 0 ? (netProfit / d.revenue) * 100 : 0;
      return { date, revenue: d.revenue, cogs: d.cogs, grossProfit, expenses: d.expenses, netProfit, margin };
    });

  return { title: REPORT_LABELS["profit-loss"], columns, rows, summary: sumCols(columns, rows) };
}

// ─────────────────────────────────────────────────────────────────────────────

async function expensesReport(from: Date, to: Date): Promise<Omit<ReportData, "generatedAt" | "dateRange">> {
  const expenses = await Expense.find({ date: { $gte: from, $lte: to } }).sort({ date: -1 });

  const columns: ReportColumn[] = [
    { key: "date",        label: "Date",        type: "date" },
    { key: "category",    label: "Category",    type: "badge" },
    { key: "description", label: "Description", type: "text" },
    { key: "amount",      label: "Amount",      type: "currency", isSummable: true },
    { key: "paidBy",      label: "Paid By",     type: "text" },
  ];

  const rows: ReportRow[] = expenses.map((e) => ({
    date:        new Date(e.date).toISOString().split("T")[0],
    category:    e.category,
    description: e.description,
    amount:      e.amount,
    paidBy:      e.paidBy,
  }));

  return { title: REPORT_LABELS.expenses, columns, rows, summary: sumCols(columns, rows) };
}

// ─────────────────────────────────────────────────────────────────────────────

async function customersReport(from: Date, to: Date): Promise<Omit<ReportData, "generatedAt" | "dateRange">> {
  const bills = await Bill.find({ billDate: { $gte: from, $lte: to } }).sort({ billDate: -1 });

  // Group by customer
  const map = new Map<string, { name: string; phone: string; source: string; billCount: number; totalSpent: number; lastPurchase: string }>();
  for (const bill of bills) {
    const j = bill.toJSON() as { grandTotal: number };
    const key = `${bill.customerName}__${bill.customerPhone ?? ""}`;
    const dateStr = new Date(bill.billDate).toISOString().split("T")[0];
    if (!map.has(key)) {
      map.set(key, {
        name:         bill.customerName,
        phone:        bill.customerPhone ?? "",
        source:       bill.salesSource,
        billCount:    0,
        totalSpent:   0,
        lastPurchase: dateStr,
      });
    }
    const c = map.get(key)!;
    c.billCount++;
    c.totalSpent += j.grandTotal;
    if (dateStr > c.lastPurchase) {
      c.lastPurchase = dateStr;
      c.source = bill.salesSource;
    }
  }

  const columns: ReportColumn[] = [
    { key: "name",         label: "Customer",       type: "text" },
    { key: "phone",        label: "Phone",          type: "text" },
    { key: "source",       label: "Channel",        type: "badge" },
    { key: "billCount",    label: "Orders",         type: "number", isSummable: true },
    { key: "totalSpent",   label: "Total Spent",    type: "currency", isSummable: true },
    { key: "lastPurchase", label: "Last Purchase",  type: "date" },
  ];

  const rows: ReportRow[] = [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent);

  return { title: REPORT_LABELS.customers, columns, rows, summary: sumCols(columns, rows) };
}

// ─────────────────────────────────────────────────────────────────────────────

async function inventoryReport(): Promise<Omit<ReportData, "generatedAt" | "dateRange">> {
  const [rawMats, products] = await Promise.all([
    RawMaterial.find({ isDeleted: { $ne: true } }).sort({ itemName: 1 }),
    FinishedProduct.find({}).sort({ designName: 1 }),
  ]);

  const columns: ReportColumn[] = [
    { key: "type",      label: "Type",        type: "badge" },
    { key: "name",      label: "Item",        type: "text" },
    { key: "variant",   label: "Variant",     type: "text" },
    { key: "qty",       label: "Qty",         type: "number" },
    { key: "unit",      label: "Unit",        type: "text" },
    { key: "rate",      label: "Rate",        type: "currency" },
    { key: "value",     label: "Total Value", type: "currency", isSummable: true },
  ];

  const rawRows: ReportRow[] = rawMats.map((m) => {
    const closing = m.openingStock + m.purchasedQty - m.usedQty;
    return {
      type:    "Raw Material",
      name:    m.itemName,
      variant: m.category,
      qty:     closing,
      unit:    m.unit,
      rate:    m.ratePerUnit,
      value:   closing * m.ratePerUnit,
    };
  });

  const finishedRows: ReportRow[] = products.map((p) => ({
    type:    "Finished Stock",
    name:    p.designName,
    variant: `${p.designCode} / ${p.size}`,
    qty:     p.readyStock,
    unit:    "pcs",
    rate:    p.sellingPrice,
    value:   p.readyStock * p.sellingPrice,
  }));

  const rows = [...rawRows, ...finishedRows];
  return { title: REPORT_LABELS.inventory, columns, rows, summary: sumCols(columns, rows) };
}

// ─────────────────────────────────────────────────────────────────────────────

async function banglesStockReport(): Promise<Omit<ReportData, "generatedAt" | "dateRange">> {
  const PETA_MAP = { C1: 12, C2: 24, C4: 48, C6: 72 } as const;
  const docs = await BanglesStock.find({ isDeleted: { $ne: true } }).sort({ size: 1, cutType: 1 });

  const columns: ReportColumn[] = [
    { key: "size",                label: "Size",               type: "text" },
    { key: "cutType",             label: "Cut Type",           type: "text" },
    { key: "peta",                label: "Peta",               type: "number",   align: "center" },
    { key: "quantityAdd",         label: "Qty Added (sets)",   type: "number",   align: "right", isSummable: true },
    { key: "totalPieces",         label: "Total Pieces",       type: "number",   align: "right", isSummable: true },
    { key: "pricePerPiece",       label: "Price/Pc (₹)",       type: "currency", align: "right" },
    { key: "totalPurchaseAmount", label: "Total Purchase (₹)", type: "currency", align: "right", isSummable: true },
    { key: "netUsed",             label: "Net Used",           type: "number",   align: "right", isSummable: true },
    { key: "closingStock",        label: "Closing Pieces",     type: "number",   align: "right", isSummable: true },
    { key: "totalValue",          label: "Current Value (₹)",  type: "currency", align: "right", isSummable: true },
    { key: "status",              label: "Status",             type: "badge",    align: "center" },
  ];

  const rows: ReportRow[] = docs.map((b) => {
    const peta = PETA_MAP[b.cutType];
    const totalPieces = b.quantityAdd * peta;
    const closingStock = totalPieces - b.netUsed;
    return {
      size:                b.size,
      cutType:             b.cutType,
      peta,
      quantityAdd:         b.quantityAdd,
      totalPieces,
      pricePerPiece:       b.pricePerPiece,
      totalPurchaseAmount: b.totalPurchaseAmount ?? (totalPieces * b.pricePerPiece),
      netUsed:             b.netUsed,
      closingStock,
      totalValue:          closingStock * b.pricePerPiece,
      status:              b.status,
    };
  });

  return { title: REPORT_LABELS["bangles-stock"], columns, rows, summary: sumCols(columns, rows) };
}

// ─────────────────────────────────────────────────────────────────────────────

async function threadsStockReport(): Promise<Omit<ReportData, "generatedAt" | "dateRange">> {
  const docs = await ThreadsStock.find({ isDeleted: { $ne: true } }).sort({ threadCode: 1 });

  const columns: ReportColumn[] = [
    { key: "code",    label: "Thread Code",     type: "text" },
    { key: "colour",  label: "Thread Colour",   type: "text" },
    { key: "company", label: "Company",         type: "text" },
    { key: "opening", label: "Opening (g)",     type: "number",   align: "right" },
    { key: "added",   label: "Added (g)",       type: "number",   align: "right", isSummable: true },
    { key: "used",    label: "Used (g)",        type: "number",   align: "right", isSummable: true },
    { key: "closing", label: "Closing (g)",     type: "number",   align: "right", isSummable: true },
    { key: "rate",    label: "Rate/g (₹)",      type: "currency", align: "right" },
    { key: "value",   label: "Stock Value (₹)", type: "currency", align: "right", isSummable: true },
    { key: "status",  label: "Status",          type: "badge",    align: "center" },
  ];

  const rows: ReportRow[] = docs.map((t) => {
    const closing = t.openingStock + t.stockAdd - t.netUsed;
    return {
      code:    t.threadCode,
      colour:  t.threadColour,
      company: t.threadCompanyName,
      opening: t.openingStock,
      added:   t.stockAdd,
      used:    t.netUsed,
      closing,
      rate:    t.costPerUnit,
      value:   closing * t.costPerUnit,
      status:  closing <= 0 ? "Out of Stock" : "OK",
    };
  });

  return { title: REPORT_LABELS["threads-stock"], columns, rows, summary: sumCols(columns, rows) };
}

// ─── Route handler ────────────────────────────────────────────────────────────

const VALID_TYPES: ReportType[] = [
  "sales", "raw-material", "finished-stock", "worker-payment",
  "work-orders", "profit-loss", "expenses", "customers", "inventory",
  "bangles-stock", "threads-stock",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { type } = await params;
    if (!VALID_TYPES.includes(type as ReportType)) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Invalid report type" }, { status: 400 });
    }

    const reportType = type as ReportType;

    // Profit/Loss is owner-only
    if (reportType === "profit-loss" && session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { from, to, fromStr, toStr } = parseDateRange(request.url);
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("workerId");
    const generatedAt = new Date().toLocaleString("en-IN");
    const dateRange   = { from: fromStr, to: toStr };

    let partial: Omit<ReportData, "generatedAt" | "dateRange">;

    switch (reportType) {
      case "sales":           partial = await salesReport(from, to);           break;
      case "raw-material":    partial = await rawMaterialReport();              break;
      case "finished-stock":  partial = await finishedStockReport();            break;
      case "worker-payment":  partial = await workerPaymentReport(workerId);    break;
      case "work-orders":     partial = await workOrdersReport(from, to);      break;
      case "profit-loss":     partial = await profitLossReport(from, to);      break;
      case "expenses":        partial = await expensesReport(from, to);        break;
      case "customers":       partial = await customersReport(from, to);       break;
      case "inventory":       partial = await inventoryReport();               break;
      case "bangles-stock":   partial = await banglesStockReport();            break;
      case "threads-stock":   partial = await threadsStockReport();            break;
    }

    const data: ReportData = { ...partial, generatedAt, dateRange };
    return NextResponse.json<ApiResponse<ReportData>>({ success: true, data });
  } catch (err) {
    console.error("Reports API error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
