"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAddThread, usePatchThread } from "@/hooks/useThreads";
import { PurchaseHistoryPanel } from "@/components/ui/PurchaseHistoryPanel";
import { formatGramRate, formatKgRateFromGramRate, resolvePurchaseHistory } from "@/lib/purchaseHistory";
import type { IThreadsStock } from "@/types";

const threadFormSchema = z.object({
  threadCode: z.string().min(1, "Thread code required"),
  threadColour: z.string().min(1, "Colour required"),
  threadCompanyName: z.string().min(1, "Company name required"),
  addStockGrams: z.number().min(0),
  totalPurchaseAmount: z.number().min(0, "Amount must be 0 or more"),
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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ThreadFormInput, unknown, ThreadFormOutput>({
    resolver: zodResolver(threadFormSchema),
    mode: "onChange",
    reValidateMode: "onBlur",
    defaultValues: {
      threadCode: "",
      threadColour: "",
      threadCompanyName: "",
      addStockGrams: 0,
      totalPurchaseAmount: 0,
    },
  });

  const addStockGrams = useWatch({ control, name: "addStockGrams" });
  const totalPurchaseAmount = useWatch({ control, name: "totalPurchaseAmount" });

  const grams = Number(addStockGrams || 0);
  const amount = Number(totalPurchaseAmount || 0);
  const perGramRate = grams > 0 ? Number((amount / grams).toFixed(4)) : 0;

  const purchaseHistory = useMemo(() => {
    if (!item) return [];
    return resolvePurchaseHistory(item.purchaseHistory, {
      quantity: item.stockAdd,
      totalAmount: Number((item.stockAdd * item.costPerUnit).toFixed(2)),
      ratePerUnit: item.costPerUnit,
      date: String(item.createdAt),
    });
  }, [item]);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    if (item) {
      reset({
        threadCode: item.threadCode,
        threadColour: item.threadColour,
        threadCompanyName: item.threadCompanyName,
        addStockGrams: 0,
        totalPurchaseAmount: 0,
      });
      return;
    }

    reset({
      threadCode: "",
      threadColour: "",
      threadCompanyName: "",
      addStockGrams: 0,
      totalPurchaseAmount: 0,
    });
  }, [isOpen, item, reset]);

  const onSubmit = (data: ThreadFormOutput) => {
    if (!item && data.addStockGrams <= 0) {
      setError("addStockGrams", { message: "Stock must be more than 0" });
      return;
    }

    if (item) {
      patchMutation.mutate(
        {
          id: item._id,
          threadCode: data.threadCode.trim(),
          threadColour: data.threadColour.trim(),
          threadCompanyName: data.threadCompanyName.trim(),
          ...(data.addStockGrams > 0
            ? {
                addStockQty: data.addStockGrams,
                totalPurchaseAmount: amount,
                costPerUnit: perGramRate,
              }
            : {}),
        },
        { onSuccess: () => onClose() }
      );
      return;
    }

    addMutation.mutate(
      {
        threadCode: data.threadCode.trim(),
        threadColour: data.threadColour.trim(),
        threadCompanyName: data.threadCompanyName.trim(),
        weightPerUnit: 0,
        openingStock: 0,
        stockAdd: data.addStockGrams,
        netUsed: 0,
        costPerUnit: perGramRate,
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
          <Input
            label="Thread Colour"
            placeholder="e.g. Red"
            required
            autoComplete="off"
            error={errors.threadColour?.message}
            {...register("threadColour")}
          />
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
            label="Add Stock (gram)"
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

        {isEdit && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Add new stock at updated price (e.g. ₹1000/kg → ₹1200/kg). Leave at 0 to update details only.
          </p>
        )}

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
