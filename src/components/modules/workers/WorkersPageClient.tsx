"use client";

import { useState } from "react";
import { Search, Plus, AlertTriangle, ChevronLeft, Undo2, HardHat, CheckCircle2 } from "lucide-react";
import { useWorkers } from "@/hooks/useWorkers";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { useIsOwner } from "@/stores/useAuthStore";
import { WorkerCard } from "./WorkerCard";
import { AddWorkerModal } from "./AddWorkerModal";
import { CreateWorkOrderForm } from "./CreateWorkOrderForm";
import { ReturnMaterialForm } from "./ReturnMaterialForm";
import { WorkerLedger } from "./WorkerLedger";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { IWorker } from "@/types";

type Tab = "workers" | "active" | "ledger";

export function WorkersPageClient() {
  const isOwner = useIsOwner();
  const [activeTab, setActiveTab] = useState<Tab>("workers");
  const [search, setSearch] = useState("");

  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [editWorker, setEditWorker] = useState<IWorker | null>(null);
  const [orderWorker, setOrderWorker] = useState<IWorker | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [ledgerWorker, setLedgerWorker] = useState<IWorker | null>(null);

  const { data: workers = [], isLoading: workersLoading } = useWorkers();
  const { data: activeOrders = [], isLoading: ordersLoading } = useWorkOrders({ status: "Open" });

  const filtered = workers.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalBalance = workers.reduce((s, w) => s + (w.balance ?? 0), 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: "workers", label: "All Workers" },
    { key: "active", label: `Active Orders (${activeOrders.length})` },
    { key: "ledger", label: "Ledger" },
  ];

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Workers / Kaarigaar</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage work orders, wages & payments</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setReturnOpen(true)}>
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

      {/* Pending payments banner */}
      {isOwner && totalBalance > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D32F2F]/10">
            <AlertTriangle size={14} className="text-[#D32F2F]" />
          </div>
          <p className="text-sm font-bold text-[#D32F2F]">
            Total pending payments: ₹{totalBalance.toLocaleString("en-IN")}
          </p>
        </div>
      )}

      {/* Pill tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === t.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: All Workers */}
      {activeTab === "workers" && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search workers…"
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
                {search ? "No workers match your search." : "No workers yet. Add your first worker."}
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
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Active Orders */}
      {activeTab === "active" && (
        <div className="space-y-3">
          {ordersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 skeleton rounded-xl" />
              ))}
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 size={40} className="text-emerald-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No open work orders.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Worker</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Work Type</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeOrders.map((o) => {
                    const workerObj =
                      typeof o.workerId === "object" && o.workerId !== null
                        ? (o.workerId as unknown as { name: string })
                        : null;
                    return (
                      <tr key={o._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {new Date(o.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">{workerObj?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{o.workType}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="info">Open</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button size="sm" variant="outline" onClick={() => setReturnOpen(true)}>
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

      {/* Tab: Ledger */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          {!ledgerWorker ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select a worker to view their ledger:</p>
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
        aria-label="Create work order"
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
      <ReturnMaterialForm isOpen={returnOpen} onClose={() => setReturnOpen(false)} />
    </div>
  );
}
