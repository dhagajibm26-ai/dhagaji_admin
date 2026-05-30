"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAddBangles } from "@/hooks/useBangles";
import { banglesStockSchema, type BanglesStockInput } from "@/types";

type BanglesFormInput = z.input<typeof banglesStockSchema>;

const PETA_MAP = { C1: 12, C2: 24, C4: 48, C6: 72 } as const;

interface AddBanglesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddBanglesModal({ isOpen, onClose }: AddBanglesModalProps) {
  const addMutation = useAddBangles();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BanglesFormInput, unknown, BanglesStockInput>({
    resolver: zodResolver(banglesStockSchema),
    defaultValues: {
      netUsed: 0,
      cutType: "C1",
    },
  });

  // Watch cutType to auto-show peta
  const cutType = useWatch({ control, name: "cutType" }) as keyof typeof PETA_MAP | undefined;
  const peta = cutType && cutType in PETA_MAP ? PETA_MAP[cutType as keyof typeof PETA_MAP] : null;

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const onSubmit = (data: BanglesStockInput) => {
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
        form="add-bangles-form"
        isLoading={isSubmitting || addMutation.isPending}
      >
        Add Bangles
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Bangles Stock"
      size="md"
      footer={footer}
    >
      <form
        id="add-bangles-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4"
      >
        {/* Row 1: Size + Cut Type */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Size (diameter)"
            placeholder='e.g. 2.4, 2.6, 2.8'
            required
            error={errors.size?.message}
            {...register("size")}
          />

          {/* Cut Type dropdown */}
          <div className="flex flex-col gap-1.5">
            <Select
              label="Cut Type"
              required
              error={errors.cutType?.message}
              {...register("cutType")}
            >
              <option value="C1">C1</option>
              <option value="C2">C2</option>
              <option value="C4">C4</option>
              <option value="C6">C6</option>
            </Select>
            {/* Auto peta hint */}
            {peta !== null && (
              <p className="text-xs text-slate-400">
                Peta: <span className="font-semibold text-slate-700">{peta} pieces/set</span>
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Quantity + Price per piece */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Quantity Added (sets)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            required
            error={errors.quantityAdd?.message}
            {...register("quantityAdd", { valueAsNumber: true })}
          />
          <Input
            label="Price per Piece (₹)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            required
            error={errors.pricePerPiece?.message}
            {...register("pricePerPiece", { valueAsNumber: true })}
          />
        </div>
      </form>
    </Modal>
  );
}
