"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAddBangles, usePatchBangles } from "@/hooks/useBangles";
import { banglesStockSchema, type IBanglesStock } from "@/types";

const PETA_MAP = { C1: 12, C2: 24, C4: 48, C6: 72 } as const;

interface AddBanglesModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: IBanglesStock | null;
}

export function AddBanglesModal({ isOpen, onClose, item }: AddBanglesModalProps) {
  "use no memo";
  const addMutation = useAddBangles();
  const patchMutation = usePatchBangles();
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(banglesStockSchema),
    mode: "onChange",
    reValidateMode: "onBlur",
    defaultValues: {
      size: "",
      cutType: "C1",
      quantityAdd: 0,
      pricePerPiece: 0,
    },
  });

  const cutType = useWatch({ control, name: "cutType" }) as keyof typeof PETA_MAP | undefined;
  const peta = cutType && cutType in PETA_MAP ? PETA_MAP[cutType as keyof typeof PETA_MAP] : null;

  useEffect(() => {
    if (!isOpen) return;
    
    if (item) {
      reset({
        size: item.size,
        cutType: item.cutType,
        quantityAdd: item.quantityAdd,
        pricePerPiece: item.pricePerPiece,
      });
    } else {
      reset({
        size: "",
        cutType: "C1",
        quantityAdd: 0,
        pricePerPiece: 0,
      });
    }
  }, [isOpen, item, reset]);

  const onSubmit = (data: any) => {
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
    } else {
      addMutation.mutate(data, { onSuccess: () => onClose() });
    }
  };

  const isMutating = isSubmitting || addMutation.isPending || patchMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Bangles Stock" : "Add Bangles Stock"}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isMutating}>
            Cancel
          </Button>
          <Button type="submit" form="bangles-form" isLoading={isMutating}>
            {isEdit ? "Update Bangles" : "Add Bangles"}
          </Button>
        </>
      }
    >
      <form
        id="bangles-form"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
        noValidate
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Bangle Size (diameter in cm)"
            placeholder="e.g. 2.4"
            hint="Enter diameter like 2.4 or 2,4"
            required
            autoComplete="off"
            error={errors.size?.message}
            {...register("size")}
          />
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
            {peta !== null && (
              <p className="text-xs text-slate-400">
                Peta: <span className="font-semibold text-slate-700">{peta} pieces/set</span>
              </p>
            )}
          </div>
        </div>

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
