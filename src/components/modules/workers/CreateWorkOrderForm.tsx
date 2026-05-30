"use client";

import { useState } from "react";
import { useWorkers } from "@/hooks/useWorkers";
import { useBanglesStock } from "@/hooks/useBangles";
import { useThreadsStock } from "@/hooks/useThreads";
import { useRawMaterials } from "@/hooks/useRawMaterial";
import { useCreateWorkOrder } from "@/hooks/useWorkOrders";
import {
  useWorkOrderStore,
  useWorkOrderStep,
  useWorkOrderWorkerId,
  useWorkOrderWorkerName,
  useWorkOrderDate,
  useWorkOrderWorkType,
  useWorkOrderPerPieceRate,
  useWorkOrderDenaItems,
  useWorkOrderActions,
  type DenaItem,
  type BangleDenaItem,
  type ThreadDenaItem,
  type GlueDenaItem,
} from "@/stores/useWorkOrderStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CutType, WorkOrderCreateInput } from "@/types";

interface CreateWorkOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-select a worker when opened from WorkerCard */
  preSelectedWorkerId?: string;
  preSelectedWorkerName?: string;
}

// ─── Step 1: Worker + Date + Work Type ────────────────────────────────────────

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
      <div>
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
      </div>

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
        label="Per Piece Rate (₹)"
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
          Next: Materials →
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: DENA (materials given) ──────────────────────────────────────────

function Step2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { addDenaItem, removeDenaItem } = useWorkOrderActions();
  const denaItems = useWorkOrderDenaItems();
  const { data: bangles = [] } = useBanglesStock();
  const { data: threads = [] } = useThreadsStock();
  const { data: rawMaterials = [] } = useRawMaterials();
  const glueItems = rawMaterials.filter((r) => r.category === "Glue & Cutter");

  // Local form state for each material type
  const [banglesForm, setBanglesForm] = useState({
    banglesStockId: "",
    cuts: "",
    pieces: "",
  });
  const [threadForm, setThreadForm] = useState({ threadStockId: "", grams: "" });
  const [glueForm, setGlueForm] = useState({ glueStockId: "", units: "" });

  function addBangle() {
    const stock = bangles.find((b) => b._id === banglesForm.banglesStockId);
    if (!stock || !banglesForm.cuts || !banglesForm.pieces) return;
    const item: BangleDenaItem = {
      type: "bangle",
      banglesStockId: stock._id,
      size: stock.size,
      cutType: stock.cutType,
      cuts: parseFloat(banglesForm.cuts),
      pieces: parseFloat(banglesForm.pieces),
    };
    addDenaItem(item);
    setBanglesForm({ banglesStockId: "", cuts: "", pieces: "" });
  }

  function addThread() {
    const stock = threads.find((t) => t._id === threadForm.threadStockId);
    if (!stock || !threadForm.grams) return;
    const item: ThreadDenaItem = {
      type: "thread",
      threadStockId: stock._id,
      threadCode: stock.threadCode,
      threadColour: stock.threadColour,
      grams: parseFloat(threadForm.grams),
    };
    addDenaItem(item);
    setThreadForm({ threadStockId: "", grams: "" });
  }

  function addGlue() {
    const stock = glueItems.find((g) => g._id === glueForm.glueStockId);
    if (!stock || !glueForm.units) return;
    const item: GlueDenaItem = {
      type: "glue",
      glueStockId: stock._id,
      itemName: stock.itemName,
      units: parseFloat(glueForm.units),
    };
    addDenaItem(item);
    setGlueForm({ glueStockId: "", units: "" });
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">DENA — Materials Given to Worker</p>

      {/* Bangles Section */}
      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Bangles</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-3">
            <Select
              value={banglesForm.banglesStockId}
              onChange={(e) => setBanglesForm((f) => ({ ...f, banglesStockId: e.target.value }))}
            >
              <option value="">Select Bangles (size + cut)...</option>
              {bangles.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.size} — {b.cutType} (Stock: {b.closingStock} peta)
                </option>
              ))}
            </Select>
          </div>
          <Input
            type="number"
            placeholder="Cuts (peta)"
            value={banglesForm.cuts}
            min={0}
            onChange={(e) => setBanglesForm((f) => ({ ...f, cuts: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Pieces"
            value={banglesForm.pieces}
            min={0}
            onChange={(e) => setBanglesForm((f) => ({ ...f, pieces: e.target.value }))}
          />
          <Button size="sm" variant="outline" onClick={addBangle}>
            + Add
          </Button>
        </div>
      </div>

      {/* Threads Section */}
      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Threads</p>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={threadForm.threadStockId}
            onChange={(e) => setThreadForm((f) => ({ ...f, threadStockId: e.target.value }))}
          >
            <option value="">Select Thread...</option>
            {threads.map((t) => (
              <option key={t._id} value={t._id}>
                {t.threadCode} — {t.threadColour} ({t.closingStock}g)
              </option>
            ))}
          </Select>
          <Input
            type="number"
            placeholder="Grams"
            value={threadForm.grams}
            min={0}
            onChange={(e) => setThreadForm((f) => ({ ...f, grams: e.target.value }))}
          />
          <Button size="sm" variant="outline" className="col-span-2" onClick={addThread}>
            + Add Thread
          </Button>
        </div>
      </div>

      {/* Glue Section */}
      {glueItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Glue / Cutter</p>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={glueForm.glueStockId}
              onChange={(e) => setGlueForm((f) => ({ ...f, glueStockId: e.target.value }))}
            >
              <option value="">Select Glue/Cutter...</option>
              {glueItems.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.itemName} (Stock: {g.closingStock} {g.unit})
                </option>
              ))}
            </Select>
            <Input
              type="number"
              placeholder="Units"
              value={glueForm.units}
              min={0}
              onChange={(e) => setGlueForm((f) => ({ ...f, units: e.target.value }))}
            />
            <Button size="sm" variant="outline" className="col-span-2" onClick={addGlue}>
              + Add Glue
            </Button>
          </div>
        </div>
      )}

      {/* Added items list */}
      {denaItems.length > 0 && (
        <div className="rounded-xl bg-slate-50 p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Items to give:</p>
          {denaItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span>
                {item.type === "bangle" && `Bangles: ${item.size} ${item.cutType} — ${item.pieces} pcs`}
                {item.type === "thread" && `Thread: ${item.threadCode} (${item.threadColour}) — ${item.grams}g`}
                {item.type === "glue" && `Glue: ${item.itemName} — ${item.units} units`}
              </span>
              <button
                onClick={() => removeDenaItem(i)}
                className="text-red-500 hover:text-red-700 text-xs ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          ← Back
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
          Preview →
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Preview + Confirm ────────────────────────────────────────────────

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

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Preview &amp; Confirm</p>

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
          <span className="font-medium">₹{perPieceRate}</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">DENA — Materials Being Given:</p>
        <div className="space-y-1">
          {denaItems.map((item, i) => (
            <div key={i} className="text-sm rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
              {item.type === "bangle" && `Bangles: ${item.size} ${item.cutType} — ${item.pieces} pieces`}
              {item.type === "thread" && `Thread: ${item.threadCode} (${item.threadColour}) — ${item.grams}g`}
              {item.type === "glue" && `Glue: ${item.itemName} — ${item.units} units`}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-amber-700 bg-amber-50 rounded-md p-2">
        ⚠ Confirming will deduct the above materials from stock.
      </p>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={isPending}>
          ← Back
        </Button>
        <Button variant="primary" isLoading={isPending} onClick={onSubmit}>
          Confirm & Create Order
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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

  // Pre-select worker when opened from WorkerCard
  useState(() => {
    if (preSelectedWorkerId && preSelectedWorkerName) {
      setWorkerId(preSelectedWorkerId, preSelectedWorkerName);
    }
  });

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
        cutType: d.cutType as CutType,
        cuts: d.cuts,
        pieces: d.pieces,
      }));

    const threadItem = denaItems.find((d): d is ThreadDenaItem => d.type === "thread");
    const glueItem = denaItems.find((d): d is GlueDenaItem => d.type === "glue");

    // Sum up threads and glue across all items
    const totalThreads = denaItems
      .filter((d): d is ThreadDenaItem => d.type === "thread")
      .reduce((s, d) => s + d.grams, 0);
    const totalGlue = denaItems
      .filter((d): d is GlueDenaItem => d.type === "glue")
      .reduce((s, d) => s + d.units, 0);

    const payload: WorkOrderCreateInput = {
      workerId,
      date,
      workType,
      perPieceRate,
      banglesGiven,
      threadsGiven: totalThreads,
      threadStockId: threadItem?.threadStockId,
      glueGiven: totalGlue,
      glueStockId: glueItem?.glueStockId,
      otherMaterialGiven: [],
    };

    createOrder.mutate(payload, { onSuccess: handleClose });
  }

  const stepTitle = step === 1 ? "Step 1: Worker & Details" : step === 2 ? "Step 2: Materials (DENA)" : "Step 3: Preview";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`New Work Order — ${stepTitle}`} size="lg">
      {step === 1 && <Step1 onNext={nextStep} />}
      {step === 2 && <Step2 onNext={nextStep} onBack={prevStep} />}
      {step === 3 && (
        <Step3 onBack={prevStep} onSubmit={handleSubmit} isPending={createOrder.isPending} />
      )}
    </Modal>
  );
}
