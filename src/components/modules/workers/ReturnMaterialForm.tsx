"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkOrders, useReturnWorkOrder, useResolveRejected } from "@/hooks/useWorkOrders";
import { useFinishedStock } from "@/hooks/useFinishedStock";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { type CutType, type IWorkOrder } from "@/types";
import { formatDateDMY } from "@/lib/utils";
import { useSkuCategories } from "@/hooks/useSkuCategories";
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";

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
  /** Used only in resolve-rejected mode: how many of the rejected pieces are now OK */
  nowOK: number;
  damageNotes: string;
}

const empty: ReturnState = {
  workOrderId: "",
  finishedMode: "new",
  finishedProductId: "",
  newCategory: "",
  newDesignName: "",
  newSize: "",
  threadsReturned: 0,
  finishedPieces: 0,
  qualityOK: 0,
  nowOK: 0,
  damageNotes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWorkerName(order: IWorkOrder): string {
  if (typeof order.workerId === "object" && order.workerId && "name" in order.workerId) {
    return (order.workerId as unknown as { name?: string }).name ?? "Unknown";
  }
  return "Unknown";
}

// ─── Earnings Card ─────────────────────────────────────────────────────────────

function WorkerEarningsCard({
  workerName,
  rate,
  totalPieces,
  noDeduction,
}: {
  workerName: string;
  rate: number;
  totalPieces: number;
  noDeduction?: boolean;
}) {
  const earnings = totalPieces * rate;
  return (
    <div className="rounded-xl border-2 border-slate-200 p-4 space-y-2 bg-slate-50">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {workerName}&apos;s Earnings
      </p>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{totalPieces} pcs × ₹{rate}</span>
        <span className="font-semibold text-green-700">+ ₹{earnings.toLocaleString("en-IN")}</span>
      </div>
      {noDeduction && (
        <p className="text-[10px] text-emerald-600 font-medium">✓ No rejection deduction — all pieces resolved</p>
      )}
      <div className="flex justify-between text-sm border-t border-slate-300 pt-2">
        <span className="font-bold text-slate-800">Net Payable</span>
        <span className="font-black text-lg text-green-700">₹{earnings.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

// ─── Materials Return Section ──────────────────────────────────────────────────

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
          {workerName}&apos;s Materials {isFinal ? "(Final Worker)" : "(Previous Worker)"}
        </p>
      </div>

      {(order.banglesGiven?.length ?? 0) > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bangles Returned (leftover)</p>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {order.banglesGiven.map((g, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_120px] gap-2 items-center px-3 py-2">
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

      {threadTotal > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Thread Returned</p>
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

      {(order.rawMaterialsGiven?.length ?? 0) > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tools / Raw Materials Returned</p>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {order.rawMaterialsGiven!.map((r) => (
              <div key={r.rawMaterialId} className="grid grid-cols-[1fr_120px] gap-2 items-center px-3 py-2">
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

// ─── Stock Section Component ───────────────────────────────────────────────────

function StockSection({
  finishedProducts,
  activeSkuCategories,
  isSizeEnabled,
  totalMakingRate,
  state,
  piecesToAdd,
  setState,
}: {
  finishedProducts: { _id: string; designCode: string; designName: string; category: string; size: string }[];
  activeSkuCategories: { _id: string; name: string; isSizeFieldEnabled: boolean }[];
  isSizeEnabled: boolean;
  totalMakingRate: number;
  state: ReturnState;
  piecesToAdd: number;
  setState: React.Dispatch<React.SetStateAction<ReturnState>>;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
        Add {piecesToAdd} Piece{piecesToAdd !== 1 ? "s" : ""} to Finished Stock
      </p>
      <Select
        label="What did the workers finish?"
        value={state.finishedMode}
        onChange={(e) => setState((s) => ({ ...s, finishedMode: e.target.value as FinishedMode }))}
      >
        <option value="new">Create new finished product</option>
        <option value="existing">Add to existing product</option>
        <option value="none">Don&apos;t add to finished stock</option>
      </Select>

      {state.finishedMode === "existing" && (
        <Select
          label="Finished Product"
          hint={`${piecesToAdd} pcs will be added to its ready stock`}
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
            label="SKU"
            value={state.newCategory}
            onChange={(e) => setState((s) => ({ ...s, newCategory: e.target.value }))}
          >
            <option value="">Select SKU Category...</option>
            {activeSkuCategories.map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </Select>
          <Input
            label="Size"
            placeholder={isSizeEnabled ? "e.g. 2.4" : "Disabled for this category"}
            value={state.newSize}
            onChange={(e) => setState((s) => ({ ...s, newSize: e.target.value }))}
            disabled={!isSizeEnabled}
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
            A new product is created with {piecesToAdd} pcs ready stock.
            Making cost defaults to ₹{totalMakingRate}/pc — edit later in Finished Stock.
          </p>
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
  const [bangleReturns, setBangleReturns] = useState<Record<number, string>>({});
  const [rawReturns, setRawReturns] = useState<Record<string, string>>({});
  const [chainBangleReturns, setChainBangleReturns] = useState<Record<string, Record<number, string>>>({});
  const [chainRawReturns, setChainRawReturns] = useState<Record<string, Record<string, string>>>({});
  const [chainThreadReturns, setChainThreadReturns] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const returnMutation = useReturnWorkOrder();
  const resolveMutation = useResolveRejected();
  const { data: finishedProducts = [] } = useFinishedStock();
  const { data: skuCategories = [] } = useSkuCategories();

  const activeSkuCategories = useMemo(() => skuCategories.filter((c) => c.isActive), [skuCategories]);

  const selectedCategoryObj = useMemo(
    () => activeSkuCategories.find((c) => c.name === state.newCategory),
    [activeSkuCategories, state.newCategory]
  );
  const isSizeEnabled = selectedCategoryObj ? selectedCategoryObj.isSizeFieldEnabled : false;

  useEffect(() => {
    if (isOpen && activeSkuCategories.length > 0 && !state.newCategory) {
      setState((s) => ({ ...s, newCategory: activeSkuCategories[0].name }));
    }
  }, [isOpen, activeSkuCategories, state.newCategory]);

  useEffect(() => {
    if (state.newCategory) {
      if (!isSizeEnabled) setState((s) => ({ ...s, newSize: "—" }));
      else setState((s) => (s.newSize === "—" ? { ...s, newSize: "" } : s));
    }
  }, [isSizeEnabled, state.newCategory]);



  // Fetch all orders (Open + Rejected) — no status filter
  const { data: allOrders = [] } = useWorkOrders(workerId ? { workerId } : {});

  // Show Open (returnable) and Rejected orders in the dropdown
  const selectableOrders = useMemo(
    () =>
      allOrders.filter((o) => {
        if (o.status === "Rejected") return true;
        if (o.status !== "Open") return false;
        return !(o.assignmentType === "half" && o.allowReturn !== true);
      }),
    [allOrders]
  );

  const selectedOrderId = state.workOrderId || preSelectedOrderId || "";
  const selectedOrder = selectableOrders.find((o) => o._id === selectedOrderId);

  // Pre-populate bangle size from the selected work order
  useEffect(() => {
    if (!selectedOrder) return;
    const bangles = selectedOrder.banglesGiven ?? [];
    const firstSize = bangles.find((b) => b.size)?.size ?? "";
    if (firstSize) {
      setState((s) => ({ ...s, newSize: firstSize }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?._id]);

  // ── Mode detection ────────────────────────────────────────────────────────
  /** True when the selected order has already been returned but has rejected pieces to resolve */
  const isResolveRejectedMode = selectedOrder?.status === "Rejected";

  /** In normal return mode: true when qualityOK < finishedPieces (will "move to rejected") */
  const isMovingToRejected =
    !isResolveRejectedMode &&
    state.finishedPieces > 0 &&
    state.qualityOK >= 0 &&
    state.qualityOK < state.finishedPieces;

  // Rejected resolution data
  const totalRejected = isResolveRejectedMode
    ? Math.max(0, (selectedOrder?.finishedPieces ?? 0) - (selectedOrder?.qualityOK ?? 0))
    : 0;
  const alreadyResolved = selectedOrder?.rejectedResolved ?? 0;
  const remainingRejected = Math.max(0, totalRejected - alreadyResolved);

  // In resolve mode: total pieces to add to stock = qualityOK (from first return) + nowOK
  const resolveStockTotal = isResolveRejectedMode
    ? (selectedOrder?.qualityOK ?? 0) + state.nowOK
    : 0;

  // Ancestor chain for half-work final leg (only used in normal return mode)
  const ancestorChain = useMemo<IWorkOrder[]>(() => {
    if (!selectedOrder || selectedOrder.assignmentType !== "half" || selectedOrder.allowReturn !== true) return [];
    const chain: IWorkOrder[] = [];
    let parentId = selectedOrder.parentWorkOrderId;
    while (parentId) {
      const parent = allOrders.find((o) => o._id === parentId);
      if (!parent) break;
      chain.unshift(parent);
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
    for (const ancestor of ancestorChain) sum += ancestor.perPieceRate;
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

  // ── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!selectedOrder) return;

    // ── RESOLVE REJECTED MODE ──
    if (isResolveRejectedMode) {
      if (state.nowOK !== remainingRejected) {
        setError(
          `You must resolve ALL ${remainingRejected} rejected piece(s) at once to complete this order. You entered ${state.nowOK}.`
        );
        return;
      }

      // Stock validation
      if (state.finishedMode === "existing" && !state.finishedProductId) {
        setError("Select a finished product, or switch to 'Create new'");
        return;
      }
      if (state.finishedMode === "new") {
        if (!state.newDesignName.trim() || !state.newSize.trim()) {
          setError("Enter a design name and size for the new finished product");
          return;
        }
      }

      const finishedProductId =
        state.finishedMode === "existing" ? state.finishedProductId : undefined;
      const newFinishedProduct =
        state.finishedMode === "new"
          ? {
              category: state.newCategory,
              designName: state.newDesignName.trim(),
              size: state.newSize.trim(),
            }
          : undefined;

      setError("");
      resolveMutation.mutate(
        {
          id: selectedOrder._id,
          data: {
            nowOK: state.nowOK,
            finishedProductId,
            newFinishedProduct,
            notes: state.damageNotes || undefined,
          },
        },
        { onSuccess: handleClose }
      );
      return;
    }

    // ── NORMAL RETURN MODE ──
    if (state.qualityOK > state.finishedPieces) {
      setError("Quality OK pieces cannot exceed total finished pieces");
      return;
    }

    // Build bangle returns
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

    // Build raw material returns
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

    // If moving to rejected: skip stock section entirely
    let finishedProductId: string | undefined;
    let newFinishedProduct: { category: string; designName: string; size: string } | undefined;

    if (!isMovingToRejected) {
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

  const isPending = returnMutation.isPending || resolveMutation.isPending;

  // ── Button label ───────────────────────────────────────────────────────────
  const submitLabel = isResolveRejectedMode
    ? "Resolve & Complete"
    : isMovingToRejected
    ? "Move to Rejected"
    : "Save Return";

  const isSubmitDisabled = isResolveRejectedMode
    ? !selectedOrder
    : !selectedOrder || state.finishedPieces === 0;

  // ── Modal title ────────────────────────────────────────────────────────────
  const modalTitle = isResolveRejectedMode
    ? "Finish Rejected Pieces"
    : "Record Material Return";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size="lg"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isPending}
            disabled={isSubmitDisabled}
            onClick={handleSubmit}
            className={
              isMovingToRejected
                ? "!bg-rose-600 hover:!bg-rose-700"
                : isResolveRejectedMode
                ? "!bg-emerald-600 hover:!bg-emerald-700"
                : ""
            }
          >
            {isResolveRejectedMode && <RotateCcw size={13} className="mr-1.5" />}
            {isMovingToRejected && <AlertTriangle size={13} className="mr-1.5" />}
            {!isResolveRejectedMode && !isMovingToRejected && <CheckCircle2 size={13} className="mr-1.5" />}
            {submitLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Order selection dropdown */}
        <Select
          label="Work Order"
          required
          value={selectedOrderId}
          onChange={(e) => resetOrderInputs(e.target.value)}
        >
          <option value="">Select work order...</option>
          {selectableOrders.map((o) => {
            const workerName = getWorkerName(o);
            const isHalfFinal = o.assignmentType === "half" && o.allowReturn === true;
            const isRejected = o.status === "Rejected";
            return (
              <option key={o._id} value={o._id}>
                {formatDateDMY(o.date)} — {o.workType}
                {workerName ? ` (${workerName})` : ""}
                {isRejected ? ` 🔴 Rejected (${Math.max(0, o.finishedPieces - o.qualityOK - (o.rejectedResolved ?? 0))} pcs pending)` : ""}
                {isHalfFinal && !isRejected ? " ⬡ Final Half" : ""}
              </option>
            );
          })}
        </Select>

        {/* ══════════════════════════════════════════════════════════════════
            RESOLVE REJECTED MODE
        ══════════════════════════════════════════════════════════════════ */}
        {selectedOrder && isResolveRejectedMode && (
          <>
            {/* Rejected banner */}
            <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                <p className="text-sm font-bold text-rose-800">Resolving Rejected Work Order</p>
              </div>
              <p className="text-xs text-rose-700 pl-5">
                Worker: <strong>{getWorkerName(selectedOrder)}</strong> · Work: <strong>{selectedOrder.workType}</strong>
              </p>
            </div>

            {/* Read-only summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Finished</p>
                <p className="text-2xl font-black text-slate-800">{selectedOrder.finishedPieces}</p>
                <p className="text-[10px] text-slate-400">pieces</p>
              </div>
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">Quality OK</p>
                <p className="text-2xl font-black text-emerald-700">{selectedOrder.qualityOK}</p>
                <p className="text-[10px] text-emerald-500">from first return</p>
              </div>
              <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1">Rejected</p>
                <p className="text-2xl font-black text-rose-700">{remainingRejected}</p>
                <p className="text-[10px] text-rose-400">need resolution</p>
              </div>
            </div>

            {/* nowOK input */}
            <div>
              <Input
                label={`Pieces Now OK from Rejected (must be exactly ${remainingRejected})`}
                type="number"
                required
                min={1}
                max={remainingRejected}
                placeholder={`Enter ${remainingRejected}`}
                value={state.nowOK || ""}
                onChange={(e) => {
                  setState((s) => ({ ...s, nowOK: parseFloat(e.target.value) || 0 }));
                  setError("");
                }}
              />
              {/* Must-resolve-all warning */}
              {state.nowOK > 0 && state.nowOK < remainingRejected && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>You must resolve ALL {remainingRejected} rejected piece(s)</strong> at once.
                    Partial resolution is not allowed — enter exactly {remainingRejected}.
                  </span>
                </div>
              )}
            </div>

            {/* Earnings preview */}
            {state.nowOK === remainingRejected && state.nowOK > 0 && (
              <WorkerEarningsCard
                workerName={getWorkerName(selectedOrder)}
                rate={selectedOrder.perPieceRate}
                totalPieces={resolveStockTotal}
                noDeduction
              />
            )}

            {/* Stock section — always visible in resolve mode */}
            {state.nowOK === remainingRejected && state.nowOK > 0 && (
              <StockSection
                finishedProducts={finishedProducts}
                activeSkuCategories={activeSkuCategories}
                isSizeEnabled={isSizeEnabled}
                totalMakingRate={selectedOrder.perPieceRate}
                state={state}
                piecesToAdd={resolveStockTotal}
                setState={setState}
              />
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Rework Notes (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Notes about the rework..."
                value={state.damageNotes}
                onChange={(e) => setState((s) => ({ ...s, damageNotes: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F] resize-none placeholder:text-slate-400"
              />
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            NORMAL RETURN / MOVE-TO-REJECTED MODE
        ══════════════════════════════════════════════════════════════════ */}
        {selectedOrder && !isResolveRejectedMode && (
          <>
            {/* Half-work final leg banner */}
            {selectedOrder.assignmentType === "half" && selectedOrder.allowReturn === true && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  <p className="text-sm font-bold text-amber-800">Final Half-Work Assignment</p>
                </div>
                <p className="text-xs text-amber-700 pl-4">
                  This is the last step in a multi-worker chain ({ancestorChain.length + 1} worker
                  {ancestorChain.length > 0 ? "s" : ""} total). Enter leftover materials for{" "}
                  <strong>each worker below</strong>. All orders will be closed together.
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

            {/* Move-to-Rejected warning (replaces stock section) */}
            {isMovingToRejected && (
              <div className="flex gap-2 rounded-xl border-2 border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-800">
                    {state.finishedPieces - state.qualityOK} piece(s) will be Rejected
                  </p>
                  <p className="text-xs">
                    This order will be saved as <strong>Rejected</strong>.
                    No stock will be added now. You will resolve the rejected pieces later
                    using the <strong>"Finish Rejected"</strong> button on the workflow page.
                    Earnings will be credited in full once all pieces are resolved.
                  </p>
                </div>
              </div>
            )}

            {/* Earnings preview (for normal / all-ok return) */}
            {!isMovingToRejected && state.finishedPieces > 0 && (
              <div className="space-y-3">
                {ancestorChain.map((ancestor) => (
                  <WorkerEarningsCard
                    key={ancestor._id}
                    workerName={getWorkerName(ancestor)}
                    rate={ancestor.perPieceRate}
                    totalPieces={state.qualityOK}
                  />
                ))}
                <WorkerEarningsCard
                  workerName={getWorkerName(selectedOrder)}
                  rate={selectedOrder.perPieceRate}
                  totalPieces={state.qualityOK}
                />
              </div>
            )}

            {/* Stock section — hidden when moving to rejected */}
            {!isMovingToRejected && (
              <StockSection
                finishedProducts={finishedProducts}
                activeSkuCategories={activeSkuCategories}
                isSizeEnabled={isSizeEnabled}
                totalMakingRate={totalMakingRate}
                state={state}
                piecesToAdd={state.qualityOK}
                setState={setState}
              />
            )}

            {/* Materials returned — shown in all normal return modes */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Leftover Materials / Tools Returned
              </p>

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

              <WorkerMaterialsReturnSection
                order={selectedOrder}
                isFinal={true}
                bangleReturns={bangleReturns}
                rawReturns={rawReturns}
                threadsReturned={state.threadsReturned ? String(state.threadsReturned) : ""}
                onBangleChange={(idx, val) => setBangleReturns((prev) => ({ ...prev, [idx]: val }))}
                onRawChange={(id, val) => setRawReturns((prev) => ({ ...prev, [id]: val }))}
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
          </>
        )}

        {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
      </div>
    </Modal>
  );
}
