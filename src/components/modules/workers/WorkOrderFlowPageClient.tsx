"use client";

import { useMemo, useState } from "react";
import {
  HardHat,
  Undo2,
  Plus,
  CheckCircle2,
  Search,
  ClipboardList,
  Sparkles,
  GitBranch,
  ArrowRight,
  Printer,
  AlertTriangle,
  Filter,
  XCircle,
} from "lucide-react";
import { useWorkers } from "@/hooks/useWorkers";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { CreateWorkOrderForm } from "./CreateWorkOrderForm";
import { ReturnMaterialForm } from "./ReturnMaterialForm";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDateDMY } from "@/lib/utils";
import type { IWorkOrder, IWorker } from "@/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getWorkerName(order: IWorkOrder): string {
  if (typeof order.workerId === "object" && order.workerId && "name" in order.workerId) {
    return (order.workerId as unknown as { name?: string }).name ?? "Unknown";
  }
  return "Unknown";
}

function getTotalGivenPieces(order: IWorkOrder): number {
  return order.banglesGiven.reduce((sum, item) => sum + item.pieces, 0);
}

/** True when this half-work order is still in progress (return not yet allowed). */
function isHalfWorkInProgress(order: IWorkOrder): boolean {
  return order.assignmentType === "half" && order.allowReturn !== true && order.status === "Open";
}

interface ChainLinksInfo {
  legNumber: number;
  parentWorkerName?: string;
  childWorkerName?: string;
  isRoot: boolean;
  isEnd: boolean;
}

function getChainLinks(order: IWorkOrder, allOrders: IWorkOrder[]): ChainLinksInfo | null {
  if (order.assignmentType !== "half") return null;

  let legNumber = 1;
  let currentParentId = order.parentWorkOrderId;
  let parentWorkerName: string | undefined;

  while (currentParentId) {
    const parent = allOrders.find((o) => o._id === currentParentId);
    if (!parent) break;
    if (legNumber === 1) parentWorkerName = getWorkerName(parent);
    legNumber++;
    currentParentId = parent.parentWorkOrderId;
  }

  const child = allOrders.find((o) => o.parentWorkOrderId === order._id);
  const childWorkerName = child ? getWorkerName(child) : undefined;

  return {
    legNumber,
    parentWorkerName,
    childWorkerName,
    isRoot: !order.parentWorkOrderId,
    isEnd: !child,
  };
}

// ─── Entry-type filter values ─────────────────────────────────────────────────

type EntryTypeFilter =
  | "full"
  | "half"
  | "pending"
  | "inprogress"
  | "complete"
  | "rejected";

const ENTRY_TYPE_LABELS: Record<EntryTypeFilter, string> = {
  full: "Full Work",
  half: "Half Work",
  pending: "Pending",
  inprogress: "In Progress",
  complete: "Completed",
  rejected: "Rejected",
};

// ─── Sorting helper (chains grouped together, newest root first) ───────────────

function sortOrdersChained(orders: IWorkOrder[], allOrders: IWorkOrder[]): IWorkOrder[] {
  const processed = orders.map((order) => {
    let rootId = order._id;
    let legNumber = 1;
    let currentParentId = order.parentWorkOrderId;

    while (currentParentId) {
      const parent = allOrders.find((o) => o._id === currentParentId);
      if (!parent) break;
      rootId = parent._id;
      legNumber++;
      currentParentId = parent.parentWorkOrderId;
    }

    return { order, rootId, legNumber };
  });

  const groups = new Map<string, typeof processed>();
  for (const item of processed) {
    if (!groups.has(item.rootId)) groups.set(item.rootId, []);
    groups.get(item.rootId)!.push(item);
  }

  const getRootDate = (rootId: string) => {
    const rootItem = allOrders.find((x) => x._id === rootId);
    return rootItem ? new Date(rootItem.date).getTime() : 0;
  };

  const sortedRootIds = Array.from(groups.keys()).sort(
    (a, b) => getRootDate(b) - getRootDate(a)
  );

  const result: IWorkOrder[] = [];
  for (const rootId of sortedRootIds) {
    const groupItems = groups.get(rootId)!;
    groupItems.sort((a, b) => a.legNumber - b.legNumber);
    result.push(...groupItems.map((item) => item.order));
  }

  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkOrderFlowPageClient() {
  const [search, setSearch] = useState("");
  const [entryTypes, setEntryTypes] = useState<Set<EntryTypeFilter>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");
  const [printLoading, setPrintLoading] = useState(false);

  const [selectedWorker, setSelectedWorker] = useState<IWorker | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | undefined>();
  const [continueFromOrder, setContinueFromOrder] = useState<IWorkOrder | undefined>();

  const { data: workers = [], isLoading: workersLoading } = useWorkers();
  const { data: allOrders = [], isLoading: ordersLoading } = useWorkOrders();

  const activeWorkers = useMemo(() => workers.filter((w) => w.isActive), [workers]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const pendingOrders  = useMemo(() => allOrders.filter((o) => o.status === "Open"), [allOrders]);
  const completeOrders = useMemo(() => allOrders.filter((o) => o.status === "Returned" || o.status === "Completed"), [allOrders]);
  const rejectedOrders = useMemo(() => allOrders.filter((o) => o.status === "Rejected"), [allOrders]);

  // ── Filter pipeline ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...allOrders];

    // Entry-type multi-filter (OR across selected types)
    if (entryTypes.size > 0) {
      result = result.filter((o) => {
        return Array.from(entryTypes).some((type) => {
          switch (type) {
            case "full":       return o.assignmentType === "full";
            case "half":       return o.assignmentType === "half";
            case "pending":    return o.status === "Open" && !isHalfWorkInProgress(o);
            case "inprogress": return isHalfWorkInProgress(o);
            case "complete":   return o.status === "Returned" || o.status === "Completed";
            case "rejected":   return o.status === "Rejected";
            default:           return false;
          }
        });
      });
    }

    // Date from
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((o) => new Date(o.date) >= from);
    }

    // Date to
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.date) <= to);
    }

    // Worker filter
    if (workerFilter) {
      result = result.filter((o) => getWorkerName(o) === workerFilter);
    }

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) => {
        const wn = getWorkerName(o).toLowerCase();
        return wn.includes(q) || o.workType.toLowerCase().includes(q);
      });
    }

    return sortOrdersChained(result, allOrders);
  }, [allOrders, entryTypes, dateFrom, dateTo, workerFilter, search]);

  const hasActiveFilters = entryTypes.size > 0 || !!dateFrom || !!dateTo || !!workerFilter || !!search.trim();

  function toggleEntryType(type: EntryTypeFilter) {
    setEntryTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function clearFilters() {
    setEntryTypes(new Set());
    setDateFrom("");
    setDateTo("");
    setWorkerFilter("");
    setSearch("");
  }

  function openCreateFor(worker?: IWorker) {
    setSelectedWorker(worker ?? null);
    setContinueFromOrder(undefined);
    setOrderModalOpen(true);
  }

  function openContinueHalfWork(parentOrder: IWorkOrder) {
    setSelectedWorker(null);
    setContinueFromOrder(parentOrder);
    setOrderModalOpen(true);
  }

  function openReturn(orderId?: string) {
    setReturnOrderId(orderId);
    setReturnModalOpen(true);
  }

  async function handlePrint() {
    setPrintLoading(true);
    try {
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
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("WORK ORDER FLOW REPORT", pageW / 2, y + 6, { align: "center" });

      // Subtitle (Period and generated details)
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(212, 175, 55); // Gold text
      const periodFrom = dateFrom ? dateFrom : "All Time";
      const periodTo = dateTo ? dateTo : "All Time";
      doc.text(`Period: ${periodFrom} to ${periodTo}`, pageW / 2, y + 11, { align: "center" });
      doc.setTextColor(220, 225, 230);
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pageW / 2, y + 15, { align: "center" });

      y += 24; // space below header card

      // Columns (Actions field omitted)
      const head = [["#", "Date", "Worker", "Work Type", "Type", "Bangles", "Thread", "Status"]];
      
      const body = filtered.map((order, idx) => {
        const links = getChainLinks(order, allOrders);
        const isHalf = order.assignmentType === "half";
        const typeStr = links ? `Half (Leg ${links.legNumber})` : "Full";
        
        let statusStr = "Pending";
        if (order.status === "Rejected") {
          const totalRejected = Math.max(0, order.finishedPieces - order.qualityOK);
          const alreadyResolved = order.rejectedResolved ?? 0;
          const remainingRejected = totalRejected - alreadyResolved;
          statusStr = `Rejected (${remainingRejected} pcs left)`;
        } else if (order.status === "Open") {
          statusStr = isHalfWorkInProgress(order) ? "In Progress" : "Pending";
        } else {
          statusStr = order.status === "Completed" ? "Completed" : "Returned";
        }

        return [
          String(idx + 1),
          formatDateDMY(order.date),
          getWorkerName(order),
          order.workType,
          typeStr,
          String(getTotalGivenPieces(order)),
          `${order.threadsGiven}g`,
          statusStr
        ];
      });

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
          if (hookData.pageNumber > 1) {
            doc.addImage(bgDataUrl, "JPEG", 0, 0, pageW, pageH);
          }
        },
      });

      const pdfBlob = doc.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);

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
      console.error("PDF Print failed:", err);
    } finally {
      setPrintLoading(false);
    }
  }

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #workflow-print-area, #workflow-print-area * { visibility: visible !important; }
          #workflow-print-area { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
        {/* ── Header ── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between no-print">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Work Order Control Center</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Call worker, assign material, track live pending work and completed returns in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="md" onClick={() => openCreateFor()}>
              <Plus size={14} className="mr-1.5" />
              Add Work to Worker
            </Button>
            <Button size="md" variant="outline" onClick={() => openReturn()}>
              <Undo2 size={14} className="mr-1.5" />
              Return Entry
            </Button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 no-print">
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 min-h-28">
            <p className="text-xs text-slate-500 font-medium">Active Workers</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{activeWorkers.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 min-h-28">
            <p className="text-xs text-slate-500 font-medium">Return Pending</p>
            <p className="text-3xl font-black text-amber-600 mt-1">{pendingOrders.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 min-h-28">
            <p className="text-xs text-slate-500 font-medium">Complete</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{completeOrders.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 min-h-28">
            <p className="text-xs text-slate-500 font-medium">Rejected</p>
            <p className="text-3xl font-black text-rose-600 mt-1">{rejectedOrders.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 min-h-28">
            <p className="text-xs text-slate-500 font-medium">Total Orders</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{allOrders.length}</p>
          </div>
        </div>

        {/* ── Quick-assign worker panel ── */}
        <section className="rounded-2xl border border-slate-100 bg-linear-to-r from-white via-rose-50/40 to-white p-4 shadow-sm no-print">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Call Worker + Assign Work</p>
              <p className="text-xs text-slate-500">Single tap worker flow for fast morning assignment.</p>
            </div>
            <div className="flex items-center gap-2 text-rose-700">
              <Sparkles size={14} />
              <HardHat size={16} className="text-slate-500" />
            </div>
          </div>

          {workersLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 skeleton rounded-lg" />
              ))}
            </div>
          ) : activeWorkers.length === 0 ? (
            <p className="text-sm text-slate-500">No active workers found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeWorkers.map((worker) => (
                <button
                  key={worker._id}
                  onClick={() => openCreateFor(worker)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#D32F2F] hover:text-[#D32F2F] hover:shadow-sm transition-all"
                >
                  {worker.name}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Working list section ── */}
        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 no-print">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-slate-500" />
                <p className="text-sm font-bold text-slate-800">Working List</p>
                {hasActiveFilters && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    <Filter size={8} />
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
                  >
                    <XCircle size={12} />
                    Clear filters
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  disabled={printLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-60"
                >
                  <Printer size={13} />
                  {printLoading ? "Preparing PDF..." : "Print"}
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Entry type multi-select pills */}
              <div className="flex flex-wrap gap-1 sm:col-span-2 lg:col-span-2">
                {(Object.keys(ENTRY_TYPE_LABELS) as EntryTypeFilter[]).map((key) => {
                  const isActive = entryTypes.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleEntryType(key)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all whitespace-nowrap border",
                        isActive
                          ? key === "rejected"
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : key === "complete"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : key === "pending"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : key === "inprogress"
                            ? "bg-orange-100 text-orange-800 border-orange-300"
                            : "bg-indigo-100 text-indigo-800 border-indigo-300"
                          : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                      )}
                    >
                      {isActive && <span className="mr-1 text-[9px]">✓</span>}
                      {ENTRY_TYPE_LABELS[key]}
                      {key === "rejected" && rejectedOrders.length > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-black">
                          {rejectedOrders.length}
                        </span>
                      )}
                    </button>
                  );
                })}
                {entryTypes.size > 0 && (
                  <span className="self-center ml-1 text-[10px] text-slate-400 italic">
                    {entryTypes.size > 1 ? `${entryTypes.size} selected (OR)` : "1 selected"}
                  </span>
                )}
              </div>

              {/* Date range */}
              <div className="flex gap-1.5 items-center">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
                  title="Date from"
                />
                <span className="text-slate-400 text-xs">–</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
                  title="Date to"
                />
              </div>

              {/* Worker filter */}
              <div className="flex gap-1.5">
                <select
                  value={workerFilter}
                  onChange={(e) => setWorkerFilter(e.target.value)}
                  className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
                >
                  <option value="">All Workers</option>
                  {activeWorkers.map((w) => (
                    <option key={w._id} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </select>

                {/* Text search */}
                <div className="relative flex-1">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="p-4" id="workflow-print-area">
            {/* Print header (only visible when printing) */}
            <div className="hidden print:block mb-4">
              <h2 className="text-lg font-bold">Work Order Flow</h2>
              <p className="text-xs text-slate-500">
                {hasActiveFilters
                  ? [
                      entryTypes.size > 0
                        ? `Types: ${Array.from(entryTypes).map((t) => ENTRY_TYPE_LABELS[t]).join(", ")}`
                        : null,
                      workerFilter ? `Worker: ${workerFilter}` : null,
                      dateFrom ? `From ${dateFrom}` : null,
                      dateTo ? `To ${dateTo}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "All orders"}
                {" — "}Printed on {new Date().toLocaleDateString("en-IN")}
              </p>
            </div>


            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3 text-center w-10">#</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Worker</th>
                    <th className="px-4 py-3">Work Type</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Bangles</th>
                    <th className="px-4 py-3 text-right">Thread</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {ordersLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3" colSpan={9}>
                          <div className="h-9 skeleton rounded-lg" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={9}>
                        {hasActiveFilters ? "No orders match your filters." : "No orders yet."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((order, idx) => {
                      const halfInProgress = isHalfWorkInProgress(order);
                      const isRejected = order.status === "Rejected";
                      const totalRejected = Math.max(0, order.finishedPieces - order.qualityOK);
                      const alreadyResolved = order.rejectedResolved ?? 0;
                      const remainingRejected = totalRejected - alreadyResolved;

                      return (
                        <tr
                          key={order._id}
                          className={cn(
                            "hover:bg-slate-50/70 transition-colors",
                            order.assignmentType === "half" ? "border-l-4 border-l-amber-400" : "",
                            isRejected ? "bg-rose-50/40" : ""
                          )}
                        >
                          {/* Row number */}
                          <td className="px-3 py-3 text-center text-xs font-bold text-slate-400 tabular-nums">
                            {idx + 1}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-slate-500 tabular-nums">
                            {formatDateDMY(order.date)}
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {(() => {
                              const links = getChainLinks(order, allOrders);
                              if (links && links.legNumber > 1) {
                                return (
                                  <div className="flex items-center gap-1.5 pl-3">
                                    <span className="text-slate-400 font-bold select-none text-xs">↳</span>
                                    <span>{getWorkerName(order)}</span>
                                  </div>
                                );
                              }
                              return <span>{getWorkerName(order)}</span>;
                            })()}
                          </td>

                          <td className="px-4 py-3 text-slate-600">{order.workType}</td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            {(() => {
                              const links = getChainLinks(order, allOrders);
                              if (links) {
                                return (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                    <GitBranch size={9} />
                                    Half (Leg {links.legNumber})
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                  Full
                                </span>
                              );
                            })()}
                          </td>

                          <td className="px-4 py-3 text-right text-slate-700">
                            {getTotalGivenPieces(order)}
                          </td>

                          <td className="px-4 py-3 text-right text-slate-700">
                            {order.threadsGiven}g
                          </td>

                          {/* Status cell */}
                          <td className="px-4 py-3 text-center">
                            {isRejected ? (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                                  <AlertTriangle size={9} />
                                  Rejected
                                </span>
                                <span className="text-[9px] text-rose-500 font-medium">
                                  {remainingRejected} pcs left
                                </span>
                              </div>
                            ) : order.status === "Open" ? (
                              halfInProgress ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  In Progress
                                </span>
                              ) : (
                                <Badge variant="warning">Pending</Badge>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                                <CheckCircle2 size={14} />
                                {order.status === "Completed" ? "Completed" : "Returned"}
                              </span>
                            )}
                          </td>

                          {/* Action cell */}
                          <td className="px-4 py-3 text-center no-print">
                            {isRejected ? (
                              <Button
                                size="sm"
                                onClick={() => openReturn(order._id)}
                                className="cursor-pointer !bg-rose-600 hover:!bg-rose-700 !text-white"
                              >
                                <AlertTriangle size={11} className="mr-1" />
                                Finish Rejected
                              </Button>
                            ) : order.status === "Open" ? (
                              halfInProgress ? (
                                allOrders.some((o) => o.parentWorkOrderId === order._id) ? (
                                  <span className="text-xs font-semibold text-slate-400">
                                    Transferred
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openContinueHalfWork(order)}
                                    className="text-amber-700 border-amber-300 !bg-amber-100 hover:!bg-amber-200 hover:!text-amber-700 cursor-pointer"
                                  >
                                    <ArrowRight size={12} />
                                    Continue
                                  </Button>
                                )
                              ) : (
                                <Button size="sm" onClick={() => openReturn(order._id)} className="cursor-pointer">
                                  <Undo2 size={12} className="mr-1" />
                                  Return
                                </Button>
                              )
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => openCreateFor()} className="cursor-pointer">
                                Re-assign
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            {filtered.length > 0 && (
              <p className="mt-2 text-right text-xs text-slate-400">
                Showing {filtered.length} order{filtered.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </section>

        {/* ── Modals ── */}
        <CreateWorkOrderForm
          isOpen={orderModalOpen}
          onClose={() => {
            setOrderModalOpen(false);
            setSelectedWorker(null);
            setContinueFromOrder(undefined);
          }}
          preSelectedWorkerId={selectedWorker?._id}
          preSelectedWorkerName={selectedWorker?.name}
          preSelectedParentOrder={continueFromOrder}
        />

        <ReturnMaterialForm
          isOpen={returnModalOpen}
          onClose={() => {
            setReturnModalOpen(false);
            setReturnOrderId(undefined);
          }}
          preSelectedOrderId={returnOrderId}
        />

      </div>
    </>
  );
}
