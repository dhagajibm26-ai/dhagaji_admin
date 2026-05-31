"use client";

import { useState, useEffect } from "react";
import { useWorkOrders, useReturnWorkOrder } from "@/hooks/useWorkOrders";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { IWorkOrder, CutType } from "@/types";

interface ReturnMaterialFormProps {
  isOpen: boolean;
  onClose: () => void;
  workerId?: string;
  /** Pre-select a specific open order */
  preSelectedOrderId?: string;
}

interface ReturnState {
  workOrderId: string;
  banglesReturned: Array<{ cutType: CutType; cuts: number; pieces: number }>;
  threadsReturned: number;
  glueReturned: number;
  scissorsReturned: number;
  finishedPieces: number;
  qualityOK: number;
  damageNotes: string;
}

const empty: ReturnState = {
  workOrderId: "",
  banglesReturned: [],
  threadsReturned: 0,
  glueReturned: 0,
  scissorsReturned: 0,
  finishedPieces: 0,
  qualityOK: 0,
  damageNotes: "",
};

export function ReturnMaterialForm({ isOpen, onClose, workerId, preSelectedOrderId }: ReturnMaterialFormProps) {
  const [state, setState] = useState<ReturnState>(empty);
  const [banglesReturnEntry, setBanglesReturnEntry] = useState({
    cutType: "C1" as CutType,
    cuts: "",
    pieces: "",
  });

  const returnMutation = useReturnWorkOrder();

  const { data: allOrders = [] } = useWorkOrders(
    workerId ? { workerId, status: "Open" } : { status: "Open" }
  );
  const openOrders = allOrders.filter((o) => o.status === "Open");

  // Auto-select pre-selected order when modal opens
  useEffect(() => {
    if (isOpen && preSelectedOrderId) {
      setState((s) => ({ ...empty, workOrderId: preSelectedOrderId }));
    }
  }, [isOpen, preSelectedOrderId]);

  const selectedOrder = openOrders.find((o) => o._id === state.workOrderId);

  // ── Calculations ──────────────────────────────────────────────────────────
  const rejected = Math.max(0, state.finishedPieces - state.qualityOK);
  const perPieceRate = selectedOrder?.perPieceRate ?? 0;
  const okEarnings = state.qualityOK * perPieceRate;
  const rejectionDeduction = rejected * perPieceRate * 0.5;
  const netEarnings = Math.max(0, okEarnings - rejectionDeduction);

  function addBangleReturn() {
    if (!banglesReturnEntry.cuts || !banglesReturnEntry.pieces) return;
    setState((s) => ({
      ...s,
      banglesReturned: [
        ...s.banglesReturned,
        {
          cutType: banglesReturnEntry.cutType,
          cuts: parseFloat(banglesReturnEntry.cuts),
          pieces: parseFloat(banglesReturnEntry.pieces),
        },
      ],
    }));
    setBanglesReturnEntry((p) => ({ ...p, cuts: "", pieces: "" }));
  }

  function removeBangleReturn(i: number) {
    setState((s) => ({ ...s, banglesReturned: s.banglesReturned.filter((_, idx) => idx !== i) }));
  }

  function handleClose() {
    setState(empty);
    onClose();
  }

  function handleSubmit() {
    if (!state.workOrderId) return;

    // Build otherReturned list (scissors if any)
    const otherReturned: Array<{ name: string; qty: number }> = [];
    if (state.scissorsReturned > 0) {
      otherReturned.push({ name: "Scissors", qty: state.scissorsReturned });
    }

    returnMutation.mutate(
      {
        id: state.workOrderId,
        data: {
          banglesReturned: state.banglesReturned,
          threadsReturned: state.threadsReturned,
          glueReturned: state.glueReturned,
          otherReturned,
          finishedPieces: state.finishedPieces,
          qualityOK: state.qualityOK,
        },
      },
      { onSuccess: handleClose }
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="📦 Maal Wapas Lena (Return)"
      size="lg"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={returnMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={returnMutation.isPending}
            disabled={!state.workOrderId || state.finishedPieces === 0}
            onClick={handleSubmit}
          >
            Save Return
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Select work order */}
        <div>
          <Select
            label="Open Work Order (Pending Issue)"
            required
            value={state.workOrderId}
            onChange={(e) => setState({ ...empty, workOrderId: e.target.value })}
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
        </div>

        {selectedOrder && (
          <>
            {/* DENA summary */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs space-y-1">
              <p className="font-bold text-amber-800 mb-1.5">✅ Diya tha (Issued materials):</p>
              {selectedOrder.banglesGiven.map((b, i) => (
                <div key={i} className="flex justify-between text-amber-700">
                  <span>Bangles {b.cutType}:</span>
                  <span className="font-semibold">{b.pieces} pieces</span>
                </div>
              ))}
              {selectedOrder.threadsGiven > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Thread:</span>
                  <span className="font-semibold">{selectedOrder.threadsGiven}g</span>
                </div>
              )}
              {selectedOrder.glueGiven > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Glue:</span>
                  <span className="font-semibold">{selectedOrder.glueGiven} units</span>
                </div>
              )}
              {selectedOrder.otherMaterialGiven.map((m, i) => (
                <div key={i} className="flex justify-between text-amber-700">
                  <span>{m.name}:</span>
                  <span className="font-semibold">{m.qty}</span>
                </div>
              ))}
              <div className="flex justify-between text-amber-700 border-t border-amber-200 pt-1 mt-1">
                <span>Rate per piece:</span>
                <span className="font-bold">₹{selectedOrder.perPieceRate}</span>
              </div>
            </div>

            {/* Output — Finished Pieces */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                🔢 Production Count
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Total Finished Pieces"
                  type="number"
                  required
                  min={0}
                  placeholder="Total banaye"
                  value={state.finishedPieces || ""}
                  onChange={(e) =>
                    setState((s) => ({ ...s, finishedPieces: parseFloat(e.target.value) || 0 }))
                  }
                />
                <Input
                  label="Quality OK Pieces (Achhe)"
                  type="number"
                  required
                  min={0}
                  placeholder="Sahi nikle"
                  value={state.qualityOK || ""}
                  onChange={(e) =>
                    setState((s) => ({ ...s, qualityOK: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            {/* Earnings Breakdown */}
            {state.finishedPieces > 0 && (
              <div className="rounded-xl border-2 border-slate-200 p-4 space-y-2 bg-slate-50">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  💰 Kamai ka Hisaab (Earnings Breakdown)
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">OK Pieces × ₹{perPieceRate}</span>
                  <span className="font-semibold text-green-700">+ ₹{okEarnings.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Rejected {rejected} pcs × ₹{perPieceRate} × 50%</span>
                  <span className="font-semibold text-rose-600">− ₹{rejectionDeduction.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-300 pt-2 mt-1">
                  <span className="font-bold text-slate-800">Net Payable (Net Kamai)</span>
                  <span className="font-black text-lg text-green-700">₹{netEarnings.toLocaleString("en-IN")}</span>
                </div>
                {rejected > 0 && (
                  <p className="text-[11px] text-rose-500 mt-1">
                    ⚠️ {rejected} rejected pieces → 50% deduction applied
                  </p>
                )}
              </div>
            )}

            {/* Bangles returned */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                🔙 Bangles Wapas (Returned)
              </p>
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={banglesReturnEntry.cutType}
                    onChange={(e) =>
                      setBanglesReturnEntry((p) => ({ ...p, cutType: e.target.value as CutType }))
                    }
                  >
                    {["C1", "C2", "C4", "C6"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    placeholder="Cuts"
                    value={banglesReturnEntry.cuts}
                    min={0}
                    onChange={(e) =>
                      setBanglesReturnEntry((p) => ({ ...p, cuts: e.target.value }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Pieces"
                    value={banglesReturnEntry.pieces}
                    min={0}
                    onChange={(e) =>
                      setBanglesReturnEntry((p) => ({ ...p, pieces: e.target.value }))
                    }
                  />
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={addBangleReturn}>
                  + Add Bangle Return
                </Button>
                {state.banglesReturned.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {state.banglesReturned.map((b, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-1.5 border border-slate-100">
                        <span className="text-slate-700">
                          {b.cutType}: {b.cuts} cuts / {b.pieces} pieces
                        </span>
                        <button onClick={() => removeBangleReturn(i)} className="text-rose-400 hover:text-rose-600 text-xs font-bold">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Threads, Glue, Scissors returned */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                🧵 Other Materials Wapas
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Thread (grams)"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={state.threadsReturned || ""}
                  onChange={(e) =>
                    setState((s) => ({ ...s, threadsReturned: parseFloat(e.target.value) || 0 }))
                  }
                />
                <Input
                  label="Glue (units)"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={state.glueReturned || ""}
                  onChange={(e) =>
                    setState((s) => ({ ...s, glueReturned: parseFloat(e.target.value) || 0 }))
                  }
                />
                <Input
                  label="Scissors (pcs)"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={state.scissorsReturned || ""}
                  onChange={(e) =>
                    setState((s) => ({ ...s, scissorsReturned: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            {/* Damage / Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                📝 Damage Report / Notes (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Koi nuksan ho toh yahan likho..."
                value={state.damageNotes}
                onChange={(e) => setState((s) => ({ ...s, damageNotes: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F] resize-none placeholder:text-slate-400"
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

