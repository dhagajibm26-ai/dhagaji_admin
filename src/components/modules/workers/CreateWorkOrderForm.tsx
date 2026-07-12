"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkers } from "@/hooks/useWorkers";
import { useBanglesStock } from "@/hooks/useBangles";
import { useThreadsStock } from "@/hooks/useThreads";
import { useRawMaterials } from "@/hooks/useRawMaterial";
import { useCreateWorkOrder, useWorkOrders } from "@/hooks/useWorkOrders";
import {
  useWorkOrderStep,
  useWorkOrderWorkerId,
  useWorkOrderWorkerName,
  useWorkOrderDate,
  useWorkOrderWorkType,
  useWorkOrderPerPieceRate,
  useWorkOrderDenaItems,
  useWorkOrderAssignmentType,
  useWorkOrderParentId,
  useWorkOrderParentDetails,
  useWorkOrderAllowReturn,
  useWorkOrderActions,
  type DenaItem,
  type BangleDenaItem,
  type ThreadDenaItem,
  type GlueDenaItem,
  type CutterDenaItem,
  type RawMatDenaItem,
} from "@/stores/useWorkOrderStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CutType, WorkOrderCreateInput, IWorkOrder } from "@/types";
import { formatDateDMY } from "@/lib/utils";

interface CreateWorkOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedWorkerId?: string;
  preSelectedWorkerName?: string;
  /** Pre-configure as Half Work continuation from this parent order */
  preSelectedParentOrder?: IWorkOrder;
}

// ─── Assignment Type Picker ────────────────────────────────────────────────────

function AssignmentTypePicker() {
  const assignmentType = useWorkOrderAssignmentType();
  const { setAssignmentType } = useWorkOrderActions();

  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Assignment Type</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setAssignmentType("full")}
          className={`relative rounded-xl border-2 p-3 text-left transition-all ${assignmentType === "full"
              ? "border-indigo-500 bg-indigo-50 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
            }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${assignmentType === "full" ? "border-indigo-500" : "border-slate-300"
                }`}
            >
              {assignmentType === "full" && (
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              )}
            </span>
            <span className={`text-sm font-bold ${assignmentType === "full" ? "text-indigo-700" : "text-slate-700"}`}>
              Full Work
            </span>
          </div>
          <p className="text-xs text-slate-500 pl-5">Single worker completes the entire product</p>
          {assignmentType === "full" && (
            <span className="absolute top-2 right-2 text-[10px] font-bold text-indigo-500 bg-indigo-100 rounded-full px-1.5 py-0.5">CLASSIC</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setAssignmentType("half")}
          className={`relative rounded-xl border-2 p-3 text-left transition-all ${assignmentType === "half"
              ? "border-amber-500 bg-amber-50 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
            }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${assignmentType === "half" ? "border-amber-500" : "border-slate-300"
                }`}
            >
              {assignmentType === "half" && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </span>
            <span className={`text-sm font-bold ${assignmentType === "half" ? "text-amber-700" : "text-slate-700"}`}>
              Half Work
            </span>
          </div>
          <p className="text-xs text-slate-500 pl-5">Multiple workers collaborate sequentially</p>
          {assignmentType === "half" && (
            <span className="absolute top-2 right-2 text-[10px] font-bold text-amber-600 bg-amber-100 rounded-full px-1.5 py-0.5">CHAIN</span>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Half Work Parent Selector ─────────────────────────────────────────────────

function HalfWorkParentSelector({ locked }: { locked: boolean }) {
  const parentDetails = useWorkOrderParentDetails();
  const { setParentWorkOrder } = useWorkOrderActions();
  const { data: allOrders = [] } = useWorkOrders();

  // Only Open half-work orders where allowReturn is false AND not already continued
  const eligibleParents = useMemo(
    () => {
      const continuedIds = new Set(
        allOrders
          .map((o) => o.parentWorkOrderId)
          .filter((id): id is string => !!id)
      );

      return allOrders.filter(
        (o) =>
          o.status === "Open" &&
          o.assignmentType === "half" &&
          o.allowReturn === false &&
          !continuedIds.has(o._id)
      );
    },
    [allOrders]
  );

  function getWorkerName(order: IWorkOrder): string {
    if (typeof order.workerId === "object" && order.workerId && "name" in (order.workerId as object)) {
      return (order.workerId as unknown as { name?: string }).name ?? "Unknown";
    }
    return "Unknown";
  }

  if (locked && parentDetails) {
    return (
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Continuing From</p>
        <p className="text-sm font-semibold text-slate-800">
          {parentDetails.workType}
        </p>
        <p className="text-xs text-slate-500">
          Worker: {getWorkerName(parentDetails)} · Rate: Rs {parentDetails.perPieceRate}
        </p>
        <p className="text-[10px] text-amber-600 font-medium">🔒 Product details are locked from the original assignment</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select
        label="Continue From Existing Half Work (optional)"
        value={parentDetails?._id ?? ""}
        onChange={(e) => {
          const order = eligibleParents.find((o) => o._id === e.target.value) ?? null;
          setParentWorkOrder(order);
        }}
      >
        <option value="">— Select previous half-work order —</option>
        {eligibleParents.length === 0 && (
          <option value="" disabled>No in-progress half-work orders found</option>
        )}
        {eligibleParents.map((o) => (
          <option key={o._id} value={o._id}>
            {o.workType} · {getWorkerName(o)} · {formatDateDMY(o.date)}
          </option>
        ))}
      </Select>
    </div>
  );
}

// ─── Step 1 ────────────────────────────────────────────────────────────────────

function Step1({ onNext, lockedParent }: { onNext: () => void; lockedParent: boolean }) {
  const { setWorkerId, setDate, setWorkType, setPerPieceRate } = useWorkOrderActions();
  const workerId = useWorkOrderWorkerId();
  const date = useWorkOrderDate();
  const workType = useWorkOrderWorkType();
  const perPieceRate = useWorkOrderPerPieceRate();
  const assignmentType = useWorkOrderAssignmentType();
  const parentDetails = useWorkOrderParentDetails();
  const { data: workers = [] } = useWorkers();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!workerId) e.workerId = "Select a worker";
    if (!date) e.date = "Date is required";
    if (!workType.trim()) e.workType = "Work type is required";
    if (perPieceRate <= 0) e.perPieceRate = "Rate must be > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const isWorkTypeLocked = assignmentType === "half" && !!parentDetails;

  return (
    <div className="space-y-4">
      <AssignmentTypePicker />

      {assignmentType === "half" && (
        <HalfWorkParentSelector locked={lockedParent} />
      )}

      <Select
        label="Worker"
        required
        error={errors.workerId}
        value={workerId ?? ""}
        onChange={(e) => {
          const sel = workers.find((w) => w._id === e.target.value);
          if (sel) setWorkerId(sel._id, sel.name);
        }}
      >
        <option value="">Select worker...</option>
        {workers
          .filter((w) => w.isActive)
          .map((w) => (
            <option key={w._id} value={w._id}>
              {w.name}
            </option>
          ))}
      </Select>

      <Input
        label="Date"
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={errors.date}
      />

      <div className="relative">
        <Input
          label="Work Type"
          required
          placeholder="e.g. Bangles threading, Bead work"
          value={workType}
          onChange={(e) => setWorkType(e.target.value)}
          error={errors.workType}
          disabled={isWorkTypeLocked}
        />
        {isWorkTypeLocked && (
          <span className="absolute right-3 top-9 text-[10px] font-bold text-amber-600 bg-amber-100 rounded px-1.5 py-0.5">LOCKED</span>
        )}
      </div>

      <Input
        label="Per Piece Rate (Rs)"
        type="number"
        required
        min={0}
        step={0.5}
        value={perPieceRate || ""}
        onChange={(e) => setPerPieceRate(parseFloat(e.target.value) || 0)}
        error={errors.perPieceRate}
      />

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          onClick={() => {
            if (validate()) onNext();
          }}
        >
          Next: Materials
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2 ────────────────────────────────────────────────────────────────────

function Step2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { addDenaItem, removeDenaItem } = useWorkOrderActions();
  const denaItems = useWorkOrderDenaItems();
  const { data: bangles = [] } = useBanglesStock();
  const { data: threads = [] } = useThreadsStock();
  const { data: rawMaterials = [] } = useRawMaterials();

  const [selectedSize, setSelectedSize] = useState("");
  const [banglePiecesByCut, setBanglePiecesByCut] = useState<Record<CutType, string>>({
    C1: "",
    C2: "",
    C4: "",
    C6: "",
  });
  const [threadRows, setThreadRows] = useState<Array<{ threadStockId: string; grams: string }>>([
    { threadStockId: "", grams: "" },
  ]);
  const [rawMatRows, setRawMatRows] = useState<Array<{ rawMaterialId: string; units: string }>>([
    { rawMaterialId: "", units: "" },
  ]);

  const banglesBySize = useMemo(() => {
    const grouped = new Map<string, Record<CutType, (typeof bangles)[number] | undefined>>();
    for (const item of bangles) {
      if (!grouped.has(item.size)) {
        grouped.set(item.size, { C1: undefined, C2: undefined, C4: undefined, C6: undefined });
      }
      grouped.get(item.size)![item.cutType] = item;
    }
    return grouped;
  }, [bangles]);

  function addBanglesForSelectedSize() {
    if (!selectedSize) return;
    const sizeMap = banglesBySize.get(selectedSize);
    if (!sizeMap) return;

    let added = 0;
    for (const cutType of ["C1", "C2", "C4", "C6"] as CutType[]) {
      const pieces = parseFloat(banglePiecesByCut[cutType] || "0");
      if (!pieces || pieces <= 0) continue;

      const stock = sizeMap[cutType];
      if (!stock) continue;

      const peta = stock.peta || 1;
      const item: BangleDenaItem = {
        type: "bangle",
        banglesStockId: stock._id,
        size: stock.size,
        cutType,
        cuts: Number((pieces / peta).toFixed(2)),
        pieces,
      };
      addDenaItem(item);
      added += 1;
    }

    if (added > 0) {
      setBanglePiecesByCut({ C1: "", C2: "", C4: "", C6: "" });
    }
  }

  function addAllThreadRows() {
    let added = 0;
    for (const row of threadRows) {
      const stock = threads.find((t) => t._id === row.threadStockId);
      const grams = parseFloat(row.grams || "0");
      if (!stock || !grams || grams <= 0) continue;

      const item: ThreadDenaItem = {
        type: "thread",
        threadStockId: stock._id,
        threadCode: stock.threadCode,
        threadColour: stock.threadColour,
        grams,
      };
      addDenaItem(item);
      added += 1;
    }

    if (added > 0) {
      setThreadRows([{ threadStockId: "", grams: "" }]);
    }
  }

  function determineRawKind(catStr: string, nameStr: string): string {
    const cat = catStr.toLowerCase();
    const name = nameStr.toLowerCase();
    if (cat.includes("glue") || name.includes("glue")) return "glue";
    if (cat.includes("cutter") || name.includes("cutter")) return "cutter";
    return cat.trim() || "other";
  }

  function addAllRawMatRows() {
    let added = 0;
    for (const row of rawMatRows) {
      const material = rawMaterials.find((m) => m._id === row.rawMaterialId);
      const units = parseFloat(row.units || "0");
      if (!material || !units || units <= 0) continue;
      addDenaItem({
        type: "rawmat",
        rawMaterialId: material._id,
        itemName: material.itemName,
        units,
        unit: material.unit,
        kind: determineRawKind(material.category ?? "", material.itemName ?? ""),
      } as RawMatDenaItem);
      added++;
    }
    if (added > 0) setRawMatRows([{ rawMaterialId: "", units: "" }]);
  }

  const sortedRawMaterials = useMemo(() => {
    return [...rawMaterials]
      .filter((m) => {
        const cat = (m.category ?? "").toLowerCase();
        const name = (m.itemName ?? "").toLowerCase();
        // Exclude bangle-type items — those are managed in the Bangles section
        return !cat.includes("bangle") && !name.includes("bangle");
      })
      .sort((a, b) => {
        const catCmp = (a.category ?? "").localeCompare(b.category ?? "");
        if (catCmp !== 0) return catCmp;
        if (a.closingStock > 0 && b.closingStock <= 0) return -1;
        if (a.closingStock <= 0 && b.closingStock > 0) return 1;
        return a.itemName.localeCompare(b.itemName);
      });
  }, [rawMaterials]);

  // Group raw materials by category for <optgroup>
  const rawMatByCategory = useMemo(() => {
    const map = new Map<string, typeof rawMaterials>();
    for (const m of sortedRawMaterials) {
      const cat = m.category ?? "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m);
    }
    return map;
  }, [sortedRawMaterials]);

  function unitLabel(unit: string): string {
    const map: Record<string, string> = {
      gram: "Gram (g)",
      pcs: "Pieces (pcs)",
      tube: "Tube",
      box: "Box",
      meter: "Meter (m)",
    };
    return map[unit] ?? unit;
  }

  const hasBanglePieces = (["C1", "C2", "C4", "C6"] as CutType[]).some(
    (c) => parseFloat(banglePiecesByCut[c] || "0") > 0
  );

  const bangleQueued = denaItems.filter((d) => d.type === "bangle");
  const threadQueued = denaItems.filter((d) => d.type === "thread");
  const toolQueued = denaItems.filter(
    (d) => d.type === "rawmat" || d.type === "glue" || d.type === "cutter"
  );

  const [previewError, setPreviewError] = useState("");

  /** Flush all locally-filled rows into denaItems, then proceed to preview */
  function flushAndNext() {
    setPreviewError("");
    const toAdd: DenaItem[] = [];

    // ── Bangles ───────────────────────────────────────────────
    if (selectedSize) {
      const sizeMap = banglesBySize.get(selectedSize);
      if (sizeMap) {
        for (const cutType of ["C1", "C2", "C4", "C6"] as CutType[]) {
          const pieces = parseFloat(banglePiecesByCut[cutType] || "0");
          if (!pieces || pieces <= 0) continue;
          const stock = sizeMap[cutType];
          if (!stock || stock.closingStock <= 0) continue;
          toAdd.push({
            type: "bangle",
            banglesStockId: stock._id,
            size: stock.size,
            cutType,
            cuts: Number((pieces / (stock.peta || 1)).toFixed(2)),
            pieces,
          } as BangleDenaItem);
        }
      }
    }

    // ── Threads ───────────────────────────────────────────────
    for (const row of threadRows) {
      const stock = threads.find((t) => t._id === row.threadStockId);
      const grams = parseFloat(row.grams || "0");
      if (!stock || !grams || grams <= 0) continue;
      toAdd.push({
        type: "thread",
        threadStockId: stock._id,
        threadCode: stock.threadCode,
        threadColour: stock.threadColour,
        grams,
      } as ThreadDenaItem);
    }

    // ── Raw Materials ─────────────────────────────────────────
    for (const row of rawMatRows) {
      const material = rawMaterials.find((m) => m._id === row.rawMaterialId);
      const units = parseFloat(row.units || "0");
      if (!material || !units || units <= 0) continue;
      toAdd.push({
        type: "rawmat",
        rawMaterialId: material._id,
        itemName: material.itemName,
        units,
        unit: material.unit,
        kind: determineRawKind(material.category ?? "", material.itemName ?? ""),
      } as RawMatDenaItem);
    }

    // Push pending items into the store
    for (const item of toAdd) addDenaItem(item);

    // Clear local rows that were flushed
    if (toAdd.some((i) => i.type === "bangle")) {
      setBanglePiecesByCut({ C1: "", C2: "", C4: "", C6: "" });
      setSelectedSize("");
    }
    if (toAdd.some((i) => i.type === "thread")) setThreadRows([{ threadStockId: "", grams: "" }]);
    if (toAdd.some((i) => i.type === "rawmat")) setRawMatRows([{ rawMaterialId: "", units: "" }]);

    const total = denaItems.length + toAdd.length;
    if (total === 0) {
      setPreviewError("Kam se kam ek material zaroor add karo (Bangles, Thread, ya Tools)");
      return;
    }
    onNext();
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Step 2: Materials to Issue to Worker</p>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
          <p className="text-sm font-bold text-slate-800">Bangles</p>
          {bangleQueued.length > 0 && (
            <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              {bangleQueued.length} size{bangleQueued.length > 1 ? "s" : ""} added
            </span>
          )}
        </div>

        <Select
          label="Select Size"
          value={selectedSize}
          onChange={(e) => {
            setSelectedSize(e.target.value);
            setBanglePiecesByCut({ C1: "", C2: "", C4: "", C6: "" });
          }}
        >
          <option value="">— Select bangle size —</option>
          {[...banglesBySize.keys()]
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
        </Select>

        {selectedSize && (
          <div className="rounded-lg border border-indigo-100 bg-white divide-y divide-slate-100">
            {(["C1", "C2", "C4", "C6"] as CutType[]).map((cutType) => {
              const stock = banglesBySize.get(selectedSize)?.[cutType];
              const available = stock?.closingStock ?? 0;
              return (
                <div key={cutType} className="grid grid-cols-[60px_1fr_100px] gap-2 items-center px-3 py-2.5">
                  <span className="text-sm font-bold text-slate-700">{cutType}</span>
                  <Input
                    type="number"
                    min={0}
                    max={available || undefined}
                    placeholder={available > 0 ? `0–${available} pcs` : "No stock"}
                    value={banglePiecesByCut[cutType]}
                    disabled={available <= 0}
                    onChange={(e) =>
                      setBanglePiecesByCut((prev) => ({ ...prev, [cutType]: e.target.value }))
                    }
                  />
                  <p className={`text-xs text-right font-semibold ${available <= 0 ? "text-rose-400" : "text-emerald-600"}`}>
                    {available > 0 ? `${available.toLocaleString("en-IN")} pcs` : "Out of stock"}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Commit this size to the order so another size can be added */}
        {selectedSize && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              addBanglesForSelectedSize();
              setSelectedSize("");
            }}
            disabled={!hasBanglePieces}
            className="w-full text-indigo-600"
          >
            + Add this size &amp; pick another
          </Button>
        )}

        {bangleQueued.length > 0 && (
          <div className="space-y-1">
            {denaItems.map((item, i) =>
              item.type !== "bangle" ? null : (
                <div key={i} className="flex items-center justify-between rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-sm">
                  <span className="font-medium text-indigo-800">
                    {item.size} · {item.cutType} — {item.pieces} pcs
                  </span>
                  <button type="button" onClick={() => removeDenaItem(i)} className="text-rose-400 hover:text-rose-600 font-bold text-xs ml-2">✕</button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-teal-100 bg-teal-50/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
          <p className="text-sm font-bold text-slate-800">Threads</p>
          <span className="text-xs text-slate-400">(optional)</span>
          {threadQueued.length > 0 && (
            <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
              {threadQueued.length} added
            </span>
          )}
        </div>

        {threadRows.map((row, idx) => {
          const selThread = threads.find((t) => t._id === row.threadStockId);
          return (
            <div key={idx} className="space-y-2">
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <Select
                  label={idx === 0 ? "Thread (Code · Colour)" : undefined}
                  value={row.threadStockId}
                  onChange={(e) => {
                    const next = [...threadRows];
                    next[idx] = { ...next[idx], threadStockId: e.target.value, grams: "" };
                    setThreadRows(next);
                  }}
                >
                  <option value="">— Select thread —</option>
                  {threads.map((t) => (
                    <option key={t._id} value={t._id} disabled={t.closingStock <= 0}>
                      {t.threadCode} · {t.threadColour}
                      {t.closingStock <= 0 ? " (Out of stock)" : ` — Stock: ${t.closingStock}g`}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => setThreadRows((r) => r.length > 1 ? r.filter((_, i) => i !== idx) : [{ threadStockId: "", grams: "" }])}
                  className="h-11 w-9 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"
                >
                  ✕
                </button>
              </div>

              {selThread && (
                <div className="flex items-end gap-3 pl-1">
                  <div className="flex-1">
                    <Input
                      label="Quantity in Gram (g)"
                      type="number"
                      min={0}
                      max={selThread.closingStock}
                      step={0.5}
                      placeholder={`0 – max ${selThread.closingStock}g`}
                      value={row.grams}
                      onChange={(e) => {
                        const next = [...threadRows];
                        next[idx] = { ...next[idx], grams: e.target.value };
                        setThreadRows(next);
                      }}
                    />
                  </div>
                  <div className="mb-0.5 shrink-0 rounded-lg bg-white border border-teal-200 px-3 py-2 text-center min-w-[80px]">
                    <p className="text-[10px] text-slate-400 leading-none mb-0.5">Available</p>
                    <p className={`text-sm font-bold ${selThread.closingStock <= 50 ? "text-rose-600" : "text-emerald-600"}`}>
                      {selThread.closingStock}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-none">gram</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setThreadRows((r) => [...r, { threadStockId: "", grams: "" }])}
          className="text-teal-600"
        >
          + Add Another Thread
        </Button>

        {threadQueued.length > 0 && (
          <div className="space-y-1">
            {denaItems.map((item, i) =>
              item.type !== "thread" ? null : (
                <div key={i} className="flex items-center justify-between rounded-lg bg-teal-50 border border-teal-100 px-3 py-2 text-sm">
                  <span className="font-medium text-teal-800">
                    {item.threadCode} · {item.threadColour} — {item.grams}g
                  </span>
                  <button type="button" onClick={() => removeDenaItem(i)} className="text-rose-400 hover:text-rose-600 font-bold text-xs ml-2">✕</button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── RAW MATERIALS ─────────────────────────────── */}
      <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
          <p className="text-sm font-bold text-slate-800">Raw Materials</p>
          <span className="text-xs text-slate-400">(Glue, Cutter, and other materials)</span>
          {toolQueued.length > 0 && (
            <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
              {toolQueued.length} added
            </span>
          )}
        </div>

        {rawMatRows.map((row, idx) => {
          const sel = rawMaterials.find((m) => m._id === row.rawMaterialId);
          const qtyLabel = sel ? `Qty in ${unitLabel(sel.unit)}` : "Quantity";
          return (
            <div key={idx} className="space-y-2">
              {/* Material dropdown + remove button */}
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <Select
                  label={idx === 0 ? "Material Name & Category" : undefined}
                  value={row.rawMaterialId}
                  onChange={(e) => {
                    const next = [...rawMatRows];
                    next[idx] = { ...next[idx], rawMaterialId: e.target.value, units: "" };
                    setRawMatRows(next);
                  }}
                >
                  <option value="">— Select from stock —</option>
                  {[...rawMatByCategory.entries()].map(([cat, items]) => (
                    <optgroup key={cat} label={`── ${cat} ──`}>
                      {items.map((m) => (
                        <option
                          key={m._id}
                          value={m._id}
                          disabled={m.closingStock <= 0}
                        >
                          {m.itemName}
                          {m.closingStock <= 0
                            ? " (Out of stock)"
                            : ` · Stock: ${m.closingStock} ${m.unit}`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() =>
                    setRawMatRows((r) =>
                      r.length > 1 ? r.filter((_, i) => i !== idx) : [{ rawMaterialId: "", units: "" }]
                    )
                  }
                  className="h-11 w-9 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Quantity input — shown only after selecting a material */}
              {sel && (
                <div className="flex items-end gap-3 pl-1">
                  <div className="flex-1">
                    <Input
                      label={qtyLabel}
                      type="number"
                      min={0}
                      max={sel.closingStock}
                      step={sel.unit === "gram" ? 0.5 : 1}
                      placeholder={`0 – max ${sel.closingStock} ${sel.unit}`}
                      value={row.units}
                      onChange={(e) => {
                        const next = [...rawMatRows];
                        next[idx] = { ...next[idx], units: e.target.value };
                        setRawMatRows(next);
                      }}
                    />
                  </div>
                  {/* Live stock badge */}
                  <div className="mb-0.5 shrink-0 rounded-lg bg-white border border-orange-200 px-3 py-2 text-center min-w-[80px]">
                    <p className="text-[10px] text-slate-400 leading-none mb-0.5">Available</p>
                    <p className={`text-sm font-bold ${sel.closingStock <= sel.lowStockThreshold ? "text-rose-600" : "text-emerald-600"}`}>
                      {sel.closingStock}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-none">{sel.unit}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRawMatRows((r) => [...r, { rawMaterialId: "", units: "" }])}
          >
            + Add Row
          </Button>
          <Button size="sm" variant="outline" onClick={addAllRawMatRows}>
            ✓ Confirm Materials
          </Button>
        </div>

        {toolQueued.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Confirmed:</p>
            {denaItems.map((item, i) =>
              item.type !== "rawmat" && item.type !== "glue" && item.type !== "cutter" ? null : (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white border border-orange-100 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">
                    {item.type === "rawmat"
                      ? `${(item as RawMatDenaItem).itemName} — ${(item as RawMatDenaItem).units} ${(item as RawMatDenaItem).unit ?? "units"}`
                      : `${item.itemName} — ${item.units} ${item.unit ?? "units"}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDenaItem(i)}
                    className="text-rose-400 hover:text-rose-600 font-bold text-xs ml-3"
                  >
                    ✕
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {denaItems.length > 0 && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Issue Summary ({denaItems.length} item{denaItems.length > 1 ? "s" : ""}):
          </p>
          {denaItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-md bg-white border border-slate-100 px-3 py-2 text-sm">
              <span className="text-slate-700">
                {item.type === "bangle" && `Bangles ${item.size} ${item.cutType} \u2014 ${item.pieces} pcs`}
                {item.type === "thread" && `Thread: ${item.threadCode} (${item.threadColour}) \u2014 ${item.grams} g`}
                {item.type === "glue" && `Glue: ${item.itemName} \u2014 ${item.units} ${item.unit ?? "units"}`}
                {item.type === "cutter" && `Cutter: ${item.itemName} \u2014 ${item.units} ${item.unit ?? "pcs"}`}
                {item.type === "rawmat" && `${(item as RawMatDenaItem).itemName} \u2014 ${(item as RawMatDenaItem).units} ${(item as RawMatDenaItem).unit ?? "units"}`}
              </span>
              <button
                type="button"
                onClick={() => removeDenaItem(i)}
                className="text-rose-400 hover:text-rose-600 text-xs font-bold ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        {previewError && (
          <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 text-center">
            ⚠ {previewError}
          </p>
        )}
        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button variant="primary" onClick={flushAndNext}>
            Preview &amp; Confirm →
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 ────────────────────────────────────────────────────────────────────

function Step3({
  onBack,
  onSubmit,
  isPending,
}: {
  onBack: () => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const workerName = useWorkOrderWorkerName();
  const date = useWorkOrderDate();
  const workType = useWorkOrderWorkType();
  const perPieceRate = useWorkOrderPerPieceRate();
  const denaItems = useWorkOrderDenaItems();
  const assignmentType = useWorkOrderAssignmentType();
  const allowReturn = useWorkOrderAllowReturn();
  const parentDetails = useWorkOrderParentDetails();
  const { setAllowReturn } = useWorkOrderActions();

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  async function handleSendDigitalCopy() {
    setIsPdfGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();  // 210 mm
      const pageH = doc.internal.pageSize.getHeight(); // 297 mm

      // ── 1. Load letterhead template as full-page background ──────────────
      const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = "/work-order-bg.jpg";
      });
      const bgCanvas = document.createElement("canvas");
      bgCanvas.width = bgImg.naturalWidth;
      bgCanvas.height = bgImg.naturalHeight;
      bgCanvas.getContext("2d")!.drawImage(bgImg, 0, 0);
      const bgDataUrl = bgCanvas.toDataURL("image/jpeg", 0.9);

      // Place template as FULL A4 page background
      doc.addImage(bgDataUrl, "JPEG", 0, 0, pageW, pageH);

      // Content area: sits between template header (~52 mm) and footer (~22 mm from bottom)
      // The white zone of the template starts at ~52 mm and ends at ~275 mm
      const contentTop = 52;   // mm from top — below green header
      const contentBot = 275;  // mm from top — above green footer bar
      const marginX = 14;
      const contentW = pageW - marginX * 2;

      // ── 2. Info grid (2-column card) ──────────────────────────────────────
      const cardY = contentTop + 6;
      const rowH  = 10;                    // height per info row
      const infoRows = Math.ceil(4 / 2);   // 4 fields → 2 rows
      const cardH = infoRows * rowH + 8;
      const col1X = marginX + 4;
      const col2X = pageW / 2 + 6;

      const fields: [string, string][] = [
        ["Worker Name", workerName],
        ["Date", new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
        ["Work Type", workType],
        ["Rate per Piece", `Rs. ${perPieceRate}`],
      ];

      // Card background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, cardY, contentW, cardH, 3, 3, "FD");

      fields.forEach(([label, value], i) => {
        const cx = i % 2 === 0 ? col1X : col2X;
        const cy = cardY + 5 + Math.floor(i / 2) * rowH;
        doc.setTextColor(120, 130, 145);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text(label.toUpperCase(), cx, cy);
        doc.setTextColor(20, 30, 48);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(value, cx, cy + 4.5);
      });

      // ── 3. Materials table — always within single page ───────────────────
      const tableStartY = cardY + cardH + 6;
      const tableEndY   = contentBot - 8;           // use space up to near footer
      const tableH      = tableEndY - tableStartY;  // total px available

      const nItems      = Math.max(1, denaItems.length);
      const headerH_mm  = 9;                        // fixed header row height
      const bodyH       = tableH - headerH_mm;
      // Compute per-row vertical padding so all rows fit; min 1.5mm, max 4mm
      const vPad = Math.min(4, Math.max(1.5, (bodyH / nItems - 8) / 2));
      const fontSize = vPad > 2.5 ? 8 : 7;

      const materialRows = denaItems.map((item) => {
        let desc = "", qty = "";
        if (item.type === "bangle")       { desc = `Bangle Stock — Size: ${item.size}, Cut: ${item.cutType}`; qty = `${item.pieces} pcs`; }
        else if (item.type === "thread")  { desc = `Thread — ${item.threadCode} (${item.threadColour})`; qty = `${item.grams} g`; }
        else if (item.type === "glue")    { desc = `Glue — ${item.itemName}`; qty = `${item.units} ${item.unit ?? "units"}`; }
        else if (item.type === "cutter")  { desc = `Cutter — ${item.itemName}`; qty = `${item.units} ${item.unit ?? "pcs"}`; }
        else if (item.type === "rawmat")  { desc = (item as RawMatDenaItem).itemName; qty = `${(item as RawMatDenaItem).units} ${(item as RawMatDenaItem).unit ?? "units"}`; }
        return [desc, qty];
      });

      autoTable(doc, {
        head: [["Material Description", "Quantity"]],
        body: materialRows,
        startY: tableStartY,
        margin: { left: marginX, right: marginX },
        tableWidth: contentW,
        theme: "striped",
        // Disable all page-break behaviour — content MUST stay on this page
        pageBreak: "avoid",
        rowPageBreak: "avoid",
        showHead: "firstPage",
        headStyles: {
          fillColor: [30, 70, 32],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: "bold",
          halign: "left",
          minCellHeight: headerH_mm,
          cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
        },
        bodyStyles: {
          fontSize,
          textColor: [51, 65, 85],
          fillColor: [255, 255, 255],
          cellPadding: { top: vPad, bottom: vPad, left: 5, right: 5 },
          minCellHeight: 0,
        },
        alternateRowStyles: { fillColor: [247, 248, 250] },
        columnStyles: { 1: { halign: "right", fontStyle: "bold", cellWidth: 35 } },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.2, overflow: "ellipsize" },
      });

      // ── 4. Share / download ───────────────────────────────────────────────
      const fileName = `Work-Order-${workerName.replace(/\s+/g, "-")}-${new Date(date).toISOString().slice(0, 10)}.pdf`;
      const pdfBlob = doc.output("blob");
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (typeof navigator.share === "function" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Work Order – ${workerName}`,
          text: `Dhagaji Creation Work Order for ${workerName} dated ${new Date(date).toLocaleDateString("en-IN")}`,
          files: [file],
        });
      } else {
        // Desktop: download the PDF, then open WhatsApp Web with a summary message
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        // Open WhatsApp Web after a short delay so download isn't blocked by popup
        setTimeout(() => {
          window.open("https://web.whatsapp.com/send", "_blank");
        }, 700);
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsPdfGenerating(false);
    }
  }

  function handlePrintCopies() {
    const printWindow = window.open("", "_blank", "width=860,height=900");
    if (!printWindow) return;

    const getMaterialRows = () => {
      return denaItems.map((item) => {
        let desc = "", qty = "";
        if (item.type === "bangle")       { desc = `Bangle Stock — Size: ${item.size}, Cut: ${item.cutType}`; qty = `${item.pieces} pcs`; }
        else if (item.type === "thread")  { desc = `Thread — ${item.threadCode} (${item.threadColour})`; qty = `${item.grams} g`; }
        else if (item.type === "glue")    { desc = `Glue — ${item.itemName}`; qty = `${item.units} ${item.unit ?? "units"}`; }
        else if (item.type === "cutter")  { desc = `Cutter — ${item.itemName}`; qty = `${item.units} ${item.unit ?? "pcs"}`; }
        else                              { desc = `${(item as RawMatDenaItem).itemName}`; qty = `${(item as RawMatDenaItem).units} ${(item as RawMatDenaItem).unit ?? "units"}`; }
        return `
          <tr>
            <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:13px;">${desc}</td>
            <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;color:#1e4620;font-weight:700;font-size:13px;text-align:right;">${qty}</td>
          </tr>`;
      }).join("");
    };

    const dateStr = new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    const renderPage = () => `
      <div class="page-wrap">
        <!-- Full letterhead background -->
        <img src="/work-order-bg.jpg" class="letterhead-bg" alt="" />

        <!-- Content overlay — sits in the white zone of the template -->
        <div class="content-zone">

          <!-- Info card -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;background:#fff;border:1px solid #dde3ec;border-radius:10px;overflow:hidden;margin-bottom:22px;">
            <div style="padding:12px 18px;border-right:1px solid #dde3ec;border-bottom:1px solid #dde3ec;">
              <p style="margin:0 0 3px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;">Worker Name</p>
              <p style="margin:0;font-size:15px;font-weight:800;color:#0f172a;">${workerName}</p>
            </div>
            <div style="padding:12px 18px;border-bottom:1px solid #dde3ec;">
              <p style="margin:0 0 3px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;">Date</p>
              <p style="margin:0;font-size:15px;font-weight:800;color:#0f172a;">${dateStr}</p>
            </div>
            <div style="padding:12px 18px;border-right:1px solid #dde3ec;border-bottom:1px solid #dde3ec;">
              <p style="margin:0 0 3px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;">Assignment Type</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#334155;">${assignmentType === "half" ? "Half Work Assignment" : "Full Work Assignment"}</p>
            </div>
            <div style="padding:12px 18px;border-bottom:1px solid #dde3ec;">
              <p style="margin:0 0 3px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;">Work Type</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#334155;">${workType}</p>
            </div>
            <div style="padding:12px 18px;grid-column:1/-1;">
              <p style="margin:0 0 3px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;">Rate per Piece</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#1e4620;">Rs. ${perPieceRate}</p>
            </div>
          </div>

          <!-- Materials table -->
          <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #dde3ec;">
            <thead>
              <tr style="background:#1e4620;">
                <th style="padding:10px 14px;text-align:left;color:#d4af37;font-size:12px;font-weight:700;letter-spacing:0.5px;">Material Description</th>
                <th style="padding:10px 14px;text-align:right;color:#d4af37;font-size:12px;font-weight:700;width:130px;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${getMaterialRows()}
            </tbody>
          </table>

        </div><!-- /content-zone -->
      </div><!-- /page-wrap -->
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Work Order \u2014 Dhagaji Creation</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

            /* Tell the browser: one A4 page, zero margins */
            @page {
              size: A4 portrait;
              margin: 0;
            }

            body {
              font-family: 'Plus Jakarta Sans', Arial, sans-serif;
              background: #e8ecf0;
            }

            /*
             * page-wrap is EXACTLY one A4 page.
             * overflow: hidden ensures nothing bleeds past the green footer.
             * The template image fills this box completely.
             */
            .page-wrap {
              position: relative;
              width: 210mm;
              height: 297mm;          /* exact A4 — never taller */
              overflow: hidden;       /* clip anything that overflows */
              background: #fff;
              /* Screen-only shadow for preview */
              box-shadow: 0 4px 32px rgba(0,0,0,0.18);
              margin: 20px auto;
            }

            /* Letterhead fills the entire A4 box */
            .letterhead-bg {
              position: absolute;
              inset: 0;
              width: 210mm;
              height: 297mm;
              display: block;
              object-fit: fill;
            }

            /*
             * Content zone sits inside the template's white area.
             * Template green header  ≈ top 18.5%  of A4 = ~55mm
             * Template green footer  ≈ bottom 8%  of A4 = ~24mm
             * Horizontal margin matches PDF (14mm each side).
             */
            .content-zone {
              position: relative;
              z-index: 2;
              padding-top: 56mm;
              padding-bottom: 26mm;
              padding-left: 14mm;
              padding-right: 14mm;
              /* Constrain height so inner content can never push the footer down */
              height: 297mm;
            }

            @media print {
              body        { background: #fff; }
              .page-wrap  { box-shadow: none; margin: 0; }
            }
          </style>
        </head>
        <body>
          ${renderPage()}
          <script>
            // Ensure the letterhead image is fully loaded before print dialog
            var img = document.querySelector('.letterhead-bg');
            function doPrint() { setTimeout(function() { window.print(); }, 300); }
            if (img && img.complete) {
              doPrint();
            } else if (img) {
              img.addEventListener('load', doPrint);
              img.addEventListener('error', doPrint);
            } else {
              doPrint();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Step 3: Preview and Confirm</p>

      {/* Assignment type badge */}
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${assignmentType === "half"
          ? "bg-amber-100 text-amber-700"
          : "bg-indigo-100 text-indigo-700"
        }`}>
        <span className={`h-2 w-2 rounded-full ${assignmentType === "half" ? "bg-amber-500" : "bg-indigo-500"}`} />
        {assignmentType === "half" ? "Half Work Assignment" : "Full Work Assignment"}
        {assignmentType === "half" && parentDetails && (
          <span className="text-amber-500">· Continuing from {parentDetails.workType}</span>
        )}
      </div>

      <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Worker</span>
          <span className="font-medium">{workerName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Date</span>
          <span className="font-medium">{formatDateDMY(date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Work Type</span>
          <span className="font-medium">{workType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Per Piece Rate</span>
          <span className="font-medium">Rs {perPieceRate}</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Materials Being Issued:</p>
        <div className="space-y-1">
          {denaItems.map((item, i) => (
            <div key={i} className="text-sm rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
              {item.type === "bangle" && `Bangles: ${item.size} ${item.cutType} — ${item.pieces} pcs`}
              {item.type === "thread" && `Thread: ${item.threadCode} (${item.threadColour}) — ${item.grams} g`}
              {item.type === "glue" && `Glue: ${item.itemName} — ${item.units} ${item.unit ?? "units"}`}
              {item.type === "cutter" && `Cutter: ${item.itemName} — ${item.units} ${item.unit ?? "pcs"}`}
              {item.type === "rawmat" && `${(item as RawMatDenaItem).itemName} — ${(item as RawMatDenaItem).units} ${(item as RawMatDenaItem).unit ?? "units"}`}
            </div>
          ))}
        </div>
      </div>

      {/* ── Allow Return toggle (half work only) ───────────────────── */}
      {assignmentType === "half" && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Allow Return After This Assignment</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {allowReturn
                  ? "ON — This is the final step. Return will be enabled after this worker finishes."
                  : "OFF — More workers will continue this work. Return is disabled."}
              </p>
            </div>
            {/* Toggle button */}
            <button
              type="button"
              onClick={() => setAllowReturn(!allowReturn)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 mt-0.5 ${allowReturn ? "bg-emerald-500" : "bg-slate-300"
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${allowReturn ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>

          {allowReturn ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-xs font-semibold text-emerald-700">
                ✓ Final Assignment — Return will be enabled after this worker completes
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-300 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <p className="text-xs font-semibold text-amber-700">
                ⏳ In Progress — Another worker will continue this work later
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handlePrintCopies}>
          Print Office + Worker Copy
        </Button>
        <Button variant="outline" onClick={handleSendDigitalCopy} isLoading={isPdfGenerating}>
          {isPdfGenerating ? "Generating PDF…" : "Send Digital Copy (PDF)"}
        </Button>
      </div>

      <p className="text-xs text-amber-700 bg-amber-50 rounded-md p-2">
        Confirming will deduct the above materials from stock.
        {assignmentType === "half" && !allowReturn && " Return will be disabled until the final assignment."}
      </p>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button variant="primary" isLoading={isPending} onClick={onSubmit}>
          Confirm and Create Order
        </Button>
      </div>
    </div>
  );
}

// ─── Root Form Component ───────────────────────────────────────────────────────

export function CreateWorkOrderForm({
  isOpen,
  onClose,
  preSelectedWorkerId,
  preSelectedWorkerName,
  preSelectedParentOrder,
}: CreateWorkOrderFormProps) {
  const step = useWorkOrderStep();
  const workerId = useWorkOrderWorkerId();
  const date = useWorkOrderDate();
  const workType = useWorkOrderWorkType();
  const perPieceRate = useWorkOrderPerPieceRate();
  const denaItems = useWorkOrderDenaItems();
  const assignmentType = useWorkOrderAssignmentType();
  const parentWorkOrderId = useWorkOrderParentId();
  const allowReturn = useWorkOrderAllowReturn();
  const { nextStep, prevStep, reset, setWorkerId, setAssignmentType, setParentWorkOrder } = useWorkOrderActions();
  const createOrder = useCreateWorkOrder();

  // Track whether parent was injected externally (locks the selector)
  const [lockedParent, setLockedParent] = useState(false);

  useEffect(() => {
    if (isOpen && preSelectedWorkerId && preSelectedWorkerName) {
      setWorkerId(preSelectedWorkerId, preSelectedWorkerName);
    }
  }, [isOpen, preSelectedWorkerId, preSelectedWorkerName, setWorkerId]);

  useEffect(() => {
    if (isOpen && preSelectedParentOrder) {
      setAssignmentType("half");
      setParentWorkOrder(preSelectedParentOrder);
      setLockedParent(true);
    } else {
      setLockedParent(false);
    }
  }, [isOpen, preSelectedParentOrder, setAssignmentType, setParentWorkOrder]);

  function handleClose() {
    reset();
    setLockedParent(false);
    onClose();
  }

  function handleSubmit() {
    if (!workerId) return;

    const banglesGiven = denaItems
      .filter((d): d is BangleDenaItem => d.type === "bangle")
      .map((d) => ({
        banglesStockId: d.banglesStockId,
        size: d.size,
        cutType: d.cutType,
        cuts: d.cuts,
        pieces: d.pieces,
      }));

    const threadItems = denaItems.filter((d): d is ThreadDenaItem => d.type === "thread");
    const rawMatItems = denaItems.filter((d): d is RawMatDenaItem => d.type === "rawmat");
    const legacyGlueItems = denaItems.filter((d): d is GlueDenaItem => d.type === "glue");
    const legacyCutterItems = denaItems.filter((d): d is CutterDenaItem => d.type === "cutter");

    const totalThreads = threadItems.reduce((s, d) => s + d.grams, 0);
    const totalGlue =
      rawMatItems.filter((d) => d.kind === "glue").reduce((s, d) => s + d.units, 0) +
      legacyGlueItems.reduce((s, d) => s + d.units, 0);
    const totalCutter =
      rawMatItems.filter((d) => d.kind === "cutter").reduce((s, d) => s + d.units, 0) +
      legacyCutterItems.reduce((s, d) => s + d.units, 0);

    const payload: WorkOrderCreateInput = {
      workerId,
      date,
      workType,
      perPieceRate,
      assignmentType,
      parentWorkOrderId: parentWorkOrderId ?? undefined,
      allowReturn,
      banglesGiven,
      threadItemsGiven: threadItems.map((t) => ({
        threadStockId: t.threadStockId,
        threadCode: t.threadCode,
        threadColour: t.threadColour,
        grams: t.grams,
      })),
      threadsGiven: totalThreads,
      threadStockId: threadItems[0]?.threadStockId,
      rawMaterialsGiven: [
        ...legacyGlueItems.map((g) => ({
          rawMaterialId: g.rawMaterialId,
          itemName: g.itemName,
          qty: g.units,
          kind: "glue",
          unit: g.unit,
        })),
        ...legacyCutterItems.map((c) => ({
          rawMaterialId: c.rawMaterialId,
          itemName: c.itemName,
          qty: c.units,
          kind: "cutter",
          unit: c.unit,
        })),
        ...rawMatItems.map((r) => ({
          rawMaterialId: r.rawMaterialId,
          itemName: r.itemName,
          qty: r.units,
          kind: r.kind,
          unit: r.unit,
        })),
      ],
      glueGiven: totalGlue,
      cutterGiven: totalCutter,
      glueStockId:
        rawMatItems.find((d) => d.kind === "glue")?.rawMaterialId ??
        legacyGlueItems[0]?.rawMaterialId,
      otherMaterialGiven: [],
    };

    createOrder.mutate(payload, { onSuccess: handleClose });
  }

  const stepTitle =
    step === 1 ? "Step 1: Worker and Details" : step === 2 ? "Step 2: Materials (DENA)" : "Step 3: Preview";

  const modalTitle = assignmentType === "half"
    ? `Half Work Assignment — ${stepTitle}`
    : `Full Work Assignment — ${stepTitle}`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="lg">
      {step === 1 && <Step1 onNext={nextStep} lockedParent={lockedParent} />}
      {step === 2 && <Step2 onNext={nextStep} onBack={prevStep} />}
      {step === 3 && <Step3 onBack={prevStep} onSubmit={handleSubmit} isPending={createOrder.isPending} />}
    </Modal>
  );
}
