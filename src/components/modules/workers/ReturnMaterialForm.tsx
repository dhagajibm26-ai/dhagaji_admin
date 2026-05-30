"use client";

import { useState } from "react";
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
}

interface ReturnState {
  workOrderId: string;
  banglesReturned: Array<{ cutType: CutType; cuts: number; pieces: number }>;
  threadsReturned: number;
  glueReturned: number;
  finishedPieces: number;
  qualityOK: number;
}

const empty: ReturnState = {
  workOrderId: "",
  banglesReturned: [],
  threadsReturned: 0,
  glueReturned: 0,
  finishedPieces: 0,
  qualityOK: 0,
};

export function ReturnMaterialForm({ isOpen, onClose, workerId }: ReturnMaterialFormProps) {
  const [state, setState] = useState<ReturnState>(empty);
  const [banglesReturnEntry, setBanglesReturnEntry] = useState({
    cutType: "C1" as CutType,
    cuts: "",
    pieces: "",
  });

  const returnMutation = useReturnWorkOrder();

  // Load open work orders (optionally filtered by worker)
  const { data: allOrders = [] } = useWorkOrders(
    workerId ? { workerId, status: "Open" } : { status: "Open" }
  );
  const openOrders = allOrders.filter((o) => o.status === "Open");

  const selectedOrder = openOrders.find((o) => o._id === state.workOrderId);

  // Auto-calcs
  const rejected = Math.max(0, state.finishedPieces - state.qualityOK);
  const perPieceRate = selectedOrder?.perPieceRate ?? 0;
  const amountDue = state.qualityOK * perPieceRate;

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
    returnMutation.mutate(
      {
        id: state.workOrderId,
        data: {
          banglesReturned: state.banglesReturned,
          threadsReturned: state.threadsReturned,
          glueReturned: state.glueReturned,          otherReturned: [],          finishedPieces: state.finishedPieces,
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
      title="Record Return (LENA)"
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
            label="Open Work Order"
            required
            value={state.workOrderId}
            onChange={(e) => setState((_s) => ({ ...empty, workOrderId: e.target.value }))}
          >
            <option value="">Select work order...</option>
            {openOrders.map((o) => (
              <option key={o._id} value={o._id}>
                {new Date(o.date).toLocaleDateString("en-IN")} — {o.workType}
                {typeof o.workerId === "object" &&
                  o.workerId !== null &&
                  " (" + (o.workerId as unknown as { name: string }).name + ")"}
              </option>
            ))}
          </Select>
        </div>

        {selectedOrder && (
          <>
            {/* DENA summary */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs space-y-1">
              <p className="font-semibold text-amber-800 mb-1">DENA (Given):</p>
              {selectedOrder.banglesGiven.map((b, i) => (
                <p key={i}>Bangles {b.cutType}: {b.pieces} pcs</p>
              ))}
              {selectedOrder.threadsGiven > 0 && <p>Threads: {selectedOrder.threadsGiven}g</p>}
              {selectedOrder.glueGiven > 0 && <p>Glue: {selectedOrder.glueGiven} units</p>}
            </div>

            {/* Bangles returned */}
            <div className="rounded-xl border border-slate-200 p-3 space-y-2">
              <p className="text-sm font-semibold text-slate-800">Bangles Returned</p>
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
                <Button size="sm" variant="outline" className="col-span-3" onClick={addBangleReturn}>
                  + Add Return Entry
                </Button>
              </div>
              {state.banglesReturned.map((b, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>
                    {b.cutType}: {b.pieces} pcs
                  </span>
                  <button
                    onClick={() => removeBangleReturn(i)}
                    className="text-red-500 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Threads & Glue returned */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Threads Returned (g)"
                type="number"
                min={0}
                value={state.threadsReturned || ""}
                onChange={(e) =>
                  setState((s) => ({ ...s, threadsReturned: parseFloat(e.target.value) || 0 }))
                }
              />
              <Input
                label="Glue Returned (units)"
                type="number"
                min={0}
                value={state.glueReturned || ""}
                onChange={(e) =>
                  setState((s) => ({ ...s, glueReturned: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>

            {/* Output */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Finished Pieces"
                type="number"
                required
                min={0}
                value={state.finishedPieces || ""}
                onChange={(e) =>
                  setState((s) => ({ ...s, finishedPieces: parseFloat(e.target.value) || 0 }))
                }
              />
              <Input
                label="Quality OK (pieces)"
                type="number"
                required
                min={0}
                value={state.qualityOK || ""}
                onChange={(e) =>
                  setState((s) => ({ ...s, qualityOK: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>

            {/* Auto-calc summary */}
            <div className="rounded-xl bg-slate-50 p-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Rejected</p>
                <p className="font-semibold text-[#D32F2F]">{rejected}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Rate / pc</p>
                <p className="font-semibold">₹{perPieceRate}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Amount Due</p>
                <p className="font-bold text-green-700">₹{amountDue.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
