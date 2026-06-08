"use client";

import { useState } from "react";
import { useWorkOrders, useReturnWorkOrder } from "@/hooks/useWorkOrders";
import { useFinishedStock } from "@/hooks/useFinishedStock";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CutType } from "@/types";

interface ReturnMaterialFormProps {
  isOpen: boolean;
  onClose: () => void;
  workerId?: string;
  preSelectedOrderId?: string;
}

interface ReturnState {
  workOrderId: string;
  finishedProductId: string;
  banglesReturned: Array<{ cutType: CutType; cuts: number; pieces: number }>;
  threadsReturned: number;
  glueReturned: number;
  cutterReturned: number;
  finishedPieces: number;
  qualityOK: number;
  damageNotes: string;
}

const empty: ReturnState = {
  workOrderId: "",
  finishedProductId: "",
  banglesReturned: [],
  threadsReturned: 0,
  glueReturned: 0,
  cutterReturned: 0,
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
  const [banglesReturnEntry, setBanglesReturnEntry] = useState({
    cutType: "C1" as CutType,
    cuts: "",
    pieces: "",
  });
  const [qualityError, setQualityError] = useState("");

  const returnMutation = useReturnWorkOrder();
  const { data: finishedProducts = [] } = useFinishedStock();

  const { data: allOrders = [] } = useWorkOrders(
    workerId ? { workerId, status: "Open" } : { status: "Open" }
  );
  const openOrders = allOrders.filter((o) => o.status === "Open");

  const selectedOrderId = state.workOrderId || preSelectedOrderId || "";
  const selectedOrder = openOrders.find((o) => o._id === selectedOrderId);

  // Derive dynamic units from the selected order's raw materials
  const glueUnit =
    selectedOrder?.rawMaterialsGiven?.find((r) => r.kind === "glue")?.unit ?? "units";
  const cutterUnit =
    selectedOrder?.rawMaterialsGiven?.find((r) => r.kind === "cutter")?.unit ?? "pcs";

  // Wage calculations
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
    setState((s) => ({
      ...s,
      banglesReturned: s.banglesReturned.filter((_, idx) => idx !== i),
    }));
  }

  function handleClose() {
    setState(empty);
    setQualityError("");
    onClose();
  }

  function handleSubmit() {
    if (!selectedOrderId) return;
    if (state.qualityOK > state.finishedPieces) {
      setQualityError("Quality OK pieces cannot exceed total finished pieces");
      return;
    }
    setQualityError("");

    const otherReturned: Array<{ name: string; qty: number }> = [];
    if (state.cutterReturned > 0) {
      otherReturned.push({ name: "Cutter", qty: state.cutterReturned });
    }

    returnMutation.mutate(
      {
        id: selectedOrderId,
        data: {
          banglesReturned: state.banglesReturned,
          threadsReturned: state.threadsReturned,
          glueReturned: state.glueReturned,
          cutterReturned: state.cutterReturned,
          otherReturned,
          finishedPieces: state.finishedPieces,
          qualityOK: state.qualityOK,
          finishedProductId: state.finishedProductId || undefined,
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
            disabled={!selectedOrderId || state.finishedPieces === 0}
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

        {selectedOrder && (
          <>
            {/* Issued materials summary */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs space-y-1">
              <p className="font-bold text-amber-800 mb-1.5">Materials Issued to Worker:</p>
              {selectedOrder.banglesGiven.map((b, i) => (
                <div key={i} className="flex justify-between text-amber-700">
                  <span>Bangles {b.cutType}:</span>
                  <span className="font-semibold">{b.pieces} pcs</span>
                </div>
              ))}
              {selectedOrder.threadsGiven > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Thread:</span>
                  <span className="font-semibold">{selectedOrder.threadsGiven} g</span>
                </div>
              )}
              {selectedOrder.glueGiven > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Glue:</span>
                  <span className="font-semibold">{selectedOrder.glueGiven} {glueUnit}</span>
                </div>
              )}
              {(selectedOrder.cutterGiven ?? 0) > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Cutter:</span>
                  <span className="font-semibold">{selectedOrder.cutterGiven} {cutterUnit}</span>
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
                <div className="space-y-1">
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
                      setQualityError("");
                    }}
                  />
                  {qualityError && (
                    <p className="text-xs text-rose-600 font-medium">{qualityError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Link to finished product */}
            <Select
              label="Finished Product (optional)"
              hint="Quality OK pieces will be added to this product's ready stock"
              value={state.finishedProductId}
              onChange={(e) =>
                setState((s) => ({ ...s, finishedProductId: e.target.value }))
              }
            >
              <option value="">Select finished product...</option>
              {finishedProducts.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.designCode} - {p.designName} ({p.size})
                </option>
              ))}
            </Select>

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

            {/* Bangles returned */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Bangles Returned
              </p>
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={banglesReturnEntry.cutType}
                    onChange={(e) =>
                      setBanglesReturnEntry((p) => ({
                        ...p,
                        cutType: e.target.value as CutType,
                      }))
                    }
                  >
                    {(["C1", "C2", "C4", "C6"] as CutType[]).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
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
                      <div
                        key={i}
                        className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-1.5 border border-slate-100"
                      >
                        <span className="text-slate-700">
                          {b.cutType}: {b.cuts} cuts / {b.pieces} pcs
                        </span>
                        <button
                          onClick={() => removeBangleReturn(i)}
                          className="text-rose-400 hover:text-rose-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Other materials returned — only show if they were issued */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Other Materials Returned
              </p>
              <div className="grid grid-cols-3 gap-3">
                {selectedOrder.threadsGiven > 0 && (
                  <Input
                    label="Thread (grams)"
                    type="number"
                    min={0}
                    max={selectedOrder.threadsGiven}
                    placeholder="0"
                    value={state.threadsReturned || ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        threadsReturned: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                )}
                {selectedOrder.glueGiven > 0 && (
                  <Input
                    label={`Glue (${glueUnit})`}
                    type="number"
                    min={0}
                    max={selectedOrder.glueGiven}
                    placeholder="0"
                    value={state.glueReturned || ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        glueReturned: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                )}
                {(selectedOrder.cutterGiven ?? 0) > 0 && (
                  <Input
                    label={`Cutter (${cutterUnit})`}
                    type="number"
                    min={0}
                    max={selectedOrder.cutterGiven ?? undefined}
                    placeholder="0"
                    value={state.cutterReturned || ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        cutterReturned: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                )}
              </div>
            </div>

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
          </>
        )}
      </div>
    </Modal>
  );
}
