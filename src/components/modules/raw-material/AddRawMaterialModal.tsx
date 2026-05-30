"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAddRawMaterial } from "@/hooks/useRawMaterial";
import { rawMaterialSchema, type RawMaterialInput } from "@/types";

/** Input shape — fields with .default() are optional on entry */
type RawMaterialFormInput = z.input<typeof rawMaterialSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Beads & Stones",
  "Wire & Hook",
  "Glue & Cutter",
  "Tool",
  "Work Box",
  "Packaging",
  "Thread",
  "Bangle",
] as const;

const UNITS = ["gram", "pcs", "tube", "box", "meter"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddRawMaterialModal({ isOpen, onClose }: AddRawMaterialModalProps) {
  const addMutation = useAddRawMaterial();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RawMaterialFormInput, unknown, RawMaterialInput>({
    resolver: zodResolver(rawMaterialSchema),
    defaultValues: {
      openingStock: 0,
      purchasedQty: 0,
      usedQty: 0,
      lowStockThreshold: 10,
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const onSubmit = (data: RawMaterialInput) => {
    addMutation.mutate(data, {
      onSuccess: () => onClose(),
    });
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={isSubmitting || addMutation.isPending}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="add-raw-material-form"
        isLoading={isSubmitting || addMutation.isPending}
      >
        Add Material
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Raw Material" size="lg" footer={footer}>
      <form
        id="add-raw-material-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4"
      >
        {/* Row 1: Item name + Color type */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Item Name"
            placeholder="e.g. Red Glass Beads"
            required
            error={errors.itemName?.message}
            {...register("itemName")}
          />
          <Input
            label="Color / Type"
            placeholder="e.g. Dark Red (optional)"
            error={errors.colorType?.message}
            {...register("colorType")}
          />
        </div>

        {/* Row 2: Category + Unit */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Category dropdown */}
          <Select
            label="Category"
            required
            error={errors.category?.message}
            {...register("category")}
          >
            <option value="">Select category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          {/* Unit dropdown */}
          <Select
            label="Unit"
            required
            error={errors.unit?.message}
            {...register("unit")}
          >
            <option value="">Select unit…</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>

        {/* Row 3: Opening stock + Rate per unit */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Opening Stock"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            error={errors.openingStock?.message}
            {...register("openingStock", { valueAsNumber: true })}
          />
          <Input
            label="Rate per Unit (₹)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            required
            error={errors.ratePerUnit?.message}
            {...register("ratePerUnit", { valueAsNumber: true })}
          />
        </div>

        {/* Row 4: Low stock threshold + Supplier */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Low Stock Alert Threshold"
            type="number"
            min="0"
            step="any"
            placeholder="10"
            hint="Alert when closing stock falls below this"
            error={errors.lowStockThreshold?.message}
            {...register("lowStockThreshold", { valueAsNumber: true })}
          />
          <Input
            label="Supplier"
            placeholder="Supplier name (optional)"
            error={errors.supplier?.message}
            {...register("supplier")}
          />
        </div>

        {/* Mutation error */}
        {addMutation.isError && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {(addMutation.error as Error).message}
          </p>
        )}
      </form>
    </Modal>
  );
}
