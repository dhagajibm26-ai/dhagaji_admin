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
            {o.workType} · {getWorkerName(o)} · {new Date(o.date).toLocaleDateString("en-IN")}
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

  function buildShareText() {
    const lines = denaItems.map((item) => {
      if (item.type === "bangle") return `- Bangles ${item.size} ${item.cutType}: ${item.pieces} pcs`;
      if (item.type === "thread") return `- Thread ${item.threadCode} (${item.threadColour}): ${item.grams} g`;
      if (item.type === "glue") return `- Glue ${item.itemName}: ${item.units} ${item.unit ?? "units"}`;
      if (item.type === "cutter") return `- Cutter ${item.itemName}: ${item.units} ${item.unit ?? "units"}`;
      return `- ${(item as RawMatDenaItem).itemName}: ${(item as RawMatDenaItem).units} ${(item as RawMatDenaItem).unit ?? "units"}`;
    });

    return [
      `Work Order (${assignmentType === "half" ? "Half Work Assignment" : "Full Work Assignment"})`,
      `Worker: ${workerName}`,
      `Date: ${new Date(date).toLocaleDateString("en-IN")}`,
      `Work Type: ${workType}`,
      `Rate: Rs ${perPieceRate}`,
      "Materials Given:",
      ...lines,
    ].join("\n");
  }

  function handlePrintCopies() {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    const body = buildShareText().replace(/\n/g, "<br />");
    printWindow.document.write(`
      <html>
        <head><title>Work Order Copies</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>Office Copy</h2>
          <div>${body}</div>
          <hr style="margin: 24px 0;" />
          <h2>Worker Copy</h2>
          <div>${body}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handleWhatsAppShare() {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
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
          <span className="font-medium">{new Date(date).toLocaleDateString("en-IN")}</span>
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
        <Button variant="outline" onClick={handleWhatsAppShare}>
          Send Digital Copy
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
