"use client";

import { useMemo, useState } from "react";
import { useWorkOrders, useReturnWorkOrder } from "@/hooks/useWorkOrders";
import { useFinishedStock } from "@/hooks/useFinishedStock";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FINISHED_PRODUCT_CATEGORIES, type CutType } from "@/types";

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

export function ReturnMaterialForm({
  isOpen,
  onClose,
  workerId,
  preSelectedOrderId,
}: ReturnMaterialFormProps) {
  const [state, setState] = useState<ReturnState>(empty);
  // Returned pieces per issued bangle line (keyed by index in banglesGiven)
  const [bangleReturns, setBangleReturns] = useState<Record<number, string>>({});
  // Returned qty per issued raw material (keyed by rawMaterialId)
  const [rawReturns, setRawReturns] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const returnMutation = useReturnWorkOrder();
  const { data: finishedProducts = [] } = useFinishedStock();

  const { data: allOrders = [] } = useWorkOrders(
    workerId ? { workerId, status: "Open" } : { status: "Open" }
  );
  const openOrders = allOrders.filter((o) => o.status === "Open");

  const selectedOrderId = state.workOrderId || preSelectedOrderId || "";
  const selectedOrder = openOrders.find((o) => o._id === selectedOrderId);

  const threadGivenTotal = useMemo(() => {
    if (!selectedOrder) return 0;
    const items = selectedOrder.threadItemsGiven ?? [];
    return items.length > 0
      ? items.reduce((s, t) => s + t.grams, 0)
      : selectedOrder.threadsGiven;
  }, [selectedOrder]);

  // Wage calculations
  const rejected = Math.max(0, state.finishedPieces - state.qualityOK);
  const perPieceRate = selectedOrder?.perPieceRate ?? 0;
  const okEarnings = state.qualityOK * perPieceRate;
  const rejectionDeduction = rejected * perPieceRate * 0.5;
  const netEarnings = Math.max(0, okEarnings - rejectionDeduction);

  function resetOrderInputs(workOrderId: string) {
    setState({ ...empty, workOrderId });
    setBangleReturns({});
    setRawReturns({});
    setError("");
  }

  function handleClose() {
    setState(empty);
    setBangleReturns({});
    setRawReturns({});
    setError("");
    onClose();
  }

  function handleSubmit() {
    if (!selectedOrder) return;
    if (state.qualityOK > state.finishedPieces) {
      setError("Quality OK pieces cannot exceed total finished pieces");
      return;
    }

    // Build per-line bangle returns from the issued lines
    const banglesReturned = (selectedOrder.banglesGiven ?? [])
      .map((g, idx) => {
        const pieces = parseFloat(bangleReturns[idx] || "0");
        if (!pieces || pieces <= 0) return null;
        const peta = g.pieces > 0 && g.cuts > 0 ? g.pieces / g.cuts : 1;
        return {
          banglesStockId: g.banglesStockId,
          size: g.size,
          cutType: g.cutType,
          cuts: Number((pieces / (peta || 1)).toFixed(2)),
          pieces,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

    // Build per-line raw material returns
    const rawMaterialsReturned = (selectedOrder.rawMaterialsGiven ?? [])
      .map((r) => {
        const qty = parseFloat(rawReturns[r.rawMaterialId] || "0");
        if (!qty || qty <= 0) return null;
        return { rawMaterialId: r.rawMaterialId, itemName: r.itemName, qty };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Finished stock integration
    let finishedProductId: string | undefined;
    let newFinishedProduct:
      | { category: string; designName: string; size: string }
      | undefined;

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
            const workerName =
              typeof o.workerId === "object" && o.workerId !== null
                ? (o.workerId as unknown as { name: string }).name
                : "";
            return (
              <option key={o._id} value={o._id}>
                {new Date(o.date).toLocaleDateString("en-IN")} — {o.workType}
                {workerName ? ` (${workerName})` : ""}
              </option>
            );
          })}
        </Select>

        {selectedOrder && (
          <>
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
                    setState((s) => ({
                      ...s,
                      finishedPieces: parseFloat(e.target.value) || 0,
                    }))
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
                    setState((s) => ({
                      ...s,
                      qualityOK: parseFloat(e.target.value) || 0,
                    }));
                    setError("");
                  }}
                />
              </div>
            </div>

            {/* Earnings breakdown */}
            {state.finishedPieces > 0 && (
              <div className="rounded-xl border-2 border-slate-200 p-4 space-y-2 bg-slate-50">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Earnings Breakdown
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {state.qualityOK} OK pcs × ₹{perPieceRate}
                  </span>
                  <span className="font-semibold text-green-700">
                    + ₹{okEarnings.toLocaleString("en-IN")}
                  </span>
                </div>
                {rejected > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {rejected} rejected × ₹{perPieceRate} × 50% deduction
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
            )}

            {/* Add finished pieces to Finished Stock */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Add Finished Pieces to Stock
              </p>
              <Select
                label="What did the worker finish?"
                value={state.finishedMode}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    finishedMode: e.target.value as FinishedMode,
                  }))
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
                  onChange={(e) =>
                    setState((s) => ({ ...s, finishedProductId: e.target.value }))
                  }
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
                    onChange={(e) =>
                      setState((s) => ({ ...s, newCategory: e.target.value }))
                    }
                  >
                    {FINISHED_PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Size"
                    placeholder="e.g. 2.4"
                    value={state.newSize}
                    onChange={(e) =>
                      setState((s) => ({ ...s, newSize: e.target.value }))
                    }
                  />
                  <div className="col-span-2">
                    <Input
                      label="Design Name"
                      placeholder="e.g. Red Kundan Bangle Set"
                      value={state.newDesignName}
                      onChange={(e) =>
                        setState((s) => ({ ...s, newDesignName: e.target.value }))
                      }
                    />
                  </div>
                  <p className="col-span-2 text-[11px] text-emerald-700">
                    A new product is created with {state.qualityOK || 0} pcs ready
                    stock. Making cost defaults to ₹{perPieceRate}/pc — edit later
                    in Finished Stock.
                  </p>
                </div>
              )}
            </div>

            {/* Bangles returned (leftover, per issued line) */}
            {(selectedOrder.banglesGiven ?? []).length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Bangles Returned (leftover)
                </p>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {selectedOrder.banglesGiven.map((g, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_120px] gap-2 items-center px-3 py-2"
                    >
                      <span className="text-sm text-slate-700">
                        {g.size} · {g.cutType}
                        <span className="text-slate-400">
                          {" "}
                          (issued {g.pieces} pcs)
                        </span>
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={g.pieces}
                        placeholder="0 pcs"
                        value={bangleReturns[idx] ?? ""}
                        onChange={(e) =>
                          setBangleReturns((p) => ({
                            ...p,
                            [idx]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thread returned */}
            {threadGivenTotal > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Thread Returned
                </p>
                <Input
                  label={`Thread (grams) — issued ${threadGivenTotal} g`}
                  type="number"
                  min={0}
                  max={threadGivenTotal}
                  placeholder="0"
                  value={state.threadsReturned || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      threadsReturned: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            )}

            {/* Raw materials returned (per issued line) */}
            {(selectedOrder.rawMaterialsGiven ?? []).length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Tools / Raw Materials Returned
                </p>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {(selectedOrder.rawMaterialsGiven ?? []).map((r) => (
                    <div
                      key={r.rawMaterialId}
                      className="grid grid-cols-[1fr_120px] gap-2 items-center px-3 py-2"
                    >
                      <span className="text-sm text-slate-700">
                        {r.itemName}
                        <span className="text-slate-400">
                          {" "}
                          (issued {r.qty} {r.unit ?? "units"})
                        </span>
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={r.qty}
                        placeholder={`0 ${r.unit ?? ""}`.trim()}
                        value={rawReturns[r.rawMaterialId] ?? ""}
                        onChange={(e) =>
                          setRawReturns((p) => ({
                            ...p,
                            [r.rawMaterialId]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Damage / Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Damage Report / Notes (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Note any damage or leftover material here..."
                value={state.damageNotes}
                onChange={(e) =>
                  setState((s) => ({ ...s, damageNotes: e.target.value }))
                }
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
