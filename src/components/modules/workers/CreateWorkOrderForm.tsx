"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkers } from "@/hooks/useWorkers";
import { useBanglesStock } from "@/hooks/useBangles";
import { useThreadsStock } from "@/hooks/useThreads";
import { useRawMaterials } from "@/hooks/useRawMaterial";
import { useCreateWorkOrder } from "@/hooks/useWorkOrders";
import {
  useWorkOrderStep,
  useWorkOrderWorkerId,
  useWorkOrderWorkerName,
  useWorkOrderDate,
  useWorkOrderWorkType,
  useWorkOrderPerPieceRate,
  useWorkOrderDenaItems,
  useWorkOrderActions,
  type BangleDenaItem,
  type ThreadDenaItem,
  type GlueDenaItem,
  type CutterDenaItem,
} from "@/stores/useWorkOrderStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CutType, WorkOrderCreateInput } from "@/types";

interface CreateWorkOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedWorkerId?: string;
  preSelectedWorkerName?: string;
}

function Step1({ onNext }: { onNext: () => void }) {
  const { setWorkerId, setDate, setWorkType, setPerPieceRate } = useWorkOrderActions();
  const workerId = useWorkOrderWorkerId();
  const date = useWorkOrderDate();
  const workType = useWorkOrderWorkType();
  const perPieceRate = useWorkOrderPerPieceRate();
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

  return (
    <div className="space-y-4">
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

      <Input
        label="Work Type"
        required
        placeholder="e.g. Bangles threading, Bead work"
        value={workType}
        onChange={(e) => setWorkType(e.target.value)}
        error={errors.workType}
      />

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

function Step2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { addDenaItem, removeDenaItem } = useWorkOrderActions();
  const denaItems = useWorkOrderDenaItems();
  const { data: bangles = [] } = useBanglesStock();
  const { data: threads = [] } = useThreadsStock();
  const { data: rawMaterials = [] } = useRawMaterials();

  const glueItems = rawMaterials.filter((r) => {
    const category = r.category.toLowerCase();
    const name = r.itemName.toLowerCase();
    return category.includes("glue") || name.includes("glue");
  });
  const cutterItems = rawMaterials.filter((r) => {
    const category = r.category.toLowerCase();
    const name = r.itemName.toLowerCase();
    return category.includes("cutter") || name.includes("cutter");
  });

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
  const [glueForm, setGlueForm] = useState({ rawMaterialId: "", units: "" });
  const [cutterForm, setCutterForm] = useState({ rawMaterialId: "", units: "" });

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

  function addGlue() {
    const stock = glueItems.find((g) => g._id === glueForm.rawMaterialId);
    const units = parseFloat(glueForm.units || "0");
    if (!stock || !units || units <= 0) return;

    const item: GlueDenaItem = {
      type: "glue",
      rawMaterialId: stock._id,
      itemName: stock.itemName,
      units,
      unit: stock.unit,
    };
    addDenaItem(item);
    setGlueForm({ rawMaterialId: "", units: "" });
  }

  function addCutter() {
    const stock = cutterItems.find((c) => c._id === cutterForm.rawMaterialId);
    const units = parseFloat(cutterForm.units || "0");
    if (!stock || !units || units <= 0) return;

    const item: CutterDenaItem = {
      type: "cutter",
      rawMaterialId: stock._id,
      itemName: stock.itemName,
      units,
      unit: stock.unit,
    };
    addDenaItem(item);
    setCutterForm({ rawMaterialId: "", units: "" });
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">DENA - Materials Given to Worker</p>

      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Bangles (one size, all cuts together)</p>
        <Select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
          <option value="">Select Size...</option>
          {[...banglesBySize.keys()]
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
        </Select>

        {selectedSize && (
          <div className="space-y-2 rounded-lg border border-slate-100 p-2">
            {(["C1", "C2", "C4", "C6"] as CutType[]).map((cutType) => {
              const stock = banglesBySize.get(selectedSize)?.[cutType];
              return (
                <div key={cutType} className="grid grid-cols-3 gap-2 items-center">
                  <p className="text-sm font-semibold text-slate-700">{cutType}</p>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Pieces"
                    value={banglePiecesByCut[cutType]}
                    onChange={(e) =>
                      setBanglePiecesByCut((prev) => ({ ...prev, [cutType]: e.target.value }))
                    }
                  />
                  <p className="text-xs text-slate-500">
                    Stock: {stock ? stock.closingStock.toLocaleString("en-IN") : 0} pcs
                  </p>
                </div>
              );
            })}
            <Button size="sm" variant="outline" onClick={addBanglesForSelectedSize} className="w-full">
              + Add Selected Size Entries
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Threads (multiple at once)</p>
        {threadRows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-2">
            <Select
              value={row.threadStockId}
              onChange={(e) => {
                const next = [...threadRows];
                next[idx] = { ...next[idx], threadStockId: e.target.value };
                setThreadRows(next);
              }}
            >
              <option value="">Select Thread...</option>
              {threads.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.threadCode} - {t.threadColour} ({t.closingStock}g)
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={0}
              placeholder="Grams"
              value={row.grams}
              onChange={(e) => {
                const next = [...threadRows];
                next[idx] = { ...next[idx], grams: e.target.value };
                setThreadRows(next);
              }}
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setThreadRows((rows) => [...rows, { threadStockId: "", grams: "" }])}
          >
            + Add Row
          </Button>
          <Button size="sm" variant="outline" onClick={addAllThreadRows}>
            Add All Threads
          </Button>
        </div>
      </div>

      {glueItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Glue</p>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={glueForm.rawMaterialId}
              onChange={(e) => setGlueForm((f) => ({ ...f, rawMaterialId: e.target.value }))}
            >
              <option value="">Select Glue...</option>
              {glueItems.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.itemName} (Stock: {g.closingStock} {g.unit})
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={0}
              placeholder="Units"
              value={glueForm.units}
              onChange={(e) => setGlueForm((f) => ({ ...f, units: e.target.value }))}
            />
            <Button size="sm" variant="outline" className="col-span-2" onClick={addGlue}>
              + Add Glue
            </Button>
          </div>
        </div>
      )}

      {cutterItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Cutter</p>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={cutterForm.rawMaterialId}
              onChange={(e) => setCutterForm((f) => ({ ...f, rawMaterialId: e.target.value }))}
            >
              <option value="">Select Cutter...</option>
              {cutterItems.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.itemName} (Stock: {c.closingStock} {c.unit})
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={0}
              placeholder="Units"
              value={cutterForm.units}
              onChange={(e) => setCutterForm((f) => ({ ...f, units: e.target.value }))}
            />
            <Button size="sm" variant="outline" className="col-span-2" onClick={addCutter}>
              + Add Cutter
            </Button>
          </div>
        </div>
      )}

      {denaItems.length > 0 && (
        <div className="rounded-xl bg-slate-50 p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Items to give:</p>
          {denaItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span>
                {item.type === "bangle" && `Bangles: ${item.size} ${item.cutType} - ${item.pieces} pcs`}
                {item.type === "thread" && `Thread: ${item.threadCode} (${item.threadColour}) - ${item.grams}g`}
                {item.type === "glue" && `Glue: ${item.itemName} - ${item.units} units`}
                {item.type === "cutter" && `Cutter: ${item.itemName} - ${item.units} units`}
              </span>
              <button
                onClick={() => removeDenaItem(i)}
                className="text-red-500 hover:text-red-700 text-xs ml-2"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            if (denaItems.length === 0) {
              alert("Add at least one material to give");
              return;
            }
            onNext();
          }}
        >
          Preview
        </Button>
      </div>
    </div>
  );
}

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

  function buildShareText() {
    const lines = denaItems.map((item) => {
      if (item.type === "bangle") return `- Bangles ${item.size} ${item.cutType}: ${item.pieces} pcs`;
      if (item.type === "thread") return `- Thread ${item.threadCode} (${item.threadColour}): ${item.grams} g`;
      if (item.type === "glue") return `- Glue ${item.itemName}: ${item.units} ${item.unit ?? "units"}`;
      return `- Cutter ${item.itemName}: ${item.units} ${item.unit ?? "units"}`;
    });

    return [
      "Work Order",
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
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Preview and Confirm</p>

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
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Materials Being Given:</p>
        <div className="space-y-1">
          {denaItems.map((item, i) => (
            <div key={i} className="text-sm rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
              {item.type === "bangle" && `Bangles: ${item.size} ${item.cutType} - ${item.pieces} pieces`}
              {item.type === "thread" && `Thread: ${item.threadCode} (${item.threadColour}) - ${item.grams}g`}
              {item.type === "glue" && `Glue: ${item.itemName} - ${item.units} units`}
              {item.type === "cutter" && `Cutter: ${item.itemName} - ${item.units} units`}
            </div>
          ))}
        </div>
      </div>

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

export function CreateWorkOrderForm({
  isOpen,
  onClose,
  preSelectedWorkerId,
  preSelectedWorkerName,
}: CreateWorkOrderFormProps) {
  const step = useWorkOrderStep();
  const workerId = useWorkOrderWorkerId();
  const date = useWorkOrderDate();
  const workType = useWorkOrderWorkType();
  const perPieceRate = useWorkOrderPerPieceRate();
  const denaItems = useWorkOrderDenaItems();
  const { nextStep, prevStep, reset, setWorkerId } = useWorkOrderActions();
  const createOrder = useCreateWorkOrder();

  useEffect(() => {
    if (isOpen && preSelectedWorkerId && preSelectedWorkerName) {
      setWorkerId(preSelectedWorkerId, preSelectedWorkerName);
    }
  }, [isOpen, preSelectedWorkerId, preSelectedWorkerName, setWorkerId]);

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!workerId) return;

    const banglesGiven = denaItems
      .filter((d): d is BangleDenaItem => d.type === "bangle")
      .map((d) => ({
        banglesStockId: d.banglesStockId,
        cutType: d.cutType,
        cuts: d.cuts,
        pieces: d.pieces,
      }));

    const threadItems = denaItems.filter((d): d is ThreadDenaItem => d.type === "thread");
    const glueItems = denaItems.filter((d): d is GlueDenaItem => d.type === "glue");
    const cutterItems = denaItems.filter((d): d is CutterDenaItem => d.type === "cutter");

    const totalThreads = threadItems.reduce((s, d) => s + d.grams, 0);
    const totalGlue = glueItems.reduce((s, d) => s + d.units, 0);
    const totalCutter = cutterItems.reduce((s, d) => s + d.units, 0);

    const payload: WorkOrderCreateInput = {
      workerId,
      date,
      workType,
      perPieceRate,
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
        ...glueItems.map((g) => ({
          rawMaterialId: g.rawMaterialId,
          itemName: g.itemName,
          qty: g.units,
          kind: "glue" as const,
          unit: g.unit,
        })),
        ...cutterItems.map((c) => ({
          rawMaterialId: c.rawMaterialId,
          itemName: c.itemName,
          qty: c.units,
          kind: "cutter" as const,
          unit: c.unit,
        })),
      ],
      glueGiven: totalGlue,
      cutterGiven: totalCutter,
      glueStockId: glueItems[0]?.rawMaterialId,
      otherMaterialGiven: [],
    };

    createOrder.mutate(payload, { onSuccess: handleClose });
  }

  const stepTitle =
    step === 1 ? "Step 1: Worker and Details" : step === 2 ? "Step 2: Materials (DENA)" : "Step 3: Preview";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`New Work Order - ${stepTitle}`} size="lg">
      {step === 1 && <Step1 onNext={nextStep} />}
      {step === 2 && <Step2 onNext={nextStep} onBack={prevStep} />}
      {step === 3 && <Step3 onBack={prevStep} onSubmit={handleSubmit} isPending={createOrder.isPending} />}
    </Modal>
  );
}
