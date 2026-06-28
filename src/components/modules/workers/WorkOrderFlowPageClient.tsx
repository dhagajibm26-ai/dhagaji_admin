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
} from "lucide-react";
import { useWorkers } from "@/hooks/useWorkers";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { CreateWorkOrderForm } from "./CreateWorkOrderForm";
import { ReturnMaterialForm } from "./ReturnMaterialForm";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
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

/** True when this half-work order is still in progress (return not yet allowed).
 *  Uses !== true so that allowReturn=undefined (legacy/unset) is also treated as "in progress". */
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

  // 1. Calculate Leg Number & Parent
  let legNumber = 1;
  let currentParentId = order.parentWorkOrderId;
  let parentWorkerName: string | undefined;

  while (currentParentId) {
    const parent = allOrders.find((o) => o._id === currentParentId);
    if (!parent) break;
    if (legNumber === 1) {
      parentWorkerName = getWorkerName(parent);
    }
    legNumber++;
    currentParentId = parent.parentWorkOrderId;
  }

  // 2. Find if this order is continued by someone else (child order)
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

export function WorkOrderFlowPageClient() {
  const [search, setSearch] = useState("");
  const [activeListTab, setActiveListTab] = useState<"pending" | "complete">("pending");
  const [selectedWorker, setSelectedWorker] = useState<IWorker | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | undefined>();
  /** Parent order pre-selected when user clicks "Continue Work" */
  const [continueFromOrder, setContinueFromOrder] = useState<IWorkOrder | undefined>();

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

  // Group and sort pending orders so chains stay together in sequence (root date desc, leg asc)
  const sortedPending = useMemo(() => {
    const processed = pendingOrders.map((order) => {
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
      if (!groups.has(item.rootId)) {
        groups.set(item.rootId, []);
      }
      groups.get(item.rootId)!.push(item);
    }

    const getRootDate = (rootId: string) => {
      const rootItem = allOrders.find((x) => x._id === rootId);
      return rootItem ? new Date(rootItem.date).getTime() : 0;
    };

    const sortedRootIds = Array.from(groups.keys()).sort((a, b) => {
      return getRootDate(b) - getRootDate(a);
    });

    const result: IWorkOrder[] = [];
    for (const rootId of sortedRootIds) {
      const groupItems = groups.get(rootId)!;
      groupItems.sort((a, b) => a.legNumber - b.legNumber);
      result.push(...groupItems.map((item) => item.order));
    }

    return result;
  }, [pendingOrders, allOrders]);

  // Group and sort complete orders so chains stay together in sequence
  const sortedComplete = useMemo(() => {
    const processed = completeOrders.map((order) => {
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
      if (!groups.has(item.rootId)) {
        groups.set(item.rootId, []);
      }
      groups.get(item.rootId)!.push(item);
    }

    const getRootDate = (rootId: string) => {
      const rootItem = allOrders.find((x) => x._id === rootId);
      return rootItem ? new Date(rootItem.date).getTime() : 0;
    };

    const sortedRootIds = Array.from(groups.keys()).sort((a, b) => {
      return getRootDate(b) - getRootDate(a);
    });

    const result: IWorkOrder[] = [];
    for (const rootId of sortedRootIds) {
      const groupItems = groups.get(rootId)!;
      groupItems.sort((a, b) => a.legNumber - b.legNumber);
      result.push(...groupItems.map((item) => item.order));
    }

    return result;
  }, [completeOrders, allOrders]);

  const filteredPending = useMemo(() => {
    if (!search.trim()) return sortedPending;
    const q = search.toLowerCase();
    return sortedPending.filter((o) => {
      const workerName = getWorkerName(o).toLowerCase();
      return workerName.includes(q) || o.workType.toLowerCase().includes(q);
    });
  }, [sortedPending, search]);

  const filteredComplete = useMemo(() => {
    if (!search.trim()) return sortedComplete;
    const q = search.toLowerCase();
    return sortedComplete.filter((o) => {
      const workerName = getWorkerName(o).toLowerCase();
      return workerName.includes(q) || o.workType.toLowerCase().includes(q);
    });
  }, [sortedComplete, search]);

  const currentRows = activeListTab === "pending" ? filteredPending : filteredComplete;

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

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          <p className="text-xs text-slate-500 font-medium">Total Orders</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{allOrders.length}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-linear-to-r from-white via-rose-50/40 to-white p-4 shadow-sm">
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

      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-slate-500" />
            <p className="text-sm font-bold text-slate-800">Working List</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveListTab("pending")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                activeListTab === "pending"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-white text-slate-500 hover:text-slate-700"
              )}
            >
              Pending ({filteredPending.length})
            </button>
            <button
              onClick={() => setActiveListTab("complete")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                activeListTab === "complete"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-white text-slate-500 hover:text-slate-700"
              )}
            >
              Complete ({filteredComplete.length})
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative max-w-sm mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by worker or work type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3">Work Type</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Bangles</th>
                  <th className="px-4 py-3 text-right">Thread</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ordersLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3" colSpan={8}>
                        <div className="h-9 skeleton rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : currentRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                      {activeListTab === "pending" ? "No pending returns." : "No completed orders yet."}
                    </td>
                  </tr>
                ) : (
                  currentRows.map((order) => {
                    const halfInProgress = isHalfWorkInProgress(order);
                    return (
                      <tr
                        key={order._id}
                        className={cn(
                          "hover:bg-slate-50/70 transition-colors",
                          order.assignmentType === "half" ? "border-l-4 border-l-amber-400" : ""
                        )}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {new Date(order.date).toLocaleDateString("en-IN")}
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
                        <td className="px-4 py-3 text-right text-slate-700">{getTotalGivenPieces(order)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{order.threadsGiven}g</td>
                        <td className="px-4 py-3 text-center">
                          {order.status === "Open" ? (
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
                        <td className="px-4 py-3 text-center">
                          {order.status === "Open" ? (
                            halfInProgress ? (
                              // If it has already been continued, don't show Continue button
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
        </div>
      </section>

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
  );
}
