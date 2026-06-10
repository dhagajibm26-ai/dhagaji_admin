"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAddBangles, usePatchBangles } from "@/hooks/useBangles";
import { banglesStockSchema, type BanglesStockInput, type IBanglesStock } from "@/types";

type BanglesFormInput = z.input<typeof banglesStockSchema>;

const PETA_MAP = { C1: 12, C2: 24, C4: 48, C6: 72 } as const;

interface AddBanglesModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: IBanglesStock | null;
}

export function AddBanglesModal({ isOpen, onClose, item }: AddBanglesModalProps) {
  const addMutation = useAddBangles();
  const patchMutation = usePatchBangles();
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BanglesFormInput, unknown, BanglesStockInput>({
    resolver: zodResolver(banglesStockSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      netUsed: 0,
      cutType: "C1",
    },
  });

  // Watch cutType to auto-show peta
  const cutType = useWatch({ control, name: "cutType" }) as keyof typeof PETA_MAP | undefined;
  const peta = cutType && cutType in PETA_MAP ? PETA_MAP[cutType as keyof typeof PETA_MAP] : null;

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    if (item) {
      reset({
        size: item.size,
        cutType: item.cutType,
        quantityAdd: item.quantityAdd,
        pricePerPiece: item.pricePerPiece,
        netUsed: item.netUsed,
      });
      return;
    }

    reset({
      netUsed: 0,
      cutType: "C1",
      quantityAdd: 0,
      pricePerPiece: 0,
      size: "",
    });
  }, [isOpen, item, reset]);

  const onSubmit = (data: BanglesStockInput) => {
    if (item) {
      patchMutation.mutate(
        {
          id: item._id,
          size: data.size,
          cutType: data.cutType,
          quantityAdd: data.quantityAdd,
          pricePerPiece: data.pricePerPiece,
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
        form="add-bangles-form"
        isLoading={isMutating}
      >
        {isEdit ? "Update Bangles" : "Add Bangles"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Bangles Stock" : "Add Bangles Stock"}
      size="md"
      footer={footer}
    >
      <form
        id="add-bangles-form"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
        noValidate
        className="space-y-4"
      >
        {/* Row 1: Size + Cut Type */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Size (diameter)"
            placeholder='e.g. 2.4, 2.6, 2.8'
            required
            autoComplete="off"
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
