"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAddThread, usePatchThread } from "@/hooks/useThreads";
import { threadsStockSchema, type IThreadsStock } from "@/types";

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
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(threadsStockSchema),
    mode: "onChange",
    reValidateMode: "onBlur",
    defaultValues: {
      threadCode: "",
      threadColour: "",
      threadCompanyName: "",
      weightPerUnit: 0,
      stockAdd: 0,
      openingStock: 0,
      netUsed: 0,
      costPerUnit: 0,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    
    if (item) {
      reset({
        threadCode: item.threadCode,
        threadColour: item.threadColour,
        threadCompanyName: item.threadCompanyName,
        weightPerUnit: item.weightPerUnit,
        openingStock: item.openingStock,
        stockAdd: item.stockAdd,
        netUsed: item.netUsed,
        costPerUnit: item.costPerUnit,
      });
    } else {
      reset({
        threadCode: "",
        threadColour: "",
        threadCompanyName: "",
        weightPerUnit: 0,
        stockAdd: 0,
        openingStock: 0,
        netUsed: 0,
        costPerUnit: 0,
      });
    }
  }, [isOpen, item, reset]);

  const onSubmit = (data: any) => {
    if (item) {
      patchMutation.mutate(
        {
          id: item._id,
          threadCode: data.threadCode,
          threadColour: data.threadColour,
          threadCompanyName: data.threadCompanyName,
          weightPerUnit: data.weightPerUnit,
          openingStock: data.openingStock,
          stockAdd: data.stockAdd,
          netUsed: data.netUsed,
          costPerUnit: data.costPerUnit,
        },
        { onSuccess: () => onClose() }
      );
    } else {
      addMutation.mutate(data, { onSuccess: () => onClose() });
    }
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
      <form
        id="thread-form"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
        noValidate
        className="space-y-4"
      >
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Company Name"
            placeholder="e.g. Krishna Threads"
            required
            autoComplete="off"
            error={errors.threadCompanyName?.message}
            {...register("threadCompanyName")}
          />
          <Input
            label="Weight per Unit (g)"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            error={errors.weightPerUnit?.message}
            {...register("weightPerUnit", { valueAsNumber: true })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Opening Stock (g)"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            hint="Previous closing stock"
            error={errors.openingStock?.message}
            {...register("openingStock", { valueAsNumber: true })}
          />
          <Input
            label="Stock Add (g)"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            hint="New stock received"
            error={errors.stockAdd?.message}
            {...register("stockAdd", { valueAsNumber: true })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Cost per Unit (₹/g)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            required
            error={errors.costPerUnit?.message}
            {...register("costPerUnit", { valueAsNumber: true })}
          />
        </div>
      </form>
    </Modal>
  );
}
