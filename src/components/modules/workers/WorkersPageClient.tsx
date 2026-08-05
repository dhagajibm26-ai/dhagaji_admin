"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  AlertTriangle,
  ChevronLeft,
  Undo2,
  HardHat,
  CheckCircle2,
  Clock,
  IndianRupee,
  TrendingUp,
  Eye,
} from "lucide-react";
import { useWorkers } from "@/hooks/useWorkers";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { useIsOwner } from "@/stores/useAuthStore";
import { WorkerCard } from "./WorkerCard";
import { AddWorkerModal } from "./AddWorkerModal";
import { Modal } from "@/components/ui/Modal";
import { CreateWorkOrderForm } from "./CreateWorkOrderForm";
import { ReturnMaterialForm } from "./ReturnMaterialForm";
import { WorkerLedger } from "./WorkerLedger";
import { SalarySummary } from "./SalarySummary";
import { Button } from "@/components/ui/Button";
import { formatDateDMY } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { IWorker } from "@/types";

function getLogoDataUrl(): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve("");
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = "/logo.png";
  });
}

async function downloadPdf(worker: IWorker) {
  const { default: jsPDF } = await import("jspdf");

  // Create PDF landscape
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [120, 80]
  });

  // Background card outline
  doc.setDrawColor(210, 158, 113); // Gold #d29e71
  doc.setLineWidth(0.8);
  doc.setFillColor(242, 246, 243); // Light Sage #f2f6f3
  doc.roundedRect(4, 4, 112, 72, 3, 3, "FD");

  // Header background banner
  doc.setFillColor(27, 67, 50); // Dark Green
  doc.rect(4.4, 4.4, 111.2, 14, "F");

  // Load and draw logo
  const logoDataUrl = await getLogoDataUrl();
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 6, 5.5, 38, 11);
  }

  // Header Text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(210, 158, 113); // Gold-ish color accent
  doc.text("WORKER IDENTITY CARD", 48, 11.7);

  // Draw Photo Frame
  const photoX = 8;
  const photoY = 22;
  const photoW = 26;
  const photoH = 34;

  // Gold frame border for photo
  doc.setDrawColor(210, 158, 113);
  doc.setLineWidth(0.3);
  doc.rect(photoX - 0.2, photoY - 0.2, photoW + 0.4, photoH + 0.4, "D");

  if (worker.photoDataUrl) {
    try {
      doc.addImage(worker.photoDataUrl, "JPEG", photoX, photoY, photoW, photoH);
    } catch (e) {
      doc.setDrawColor(200, 200, 200);
      doc.rect(photoX, photoY, photoW, photoH, "D");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text("PHOTO", photoX + 13, photoY + 17, { align: "center" });
    }
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(photoX, photoY, photoW, photoH, "D");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text("NO PHOTO", photoX + 13, photoY + 17, { align: "center" });
  }

  // Draw ID text under photo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(46, 67, 57); // Dark Sage text #2e4339
  doc.text(`ID: ${worker._id.slice(-6).toUpperCase()}`, photoX + 13, photoY + 38, { align: "center" });

  // Details column (Right side)
  const textX = 38;
  let textY = 24.5;
  const lineSpacing = 4.2;

  // Name (English)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(202, 160, 119); // Gold label accent #caa077
  doc.text("FULL NAME:", textX, textY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 39, 29); // Dark Green value #11271d
  doc.text(worker.name, textX + 22, textY);

  if (worker.nameGu) {
    textY += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(46, 67, 57); // #2e4339
    doc.text(worker.nameGu, textX + 22, textY);
  }

  // Father/Husband
  textY += lineSpacing;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(202, 160, 119); // #caa077
  doc.text("FATHER/HUSBAND:", textX, textY);
  doc.setFont("helvetica", "semibold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 39, 29); // #11271d
  doc.text(worker.fatherOrHusbandName || "—", textX + 22, textY);

  // Designation
  textY += lineSpacing;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(202, 160, 119); // #caa077
  doc.text("DESIGNATION:", textX, textY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 39, 29); // #11271d
  doc.text(worker.designation || "Worker", textX + 22, textY);

  // Mobile
  textY += lineSpacing;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(202, 160, 119); // #caa077
  doc.text("MOBILE NO:", textX, textY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 39, 29); // #11271d
  doc.text(worker.mobile || worker.phone || "—", textX + 22, textY);

  // Aadhaar
  textY += lineSpacing;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(202, 160, 119); // #caa077
  doc.text("AADHAAR:", textX, textY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 39, 29); // #11271d
  doc.text(worker.aadhaarNumber || "—", textX + 22, textY);

  // Address
  textY += lineSpacing;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(202, 160, 119); // #caa077
  doc.text("ADDRESS:", textX, textY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(17, 39, 29); // #11271d
  const addr = worker.address || "—";
  const wrappedAddress = doc.splitTextToSize(addr, 50);
  doc.text(wrappedAddress, textX + 22, textY);

  // Bottom stats metadata row (White card with thin gold border)
  const metaY = 66.5;
  doc.setFillColor(255, 255, 255); // White inner background
  doc.setDrawColor(210, 158, 113); // Gold border outline
  doc.setLineWidth(0.2);
  doc.roundedRect(6, 61, 108, 11, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(46, 67, 57); // Dark Green label #2e4339

  // DOB
  doc.text("DOB", 10, metaY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(17, 39, 29); // Value #11271d
  doc.text(worker.dateOfBirth ? formatDateDMY(new Date(worker.dateOfBirth)) : "—", 10, metaY + 3.2);

  // Blood
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(46, 67, 57);
  doc.text("BLOOD GROUP", 38, metaY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(17, 39, 29);
  doc.text(worker.bloodGroup || "—", 38, metaY + 3.2);

  // Gender
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(46, 67, 57); // #2e4339
  doc.text("GENDER", 68, metaY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(17, 39, 29); // #11271d
  doc.text(worker.gender || "—", 68, metaY + 3.2);

  // Joining
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(46, 67, 57); // #2e4339
  doc.text("JOINING DATE", 92, metaY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(17, 39, 29); // #11271d
  doc.text(worker.joiningDate ? formatDateDMY(new Date(worker.joiningDate)) : "—", 92, metaY + 3.2);

  doc.save(`Worker_ID_${worker.name.replace(/\s+/g, "_")}.pdf`);
}

type Tab = "workers" | "active" | "salary" | "ledger";

export function WorkersPageClient() {
  const isOwner = useIsOwner();
  const [activeTab, setActiveTab] = useState<Tab>("workers");
  const [search, setSearch] = useState("");

  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [editWorker, setEditWorker] = useState<IWorker | null>(null);
  const [viewWorker, setViewWorker] = useState<IWorker | null>(null);
  const [orderWorker, setOrderWorker] = useState<IWorker | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | undefined>();
  const [ledgerWorker, setLedgerWorker] = useState<IWorker | null>(null);

  const { data: workers = [], isLoading: workersLoading } = useWorkers();
  const { data: activeOrders = [], isLoading: ordersLoading } = useWorkOrders({ status: "Open" });

  const filtered = workers.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalBalance = workers.reduce((s, w) => s + (w.balance ?? 0), 0);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "workers", label: "Workers", icon: HardHat },
    { key: "active", label: `Pending (${activeOrders.length})`, icon: Clock },
    { key: "salary", label: "Salary", icon: IndianRupee },
    { key: "ledger", label: "Ledger", icon: TrendingUp },
  ];

  function openReturnFor(orderId?: string) {
    setReturnOrderId(orderId);
    setReturnOpen(true);
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Workers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Issue material, record work orders, pay wages — all in one place
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => openReturnFor()}>
            <Undo2 size={13} className="mr-1.5" />
            Record Return
          </Button>
          {isOwner && (
            <Button size="sm" onClick={() => setAddWorkerOpen(true)}>
              <Plus size={14} className="mr-1" />
              Add Worker
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Total Workers</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{workers.filter(w => w.isActive).length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active workers</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Open Orders</p>
          <p className="text-2xl font-black text-amber-600 mt-0.5">{activeOrders.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">In progress</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Total Earned</p>
          <p className="text-2xl font-black text-green-700 mt-0.5">
            ₹{workers.reduce((s, w) => s + w.totalEarned, 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total wages earned</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Pending Payment</p>
          <p className={cn("text-2xl font-black mt-0.5", totalBalance > 0 ? "text-rose-600" : "text-green-700")}>
            ₹{totalBalance.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Outstanding balance</p>
        </div>
      </div>

      {/* Alert banner */}
      {isOwner && totalBalance > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D32F2F]/10">
            <AlertTriangle size={14} className="text-[#D32F2F]" />
          </div>
          <p className="text-sm font-bold text-[#D32F2F]">
            ⚠️ Total pending payment: ₹{totalBalance.toLocaleString("en-IN")} — Workers have outstanding wages
          </p>
        </div>
      )}

      {/* Pill tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
              activeTab === t.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-700"
            )}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: All Workers ───────────────────────────────────────────────── */}
      {activeTab === "workers" && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search worker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F] placeholder:text-slate-400"
            />
          </div>

          {workersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 skeleton rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HardHat size={40} className="text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">
                {search ? "No worker found." : "No workers yet — add your first worker."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((w) => (
                <WorkerCard
                  key={w._id}
                  worker={w}
                  onAddOrder={(worker) => setOrderWorker(worker)}
                  onViewLedger={(worker) => {
                    setLedgerWorker(worker);
                    setActiveTab("ledger");
                  }}
                  onEdit={isOwner ? (worker) => setEditWorker(worker) : undefined}
                  onViewCard={(worker) => setViewWorker(worker)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Pending / Active Orders ─────────────────────────────────── */}
      {activeTab === "active" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">
                Active work orders ({activeOrders.length} open)
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Material issued, return pending
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => openReturnFor()}>
              <Undo2 size={12} className="mr-1.5" />
              Record Return
            </Button>
          </div>

          {ordersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 skeleton rounded-xl" />
              ))}
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 size={40} className="text-emerald-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">
                All work orders complete! No pending returns.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#D32F2F] border-b border-slate-100 text-white">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">Worker</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">Work Type</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">Bangles Issued</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">Rate/Piece</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeOrders.map((o) => {
                    const workerObj =
                      typeof o.workerId === "object" && o.workerId !== null
                        ? (o.workerId as unknown as { name: string })
                        : null;
                    const totalPieces = o.banglesGiven.reduce((s, b) => s + b.pieces, 0);
                    return (
                      <tr key={o._id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {formatDateDMY(o.date)}
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-semibold">
                          {workerObj?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{o.workType}</td>
                        <td className="px-4 py-3 text-center">
                          {totalPieces > 0 ? (
                            <span className="font-semibold text-amber-700">{totalPieces} pcs</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">
                          ₹{o.perPieceRate}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="warning">Pending</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openReturnFor(o._id)}
                          >
                            Record Return
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Salary Summary ────────────────────────────────────────────── */}
      {activeTab === "salary" && <SalarySummary workers={workers} />}

      {/* ── Tab: Ledger ────────────────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          {!ledgerWorker ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Select a worker to view their ledger:
              </p>
              <div className="flex flex-wrap gap-2">
                {workers.map((w) => (
                  <button
                    key={w._id}
                    onClick={() => setLedgerWorker(w)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#D32F2F] hover:text-[#D32F2F] transition-all shadow-sm"
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setLedgerWorker(null)}
                  className="flex items-center gap-1 text-sm font-semibold text-[#D32F2F] hover:underline transition-colors"
                >
                  <ChevronLeft size={14} />
                  All Workers
                </button>
                <span className="text-slate-200">|</span>
                <h2 className="text-sm font-bold text-slate-900">
                  Ledger: {ledgerWorker.name}
                </h2>
              </div>
              <WorkerLedger workerId={ledgerWorker._id} workerName={ledgerWorker.name} />
            </div>
          )}
        </div>
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => setOrderWorker(workers[0] ?? null)}
        className="fixed bottom-20 right-4 lg:hidden flex items-center justify-center rounded-2xl bg-[#D32F2F] text-white shadow-xl shadow-red-700/30 transition-all hover:bg-[#B71C1C] active:scale-95"
        aria-label="New work order"
        style={{ width: 52, height: 52 }}
      >
        <Plus size={22} />
      </button>

      {/* Modals */}
      <AddWorkerModal isOpen={addWorkerOpen} onClose={() => setAddWorkerOpen(false)} />
      <AddWorkerModal isOpen={!!editWorker} onClose={() => setEditWorker(null)} worker={editWorker} />
      <CreateWorkOrderForm
        isOpen={!!orderWorker}
        onClose={() => setOrderWorker(null)}
        preSelectedWorkerId={orderWorker?._id}
        preSelectedWorkerName={orderWorker?.name}
      />
      <ReturnMaterialForm
        isOpen={returnOpen}
        onClose={() => {
          setReturnOpen(false);
          setReturnOrderId(undefined);
        }}
        preSelectedOrderId={returnOrderId}
      />

      {viewWorker && (
        <Modal
          isOpen={!!viewWorker}
          onClose={() => setViewWorker(null)}
          title="Worker Details"
          subtitle="Official identity card and contact profile"
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void downloadPdf(viewWorker)}
              >
                Download PDF
              </Button>
              <Button variant="primary" size="sm" onClick={() => setViewWorker(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="flex flex-col items-center justify-center p-4">
            <div id="worker-id-card-layout" className="w-full max-w-[460px] rounded-2xl border border-[#d29e71]/40 bg-[#f2f6f3] shadow-sm overflow-hidden space-y-0">
              {/* Header with Logo */}
              <div className="bg-[#1b4332] px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="Dhagaji Creation Logo"
                    className="h-9 w-auto object-contain"
                  />
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Grid: Left side Image, Right side Details */}
                <div className="grid grid-cols-[120px,1fr] gap-4 items-start">
                  {/* Left Side: Photo */}
                  <div className="space-y-2 text-center">
                    {viewWorker.photoDataUrl ? (
                      <img
                        src={viewWorker.photoDataUrl}
                        alt="Worker Photo"
                        className="h-[140px] w-[110px] rounded-xl border border-[#d29e71]/30 object-cover shadow-sm mx-auto"
                      />
                    ) : (
                      <div className="h-[140px] w-[110px] rounded-xl border-2 border-dashed border-[#d29e71]/20 bg-white grid place-content-center text-xs text-slate-400 font-semibold mx-auto">
                        No Photo
                      </div>
                    )}
                    <p className="text-[10px] font-bold text-[#2e4339] uppercase tracking-wide">ID: {viewWorker._id.slice(-6).toUpperCase()}</p>
                  </div>

                  {/* Right Side: Details */}
                  <div className="space-y-2 text-xs text-[#2e4339]">
                    <div>
                      <span className="text-[#2e4339]/60 font-bold block uppercase text-[9px] tracking-wider font-semibold">Full Name</span>
                      <span className="font-bold text-sm text-[#11271d] block">{viewWorker.name}</span>
                      {viewWorker.nameGu && <span className="text-[#2e4339] block font-medium mt-0.5">{viewWorker.nameGu}</span>}
                    </div>

                    {viewWorker.fatherOrHusbandName && (
                      <div>
                        <span className="text-[#2e4339]/60 font-bold block uppercase text-[9px] tracking-wider font-semibold">Father / Husband</span>
                        <span className="font-semibold text-[#11271d] block">{viewWorker.fatherOrHusbandName}</span>
                        {viewWorker.fatherOrHusbandNameGu && <span className="text-[#2e4339] block mt-0.5">{viewWorker.fatherOrHusbandNameGu}</span>}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[#2e4339]/60 font-bold block uppercase text-[9px] tracking-wider font-semibold">Designation</span>
                        <span className="font-semibold text-[#11271d] block">{viewWorker.designation || "Worker"}</span>
                      </div>
                      <div>
                        <span className="text-[#2e4339]/60 font-bold block uppercase text-[9px] tracking-wider font-semibold">Mobile</span>
                        <span className="font-semibold text-[#11271d] block font-mono">{viewWorker.mobile || viewWorker.phone || "—"}</span>
                      </div>
                    </div>

                    {viewWorker.aadhaarNumber && (
                      <div>
                        <span className="text-[#2e4339]/60 font-bold block uppercase text-[9px] tracking-wider font-semibold">Aadhaar Number</span>
                        <span className="font-semibold text-[#11271d] block font-mono tracking-wider">{viewWorker.aadhaarNumber}</span>
                      </div>
                    )}

                    {viewWorker.address && (
                      <div>
                        <span className="text-[#2e4339]/60 font-bold block uppercase text-[9px] tracking-wider font-semibold">Address</span>
                        <span className="font-semibold text-[#11271d] block leading-tight">{viewWorker.address}</span>
                        {viewWorker.addressGu && <span className="text-[#2e4339] block leading-tight mt-0.5">{viewWorker.addressGu}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Metadata details */}
                <div className="grid grid-cols-4 gap-2 rounded-xl bg-white p-2 text-[10px] text-center border border-[#d29e71]/20">
                  <div>
                    <p className="text-[#2e4339]/60 font-bold uppercase font-semibold">DOB</p>
                    <p className="font-bold text-[#11271d] mt-0.5">{viewWorker.dateOfBirth ? formatDateDMY(new Date(viewWorker.dateOfBirth)) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#2e4339]/60 font-bold uppercase font-semibold">Blood</p>
                    <p className="font-bold text-[#11271d] mt-0.5">{viewWorker.bloodGroup || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#2e4339]/60 font-bold uppercase font-semibold">Gender</p>
                    <p className="font-bold text-[#11271d] mt-0.5 capitalize">{viewWorker.gender || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#2e4339]/60 font-bold uppercase font-semibold">Joining</p>
                    <p className="font-bold text-[#11271d] mt-0.5">{viewWorker.joiningDate ? formatDateDMY(new Date(viewWorker.joiningDate)) : "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
