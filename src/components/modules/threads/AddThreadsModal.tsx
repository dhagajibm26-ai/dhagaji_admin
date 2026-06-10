"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAddThread, usePatchThread } from "@/hooks/useThreads";
import { threadsStockSchema, type ThreadsStockInput, type IThreadsStock } from "@/types";

type ThreadsFormInput = z.input<typeof threadsStockSchema>;

interface AddThreadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: IThreadsStock | null;
}

export function AddThreadsModal({ isOpen, onClose, item }: AddThreadsModalProps) {
  const addMutation = useAddThread();
  const patchMutation = usePatchThread();
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ThreadsFormInput, unknown, ThreadsStockInput>({
    resolver: zodResolver(threadsStockSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      stockAdd: 0,
      openingStock: 0,
      netUsed: 0,
    },
  });

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
        weightPerUnit: item.weightPerUnit,
        openingStock: item.openingStock,
        stockAdd: item.stockAdd,
        netUsed: item.netUsed,
        costPerUnit: item.costPerUnit,
      });
      return;
    }

    reset({
      threadCode: "",
      threadColour: "",
      threadCompanyName: "",
      weightPerUnit: 0,
      openingStock: 0,
      stockAdd: 0,
      netUsed: 0,
      costPerUnit: 0,
    });
  }, [isOpen, item, reset]);

  const onSubmit = (data: ThreadsStockInput) => {
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
      return;
    }

    addMutation.mutate(data, { onSuccess: () => onClose() });
  };

  const isMutating = isSubmitting || addMutation.isPending || patchMutation.isPending;

  const footer = (
    <>
      <Button
        variant="ghost"
        onClick={onClose}
        disabled={isMutating}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="add-threads-form"
        isLoading={isMutating}
      >
        {isEdit ? "Update Thread" : "Add Thread"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Thread Stock" : "Add Thread Stock"}
      size="lg"
      footer={footer}
    >
      <form
        id="add-threads-form"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
        noValidate
        className="space-y-4"
      >
        {/* Row 1: Thread Code + Colour */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Thread Code"
            placeholder="e.g. T001, RED-01"
            required
            autoComplete="off"
            error={errors.threadCode?.message}
            {...register("threadCode")}
          />
          <Input
            label="Thread Colour"
            placeholder="e.g. Red, Navy Blue"
            required
            autoComplete="off"
            error={errors.threadColour?.message}
            {...register("threadColour")}
          />
        </div>

        {/* Row 2: Company + Weight per unit */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Company Name"
            placeholder="e.g. Krishna Threads Co."
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
            required
            error={errors.weightPerUnit?.message}
            {...register("weightPerUnit", { valueAsNumber: true })}
          />
        </div>

        {/* Row 3: Opening stock + Stock Add */}
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

        {/* Row 4: Cost per unit */}
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
