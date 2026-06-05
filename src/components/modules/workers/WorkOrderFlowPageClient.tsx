"use client";

import { useMemo, useState } from "react";
import { HardHat, Undo2, Plus, CheckCircle2, Search } from "lucide-react";
import { useWorkers } from "@/hooks/useWorkers";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { CreateWorkOrderForm } from "./CreateWorkOrderForm";
import { ReturnMaterialForm } from "./ReturnMaterialForm";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { IWorkOrder, IWorker } from "@/types";

function getWorkerName(order: IWorkOrder): string {
  if (typeof order.workerId === "object" && order.workerId && "name" in order.workerId) {
    return (order.workerId as unknown as { name?: string }).name ?? "Unknown";
  }
  return "Unknown";
}

function getTotalGivenPieces(order: IWorkOrder): number {
  return order.banglesGiven.reduce((sum, item) => sum + item.pieces, 0);
}

export function WorkOrderFlowPageClient() {
  const [search, setSearch] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<IWorker | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | undefined>();

  const { data: workers = [], isLoading: workersLoading } = useWorkers();
  const { data: allOrders = [], isLoading: ordersLoading } = useWorkOrders();

  const activeWorkers = useMemo(() => workers.filter((w) => w.isActive), [workers]);

  const pendingOrders = useMemo(
    () => allOrders.filter((o) => o.status === "Open"),
    [allOrders]
  );

  const completeOrders = useMemo(
    () => allOrders.filter((o) => o.status === "Returned" || o.status === "Completed"),
    [allOrders]
  );

  const filteredPending = useMemo(() => {
    if (!search.trim()) return pendingOrders;
    const q = search.toLowerCase();
    return pendingOrders.filter((o) => {
      const workerName = getWorkerName(o).toLowerCase();
      return workerName.includes(q) || o.workType.toLowerCase().includes(q);
    });
  }, [pendingOrders, search]);

  const filteredComplete = useMemo(() => {
    if (!search.trim()) return completeOrders;
    const q = search.toLowerCase();
    return completeOrders.filter((o) => {
      const workerName = getWorkerName(o).toLowerCase();
      return workerName.includes(q) || o.workType.toLowerCase().includes(q);
    });
  }, [completeOrders, search]);

  function openCreateFor(worker?: IWorker) {
    setSelectedWorker(worker ?? null);
    setOrderModalOpen(true);
  }

  function openReturn(orderId?: string) {
    setReturnOrderId(orderId);
    setReturnModalOpen(true);
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Work Order Flow</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Subah ka kaam dena, maal return lena, pending aur complete listing ek jagah
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => openCreateFor()}>
            <Plus size={14} className="mr-1.5" />
           Add Work to Worker
          </Button>
          <Button size="sm" variant="outline" onClick={() => openReturn()}>
            <Undo2 size={14} className="mr-1.5" />
            Return Entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Active Workers</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{activeWorkers.length}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Return Baki</p>
          <p className="text-2xl font-black text-amber-600 mt-0.5">{pendingOrders.length}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Complete</p>
          <p className="text-2xl font-black text-emerald-600 mt-0.5">{completeOrders.length}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Total Orders</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{allOrders.length}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Worker Ne Kaam Dena (Subah)</p>
            <p className="text-xs text-slate-500">Kisi worker pe tap karo aur turant work order create karo</p>
          </div>
          <HardHat size={16} className="text-slate-400" />
        </div>

        {workersLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 skeleton rounded-lg" />
            ))}
          </div>
        ) : activeWorkers.length === 0 ? (
          <p className="text-sm text-slate-500">Active worker nahi mile.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeWorkers.map((worker) => (
              <button
                key={worker._id}
                onClick={() => openCreateFor(worker)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[#D32F2F] hover:text-[#D32F2F] transition-colors"
              >
                {worker.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Worker ya work type search karo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-amber-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-amber-50 px-4 py-3 border-b border-amber-100">
              <p className="text-sm font-bold text-amber-800">Maal Return Baki</p>
              <Badge variant="warning">{filteredPending.length}</Badge>
            </div>

            {ordersLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 skeleton rounded-xl" />
                ))}
              </div>
            ) : filteredPending.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Return pending order nahi hai.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredPending.map((order) => (
                  <div key={order._id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{getWorkerName(order)}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.date).toLocaleDateString("en-IN")} • {order.workType}
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Diya hua maal: {getTotalGivenPieces(order)} pcs • Thread {order.threadsGiven}g
                      </p>
                    </div>
                    <Button size="sm" onClick={() => openReturn(order._id)}>
                      <Undo2 size={12} className="mr-1" />
                      Return
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-emerald-50 px-4 py-3 border-b border-emerald-100">
              <p className="text-sm font-bold text-emerald-800">Complete Orders</p>
              <Badge variant="success">{filteredComplete.length}</Badge>
            </div>

            {ordersLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 skeleton rounded-xl" />
                ))}
              </div>
            ) : filteredComplete.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Abhi complete orders nahi hai.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredComplete.slice(0, 20).map((order) => (
                  <div key={order._id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{getWorkerName(order)}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.date).toLocaleDateString("en-IN")} • {order.workType}
                      </p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Quality OK: {order.qualityOK} • Returned: {order.finishedPieces}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 size={14} />
                      <span className="text-xs font-semibold">
                        {order.status === "Completed" ? "Completed" : "Returned"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <CreateWorkOrderForm
        isOpen={orderModalOpen}
        onClose={() => {
          setOrderModalOpen(false);
          setSelectedWorker(null);
        }}
        preSelectedWorkerId={selectedWorker?._id}
        preSelectedWorkerName={selectedWorker?.name}
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
  );
}
