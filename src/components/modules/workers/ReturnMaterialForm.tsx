"use client";

import { useMemo, useState } from "react";
import { useWorkOrders, useReturnWorkOrder } from "@/hooks/useWorkOrders";
import { useFinishedStock } from "@/hooks/useFinishedStock";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FINISHED_PRODUCT_CATEGORIES, type CutType, type IWorkOrder } from "@/types";

interface ReturnMaterialFormProps {
  isOpen: boolean;
  onClose: () => void;
  workerId?: string;
  preSelectedOrderId?: string;
}

type FinishedMode = "none" | "existing" | "new";

interface ReturnState {
  workOrderId: string;
  finishedMode: FinishedMode;
  finishedProductId: string;
  newCategory: string;
  newDesignName: string;
  newSize: string;
  threadsReturned: number;
  finishedPieces: number;
  qualityOK: number;
  damageNotes: string;
}

const empty: ReturnState = {
  workOrderId: "",
  finishedMode: "new",
  finishedProductId: "",
  newCategory: "Bangle",
  newDesignName: "",
  newSize: "",
  threadsReturned: 0,
  finishedPieces: 0,
  qualityOK: 0,
  damageNotes: "",
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function getWorkerName(order: IWorkOrder): string {
  if (typeof order.workerId === "object" && order.workerId && "name" in order.workerId) {
    return (order.workerId as unknown as { name?: string }).name ?? "Unknown";
  }
  return "Unknown";
}

// ─── Earnings Card Component ───────────────────────────────────────────────────
function WorkerEarningsCard({
  workerName,
  rate,
  finishedPieces,
  qualityOK,
}: {
  workerName: string;
  rate: number;
  finishedPieces: number;
  qualityOK: number;
}) {
  const rejected = Math.max(0, finishedPieces - qualityOK);
  const okEarnings = qualityOK * rate;
  const rejectionDeduction = rejected * rate * 0.5;
  const netEarnings = Math.max(0, okEarnings - rejectionDeduction);

  return (
    <div className="rounded-xl border-2 border-slate-200 p-4 space-y-2 bg-slate-50">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {workerName}'s Earnings
      </p>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">
          {qualityOK} OK pcs × ₹{rate}
        </span>
        <span className="font-semibold text-green-700">
          + ₹{okEarnings.toLocaleString("en-IN")}
        </span>
      </div>
      {rejected > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">
            {rejected} rejected × ₹{rate} × 50% deduction
          </span>
          <span className="font-semibold text-rose-600">
            − ₹{rejectionDeduction.toLocaleString("en-IN")}
          </span>
        </div>
      )}
      <div className="flex justify-between text-sm border-t border-slate-300 pt-2 mt-1">
        <span className="font-bold text-slate-800">Net Payable</span>
        <span className="font-black text-lg text-green-700">
          ₹{netEarnings.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}

// ─── Materials Return Section Component ─────────────────────────────────────────
function WorkerMaterialsReturnSection({
  order,
  isFinal,
  bangleReturns,
  rawReturns,
  threadsReturned,
  onBangleChange,
  onRawChange,
  onThreadChange,
}: {
  order: IWorkOrder;
  isFinal: boolean;
  bangleReturns: Record<number, string>;
  rawReturns: Record<string, string>;
  threadsReturned: string;
  onBangleChange: (idx: number, val: string) => void;
  onRawChange: (id: string, val: string) => void;
  onThreadChange: (val: string) => void;
}) {
  const workerName = getWorkerName(order);
  const threadTotal = useMemo(() => {
    const items = order.threadItemsGiven ?? [];
    return items.length > 0 ? items.reduce((s, t) => s + t.grams, 0) : order.threadsGiven;
  }, [order]);

  const hasMaterials =
    (order.banglesGiven?.length ?? 0) > 0 ||
    threadTotal > 0 ||
    (order.rawMaterialsGiven?.length ?? 0) > 0;

  if (!hasMaterials) return null;

  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 ${isFinal ? "border-indigo-200 bg-indigo-50/20" : "border-amber-200 bg-amber-50/20"}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isFinal ? "bg-indigo-500" : "bg-amber-500"}`} />
        <p className="text-sm font-bold text-slate-800">
          {workerName}'s Materials {isFinal ? "(Final Worker)" : "(Previous Worker)"}
        </p>
      </div>

      {/* Bangles */}
      {(order.banglesGiven?.length ?? 0) > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Bangles Returned (leftover)
          </p>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {order.banglesGiven.map((g, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_120px] gap-2 items-center px-3 py-2"
              >
                <span className="text-sm text-slate-700">
                  {g.size} · {g.cutType}
                  <span className="text-slate-400"> (issued {g.pieces} pcs)</span>
                </span>
                <Input
                  type="number"
                  min={0}
                  max={g.pieces}
                  placeholder="0 pcs"
                  value={bangleReturns[idx] ?? ""}
                  onChange={(e) => onBangleChange(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thread */}
      {threadTotal > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Thread Returned
          </p>
          <Input
            label={`Thread (grams) — issued ${threadTotal} g`}
            type="number"
            min={0}
            max={threadTotal}
            placeholder="0"
            value={threadsReturned}
            onChange={(e) => onThreadChange(e.target.value)}
          />
        </div>
      )}

      {/* Raw Materials */}
      {(order.rawMaterialsGiven?.length ?? 0) > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Tools / Raw Materials Returned
          </p>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {order.rawMaterialsGiven!.map((r) => (
              <div
                key={r.rawMaterialId}
                className="grid grid-cols-[1fr_120px] gap-2 items-center px-3 py-2"
              >
                <span className="text-sm text-slate-700">
                  {r.itemName}
                  <span className="text-slate-400"> (issued {r.qty} {r.unit ?? "units"})</span>
                </span>
                <Input
                  type="number"
                  min={0}
                  max={r.qty}
                  placeholder={`0 ${r.unit ?? ""}`.trim()}
                  value={rawReturns[r.rawMaterialId] ?? ""}
                  onChange={(e) => onRawChange(r.rawMaterialId, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root Form Component ───────────────────────────────────────────────────────
export function ReturnMaterialForm({
  isOpen,
  onClose,
  workerId,
  preSelectedOrderId,
}: ReturnMaterialFormProps) {
  const [state, setState] = useState<ReturnState>(empty);
  // Current (final) order's returns
  const [bangleReturns, setBangleReturns] = useState<Record<number, string>>({});
  const [rawReturns, setRawReturns] = useState<Record<string, string>>({});
  // Chain ancestor returns: keyed by orderId
  const [chainBangleReturns, setChainBangleReturns] = useState<Record<string, Record<number, string>>>({});
  const [chainRawReturns, setChainRawReturns] = useState<Record<string, Record<string, string>>>({});
  const [chainThreadReturns, setChainThreadReturns] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const returnMutation = useReturnWorkOrder();
  const { data: finishedProducts = [] } = useFinishedStock();

  const { data: allOrders = [] } = useWorkOrders(
    workerId ? { workerId, status: "Open" } : { status: "Open" }
  );
  // Only returnable orders: Full + Half final legs
  const openOrders = allOrders.filter(
    (o) => o.status === "Open" && !(o.assignmentType === "half" && o.allowReturn !== true)
  );

  const selectedOrderId = state.workOrderId || preSelectedOrderId || "";
  const selectedOrder = openOrders.find((o) => o._id === selectedOrderId);

  // Build ancestor chain for the selected final-leg order
  const ancestorChain = useMemo<IWorkOrder[]>(() => {
    if (
      !selectedOrder ||
      selectedOrder.assignmentType !== "half" ||
      selectedOrder.allowReturn !== true
    ) {
      return [];
    }
    const chain: IWorkOrder[] = [];
    let parentId = selectedOrder.parentWorkOrderId;
    while (parentId) {
      const parent = allOrders.find((o) => o._id === parentId);
      if (!parent) break;
      chain.unshift(parent); // oldest first
      parentId = parent.parentWorkOrderId;
    }
    return chain;
  }, [selectedOrder, allOrders]);

  const threadGivenTotal = useMemo(() => {
    if (!selectedOrder) return 0;
    const items = selectedOrder.threadItemsGiven ?? [];
    return items.length > 0 ? items.reduce((s, t) => s + t.grams, 0) : selectedOrder.threadsGiven;
  }, [selectedOrder]);

  const totalMakingRate = useMemo(() => {
    if (!selectedOrder) return 0;
    let sum = selectedOrder.perPieceRate;
    for (const ancestor of ancestorChain) {
      sum += ancestor.perPieceRate;
    }
    return sum;
  }, [selectedOrder, ancestorChain]);


  function resetOrderInputs(workOrderId: string) {
    setState({ ...empty, workOrderId });
    setBangleReturns({});
    setRawReturns({});
    setChainBangleReturns({});
    setChainRawReturns({});
    setChainThreadReturns({});
    setError("");
  }

  function handleClose() {
    setState(empty);
    setBangleReturns({});
    setRawReturns({});
    setChainBangleReturns({});
    setChainRawReturns({});
    setChainThreadReturns({});
    setError("");
    onClose();
  }

  function handleSubmit() {
    if (!selectedOrder) return;
    if (state.qualityOK > state.finishedPieces) {
      setError("Quality OK pieces cannot exceed total finished pieces");
      return;
    }

    // Build final-leg bangle returns
    const banglesReturned = (selectedOrder.banglesGiven ?? [])
      .map((g, idx) => {
        const pieces = parseFloat(bangleReturns[idx] || "0");
        if (!pieces || pieces <= 0) return null;
        const peta = g.pieces > 0 && g.cuts > 0 ? g.pieces / g.cuts : 1;
        return {
          banglesStockId: g.banglesStockId,
          size: g.size,
          cutType: g.cutType as CutType,
          cuts: Number((pieces / (peta || 1)).toFixed(2)),
          pieces,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

    // Build final-leg raw material returns
    const rawMaterialsReturned = (selectedOrder.rawMaterialsGiven ?? [])
      .map((r) => {
        const qty = parseFloat(rawReturns[r.rawMaterialId] || "0");
        if (!qty || qty <= 0) return null;
        return { rawMaterialId: r.rawMaterialId, itemName: r.itemName, qty };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Build chainReturns for ancestor legs
    const chainReturns = ancestorChain.map((ancestor) => {
      const aBangles = (ancestor.banglesGiven ?? [])
        .map((g, idx) => {
          const pieces = parseFloat(chainBangleReturns[ancestor._id]?.[idx] || "0");
          if (!pieces || pieces <= 0) return null;
          const peta = g.pieces > 0 && g.cuts > 0 ? g.pieces / g.cuts : 1;
          return {
            banglesStockId: g.banglesStockId,
            size: g.size,
            cutType: g.cutType as CutType,
            cuts: Number((pieces / (peta || 1)).toFixed(2)),
            pieces,
          };
        })
        .filter((b): b is NonNullable<typeof b> => b !== null);

      const aRaw = (ancestor.rawMaterialsGiven ?? [])
        .map((r) => {
          const qty = parseFloat(chainRawReturns[ancestor._id]?.[r.rawMaterialId] || "0");
          if (!qty || qty <= 0) return null;
          return { rawMaterialId: r.rawMaterialId, itemName: r.itemName, qty };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      return {
        orderId: ancestor._id,
        banglesReturned: aBangles,
        rawMaterialsReturned: aRaw,
        threadsReturned: parseFloat(chainThreadReturns[ancestor._id] || "0") || 0,
      };
    });

    // Finished stock
    let finishedProductId: string | undefined;
    let newFinishedProduct: { category: string; designName: string; size: string } | undefined;

    if (state.qualityOK > 0 && state.finishedMode === "existing") {
      if (!state.finishedProductId) {
        setError("Select a finished product, or switch to 'Create new'");
        return;
      }
      finishedProductId = state.finishedProductId;
    } else if (state.qualityOK > 0 && state.finishedMode === "new") {
      if (!state.newDesignName.trim() || !state.newSize.trim()) {
        setError("Enter a design name and size for the new finished product");
        return;
      }
      newFinishedProduct = {
        category: state.newCategory,
        designName: state.newDesignName.trim(),
        size: state.newSize.trim(),
      };
    }

    setError("");

    returnMutation.mutate(
      {
        id: selectedOrder._id,
        data: {
          banglesReturned,
          rawMaterialsReturned,
          threadsReturned: state.threadsReturned,
          glueReturned: 0,
          cutterReturned: 0,
          otherReturned: [],
          finishedPieces: state.finishedPieces,
          qualityOK: state.qualityOK,
          finishedProductId,
          newFinishedProduct,
          damageNotes: state.damageNotes || undefined,
          chainReturns,
        },
      },
      { onSuccess: handleClose }
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Record Material Return"
      size="lg"
      footer={
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={returnMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={returnMutation.isPending}
            disabled={!selectedOrder || state.finishedPieces === 0}
            onClick={handleSubmit}
          >
            Save Return
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Select
          label="Open Work Order"
          required
          value={selectedOrderId}
          onChange={(e) => resetOrderInputs(e.target.value)}
        >
          <option value="">Select work order...</option>
          {openOrders.map((o) => {
            const workerName = getWorkerName(o);
            const isHalfFinal = o.assignmentType === "half" && o.allowReturn === true;
            return (
              <option key={o._id} value={o._id}>
                {new Date(o.date).toLocaleDateString("en-IN")} — {o.workType}
                {workerName ? ` (${workerName})` : ""}
                {isHalfFinal ? " ⬡ Final Half" : ""}
              </option>
            );
          })}
        </Select>

        {selectedOrder && (
          <>
            {/* Half-work final leg banner */}
            {selectedOrder.assignmentType === "half" && selectedOrder.allowReturn === true && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  <p className="text-sm font-bold text-amber-800">Final Half-Work Assignment</p>
                </div>
                <p className="text-xs text-amber-700 pl-4">
                  This is the last step in a multi-worker chain ({ancestorChain.length + 1} worker{ancestorChain.length > 0 ? "s" : ""} total).
                  Enter leftover materials for <strong>each worker below</strong>. All orders will be closed together.
                </p>
              </div>
            )}

            {/* Production count */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Production Count
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Total Finished Pieces"
                  type="number"
                  required
                  min={0}
                  placeholder="Total pieces made"
                  value={state.finishedPieces || ""}
                  onChange={(e) =>
                    setState((s) => ({ ...s, finishedPieces: parseFloat(e.target.value) || 0 }))
                  }
                />
                <Input
                  label="Quality OK Pieces"
                  type="number"
                  required
                  min={0}
                  max={state.finishedPieces || undefined}
                  placeholder="Good pieces"
                  value={state.qualityOK || ""}
                  onChange={(e) => {
                    setState((s) => ({ ...s, qualityOK: parseFloat(e.target.value) || 0 }));
                    setError("");
                  }}
                />
              </div>
            </div>

            {/* Earnings breakdown card of ALL workers in the chain (ancestors + final) */}
            {state.finishedPieces > 0 && (
              <div className="space-y-3">
                {/* ── Ancestors Earnings ── */}
                {ancestorChain.map((ancestor) => (
                  <WorkerEarningsCard
                    key={ancestor._id}
                    workerName={getWorkerName(ancestor)}
                    rate={ancestor.perPieceRate}
                    finishedPieces={state.finishedPieces}
                    qualityOK={state.qualityOK}
                  />
                ))}

                {/* ── Final Worker Earnings ── */}
                <WorkerEarningsCard
                  workerName={getWorkerName(selectedOrder)}
                  rate={selectedOrder.perPieceRate}
                  finishedPieces={state.finishedPieces}
                  qualityOK={state.qualityOK}
                />
              </div>
            )}

            {/* Finished stock */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Add Finished Pieces to Stock
              </p>
              <Select
                label="What did the workers finish?"
                value={state.finishedMode}
                onChange={(e) =>
                  setState((s) => ({ ...s, finishedMode: e.target.value as FinishedMode }))
                }
              >
                <option value="new">Create new finished product</option>
                <option value="existing">Add to existing product</option>
                <option value="none">Don&apos;t add to finished stock</option>
              </Select>

              {state.finishedMode === "existing" && (
                <Select
                  label="Finished Product"
                  hint={`${state.qualityOK} OK pcs will be added to its ready stock`}
                  value={state.finishedProductId}
                  onChange={(e) => setState((s) => ({ ...s, finishedProductId: e.target.value }))}
                >
                  <option value="">Select finished product...</option>
                  {finishedProducts.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.designCode} - {p.designName} ({p.category} · {p.size})
                    </option>
                  ))}
                </Select>
              )}

              {state.finishedMode === "new" && (
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Category"
                    value={state.newCategory}
                    onChange={(e) => setState((s) => ({ ...s, newCategory: e.target.value }))}
                  >
                    {FINISHED_PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                  <Input
                    label="Size"
                    placeholder="e.g. 2.4"
                    value={state.newSize}
                    onChange={(e) => setState((s) => ({ ...s, newSize: e.target.value }))}
                  />
                  <div className="col-span-2">
                    <Input
                      label="Design Name"
                      placeholder="e.g. Red Kundan Bangle Set"
                      value={state.newDesignName}
                      onChange={(e) => setState((s) => ({ ...s, newDesignName: e.target.value }))}
                    />
                  </div>
                  <p className="col-span-2 text-[11px] text-emerald-700">
                    A new product is created with {state.qualityOK || 0} pcs ready stock.
                    Making cost defaults to ₹{totalMakingRate}/pc (sum of all workers in the chain) — edit later in Finished Stock.
                  </p>
                </div>
              )}
            </div>

            {/* ── Materials Returned (Leftover) of EVERY worker in the chain (ancestors + final) ── */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Leftover Materials / Tools Returned
              </p>

              {/* Ancestors Materials */}
              {ancestorChain.map((ancestor) => (
                <WorkerMaterialsReturnSection
                  key={ancestor._id}
                  order={ancestor}
                  isFinal={false}
                  bangleReturns={chainBangleReturns[ancestor._id] ?? {}}
                  rawReturns={chainRawReturns[ancestor._id] ?? {}}
                  threadsReturned={chainThreadReturns[ancestor._id] ?? ""}
                  onBangleChange={(idx, val) =>
                    setChainBangleReturns((prev) => ({
                      ...prev,
                      [ancestor._id]: { ...(prev[ancestor._id] ?? {}), [idx]: val },
                    }))
                  }
                  onRawChange={(id, val) =>
                    setChainRawReturns((prev) => ({
                      ...prev,
                      [ancestor._id]: { ...(prev[ancestor._id] ?? {}), [id]: val },
                    }))
                  }
                  onThreadChange={(val) =>
                    setChainThreadReturns((prev) => ({ ...prev, [ancestor._id]: val }))
                  }
                />
              ))}

              {/* Final Worker Materials */}
              <WorkerMaterialsReturnSection
                order={selectedOrder}
                isFinal={true}
                bangleReturns={bangleReturns}
                rawReturns={rawReturns}
                threadsReturned={state.threadsReturned ? String(state.threadsReturned) : ""}
                onBangleChange={(idx, val) =>
                  setBangleReturns((prev) => ({ ...prev, [idx]: val }))
                }
                onRawChange={(id, val) =>
                  setRawReturns((prev) => ({ ...prev, [id]: val }))
                }
                onThreadChange={(val) =>
                  setState((s) => ({ ...s, threadsReturned: parseFloat(val) || 0 }))
                }
              />
            </div>

            {/* Damage notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Damage Report / Notes (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Note any damage or leftover material here..."
                value={state.damageNotes}
                onChange={(e) => setState((s) => ({ ...s, damageNotes: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F] resize-none placeholder:text-slate-400"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-600 font-medium">{error}</p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
