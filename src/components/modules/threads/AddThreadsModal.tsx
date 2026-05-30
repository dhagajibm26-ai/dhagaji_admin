"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAddThread } from "@/hooks/useThreads";
import { threadsStockSchema, type ThreadsStockInput } from "@/types";

type ThreadsFormInput = z.input<typeof threadsStockSchema>;

interface AddThreadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddThreadsModal({ isOpen, onClose }: AddThreadsModalProps) {
  const addMutation = useAddThread();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ThreadsFormInput, unknown, ThreadsStockInput>({
    resolver: zodResolver(threadsStockSchema),
    defaultValues: {
      stockAdd: 0,
      openingStock: 0,
      netUsed: 0,
    },
  });

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const onSubmit = (data: ThreadsStockInput) => {
    addMutation.mutate(data, { onSuccess: () => onClose() });
  };

  const footer = (
    <>
      <Button
        variant="ghost"
        onClick={onClose}
        disabled={isSubmitting || addMutation.isPending}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="add-threads-form"
        isLoading={isSubmitting || addMutation.isPending}
      >
        Add Thread
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Thread Stock"
      size="lg"
      footer={footer}
    >
      <form
        id="add-threads-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4"
      >
        {/* Row 1: Thread Code + Colour */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Thread Code"
            placeholder="e.g. T001, RED-01"
            required
            error={errors.threadCode?.message}
            {...register("threadCode")}
          />
          <Input
            label="Thread Colour"
            placeholder="e.g. Red, Navy Blue"
            required
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
