"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAddThread, usePatchThread } from "@/hooks/useThreads";
import { PurchaseHistoryPanel } from "@/components/ui/PurchaseHistoryPanel";
import { formatGramRate, formatKgRateFromGramRate, resolvePurchaseHistory } from "@/lib/purchaseHistory";
import type { IThreadsStock } from "@/types";

const threadFormSchema = z.object({
  threadCode: z.string().min(1, "Thread code required"),
  threadColour: z.string().min(1, "Colour required"),
  threadColourHex: z.string().default("#000000"),
  threadCompanyName: z.string().min(1, "Company name required"),
  addStockGrams: z.number().min(0),
  totalPurchaseAmount: z.number().min(0, "Amount must be 0 or more"),
  hsnCodes: z.array(z.string()).default([]),
});

type ThreadFormInput = z.input<typeof threadFormSchema>;
type ThreadFormOutput = z.output<typeof threadFormSchema>;

interface AddThreadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: IThreadsStock | null;
}

export function AddThreadsModal({ isOpen, onClose, item }: AddThreadsModalProps) {
  "use no memo";
  const addMutation = useAddThread();
  const patchMutation = usePatchThread();
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ThreadFormInput, unknown, ThreadFormOutput>({
    resolver: zodResolver(threadFormSchema),
    mode: "onChange",
    reValidateMode: "onBlur",
    defaultValues: {
      threadCode: "",
      threadColour: "",
      threadColourHex: "#000000",
      threadCompanyName: "",
      addStockGrams: 0,
      totalPurchaseAmount: 0,
      hsnCodes: [],
    },
  });

  const [hsnInput, setHsnInput] = useState("");
  const hsnCodes = useWatch({ control, name: "hsnCodes" }) || [];

  const handleAddHsn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = hsnInput.trim();
    if (!trimmed) return;
    if (hsnCodes.includes(trimmed)) {
      setError("hsnCodes", { message: "HSN code already added" });
      return;
    }
    setValue("hsnCodes", [...hsnCodes, trimmed], { shouldDirty: true });
    setHsnInput("");
    clearErrors("hsnCodes");
  };

  const handleRemoveHsn = (codeToRemove: string) => {
    setValue("hsnCodes", hsnCodes.filter((c) => c !== codeToRemove), { shouldDirty: true });
  };

  const addStockGrams = useWatch({ control, name: "addStockGrams" });
  const totalPurchaseAmount = useWatch({ control, name: "totalPurchaseAmount" });
  const threadColourHex = useWatch({ control, name: "threadColourHex" });

  const grams = Number(addStockGrams || 0);
  const amount = Number(totalPurchaseAmount || 0);
  const perGramRate = grams > 0 ? Number((amount / grams).toFixed(4)) : 0;

  const purchaseHistory = useMemo(() => {
    if (!item) return [];
    const resolved = resolvePurchaseHistory(item.purchaseHistory, {
      quantity: item.stockAdd,
      totalAmount: Number((item.stockAdd * item.costPerUnit).toFixed(2)),
      ratePerUnit: item.costPerUnit,
      date: String(item.createdAt),
    });
    return resolved.slice(0, 1);
  }, [item]);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    if (item) {
      const prefillAmount = Number((item.stockAdd * item.costPerUnit).toFixed(2));
      reset({
        threadCode: item.threadCode,
        threadColour: item.threadColour,
        threadColourHex: item.threadColourHex || "#000000",
        threadCompanyName: item.threadCompanyName,
        addStockGrams: item.stockAdd,
        totalPurchaseAmount: prefillAmount,
        hsnCodes: item.hsnCodes || [],
      });
      return;
    }

    reset({
      threadCode: "",
      threadColour: "",
      threadColourHex: "#000000",
      threadCompanyName: "",
      addStockGrams: 0,
      totalPurchaseAmount: 0,
      hsnCodes: [],
    });
  }, [isOpen, item, reset]);

  const onSubmit = (data: ThreadFormOutput) => {
    if (data.addStockGrams <= 0) {
      setError("addStockGrams", { message: "Stock must be more than 0" });
      return;
    }

    if (item) {
      patchMutation.mutate(
        {
          id: item._id,
          threadCode: data.threadCode.trim(),
          threadColour: data.threadColour.trim(),
          threadColourHex: data.threadColourHex,
          threadCompanyName: data.threadCompanyName.trim(),
          stockAdd: data.addStockGrams,
          totalPurchaseAmount: amount,
          costPerUnit: perGramRate,
          hsnCodes: data.hsnCodes,
        },
        { onSuccess: () => onClose() }
      );
      return;
    }

    addMutation.mutate(
      {
        threadCode: data.threadCode.trim(),
        threadColour: data.threadColour.trim(),
        threadColourHex: data.threadColourHex,
        threadCompanyName: data.threadCompanyName.trim(),
        weightPerUnit: 0,
        openingStock: 0,
        stockAdd: data.addStockGrams,
        netUsed: 0,
        costPerUnit: perGramRate,
        hsnCodes: data.hsnCodes,
      },
      { onSuccess: () => onClose() }
    );
  };

  const isMutating = isSubmitting || addMutation.isPending || patchMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Thread Stock" : "Add Thread Stock"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isMutating}>
            Cancel
          </Button>
          <Button type="submit" form="thread-form" isLoading={isMutating}>
            {isEdit ? "Update Thread" : "Add Thread"}
          </Button>
        </>
      }
    >
      <form id="thread-form" onSubmit={handleSubmit(onSubmit)} autoComplete="off" noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Thread Code"
            placeholder="e.g. T001"
            required
            autoComplete="off"
            error={errors.threadCode?.message}
            {...register("threadCode")}
          />
          <div className="flex gap-2 items-end">
            <div className="flex-grow">
              <Input
                label="Thread Colour"
                placeholder="e.g. Red"
                required
                autoComplete="off"
                error={errors.threadColour?.message}
                {...register("threadColour")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Picker
              </label>
              <div className="relative flex items-center justify-center h-11 w-11 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#D32F2F]/30 focus-within:border-[#D32F2F]">
                <input
                  type="color"
                  className="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
                  {...register("threadColourHex")}
                />
                <div
                  className="h-6 w-6 rounded-full border border-slate-200 shadow-inner"
                  style={{ backgroundColor: threadColourHex || "#000000" }}
                />
              </div>
            </div>
          </div>
        </div>

        <Input
          label="Company Name"
          placeholder="e.g. Krishna Threads"
          required
          autoComplete="off"
          error={errors.threadCompanyName?.message}
          {...register("threadCompanyName")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={isEdit ? "Stock (gram)" : "Add Stock (gram)"}
            type="number"
            min="0"
            step="any"
            placeholder="0"
            required={!isEdit}
            error={errors.addStockGrams?.message}
            {...register("addStockGrams", { valueAsNumber: true })}
          />
          <Input
            label="Total Purchase Amount (₹)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            required={!isEdit}
            error={errors.totalPurchaseAmount?.message}
            {...register("totalPurchaseAmount", { valueAsNumber: true })}
          />
        </div>

        {/* HSN Codes */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            HSN Codes (Optional)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={hsnInput}
                onChange={(e) => setHsnInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddHsn();
                  }
                }}
                placeholder="Type and press Enter, e.g. 8471"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
              />
            </div>
            <Button
              type="button"
              onClick={() => handleAddHsn()}
              variant="secondary"
              className="h-11 px-4 border border-slate-200 flex items-center gap-1"
            >
              <Plus size={16} /> Add
            </Button>
          </div>
          
          {errors.hsnCodes?.message && (
            <p className="text-xs text-rose-600 font-medium">{errors.hsnCodes.message}</p>
          )}

          {hsnCodes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
              {hsnCodes.map((code) => (
                <Badge
                  key={code}
                  variant="neutral"
                  className="pl-3 pr-2 py-1 font-mono text-xs flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm hover:border-rose-200 transition-colors"
                >
                  <span>{code}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHsn(code)}
                    className="rounded-full p-0.5 hover:bg-rose-50 hover:text-rose-600 transition-colors focus:outline-none cursor-pointer"
                    aria-label={`Remove HSN code ${code}`}
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Current Purchase Calculation</p>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p className="text-slate-600">
              Quantity: <span className="font-semibold text-slate-900">{grams.toLocaleString("en-IN")} gram</span>
            </p>
            <p className="text-slate-600">
              Total Amount: <span className="font-semibold text-slate-900">₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </p>
            <p className="text-slate-600">
              1 gram rate: <span className="font-semibold text-slate-900">{formatGramRate(perGramRate)}</span>
            </p>
            <p className="text-slate-600">
              1 kg rate: <span className="font-semibold text-slate-900">{formatKgRateFromGramRate(perGramRate)}</span>
            </p>
          </div>
        </div>

        {isEdit && purchaseHistory.length > 0 && (
          <PurchaseHistoryPanel entries={purchaseHistory} quantityLabel="Qty (g)" />
        )}

        {(addMutation.isError || patchMutation.isError) && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {((addMutation.error ?? patchMutation.error) as Error).message}
          </p>
        )}
      </form>
    </Modal>
  );
}
