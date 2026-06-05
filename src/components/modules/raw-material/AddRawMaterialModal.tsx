"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAddRawMaterial, usePatchRawMaterial } from "@/hooks/useRawMaterial";
import { useRawMaterials } from "@/hooks/useRawMaterial";
import { rawMaterialSchema, type RawMaterialInput, type IRawMaterial } from "@/types";

/** Input shape — fields with .default() are optional on entry */
type RawMaterialFormInput = z.input<typeof rawMaterialSchema> & {
  categoryCustom?: string;
};
type RawMaterialFormOutput = RawMaterialInput & {
  categoryCustom?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Glass Cuts",
  "Plastic Purls",
  "Kody",
  "Glue",
  "Cutter",
  "Beads",
  "Stone",
  "Wire",
  "Hook",
  "Earing Materials",
  "Work Box",
  "Paking Box",
  "Paking Materials",
  "Threads",
  "Bangles",
] as const;

const UNITS = ["gram", "pcs", "tube", "box", "meter"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: IRawMaterial | null;
}

export function AddRawMaterialModal({ isOpen, onClose, item }: AddRawMaterialModalProps) {
  const addMutation = useAddRawMaterial();
  const patchMutation = usePatchRawMaterial();
  const { data: materials = [] } = useRawMaterials();
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RawMaterialFormInput, unknown, RawMaterialFormOutput>({
    resolver: zodResolver(rawMaterialSchema),
    defaultValues: {
      openingStock: 0,
      purchasedQty: 0,
      usedQty: 0,
      lowStockThreshold: 10,
    },
  });

  const selectedCategory = watch("category");
  const customCategory = watch("categoryCustom");

  const categoryOptions = useMemo(() => {
    const fromData = materials
      .map((m) => m.category?.trim())
      .filter((c): c is string => !!c);

    const unique = new Set<string>([...CATEGORIES, ...fromData]);
    if (item?.category?.trim()) unique.add(item.category.trim());

    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [materials, item]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    if (item) {
      reset({
        itemName: item.itemName,
        colorType: item.colorType ?? "",
        category: categoryOptions.includes(item.category) ? item.category : "__custom__",
        categoryCustom: categoryOptions.includes(item.category) ? "" : item.category,
        unit: item.unit,
        openingStock: item.openingStock,
        purchasedQty: item.purchasedQty,
        usedQty: item.usedQty,
        ratePerUnit: item.ratePerUnit,
        lowStockThreshold: item.lowStockThreshold,
        supplier: item.supplier ?? "",
        lastPurchaseDate: item.lastPurchaseDate
          ? new Date(item.lastPurchaseDate).toISOString().slice(0, 10)
          : undefined,
      });
      return;
    }

    reset({
      itemName: "",
      colorType: "",
      category: undefined,
      categoryCustom: "",
      unit: undefined,
      openingStock: 0,
      purchasedQty: 0,
      usedQty: 0,
      ratePerUnit: 0,
      lowStockThreshold: 10,
      supplier: "",
      lastPurchaseDate: undefined,
    });
  }, [isOpen, item, reset, categoryOptions]);

  const onSubmit = (data: RawMaterialFormOutput) => {
    const finalCategory =
      data.category === "__custom__" ? data.categoryCustom?.trim() : data.category?.trim();

    if (!finalCategory) {
      return;
    }

    const payload: RawMaterialInput = {
      ...data,
      category: finalCategory,
      colorType: data.colorType?.trim() || undefined,
      supplier: data.supplier?.trim() || undefined,
    };

    if (item) {
      patchMutation.mutate(
        {
          id: item._id,
          itemName: payload.itemName,
          colorType: payload.colorType,
          category: payload.category,
          unit: payload.unit,
          openingStock: payload.openingStock,
          purchasedQty: payload.purchasedQty,
          usedQty: payload.usedQty,
          ratePerUnit: payload.ratePerUnit,
          lowStockThreshold: payload.lowStockThreshold,
          supplier: payload.supplier,
          lastPurchaseDate: payload.lastPurchaseDate,
        },
        { onSuccess: () => onClose() }
      );
      return;
    }

    addMutation.mutate(payload, {
      onSuccess: () => onClose(),
    });
  };

  const isMutating = isSubmitting || addMutation.isPending || patchMutation.isPending;

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={isMutating}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="add-raw-material-form"
        isLoading={isMutating}
      >
        {isEdit ? "Update Material" : "Add Material"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Raw Material" : "Add Raw Material"}
      size="lg"
      footer={footer}
    >
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
            label="Sub Category / Details"
            placeholder="e.g. Dark Red, 4mm, No.12"
            hint="Aa box ma tame manually kai pan lakhine sub-category set kari shako"
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
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__custom__">+ Add New Category</option>
          </Select>

          {selectedCategory === "__custom__" && (
            <Input
              label="New Category Name"
              required
              placeholder="Type new category"
              error={errors.categoryCustom?.message}
              {...register("categoryCustom", {
                validate: (v) => {
                  if (selectedCategory !== "__custom__") return true;
                  return !!v?.trim() || "New category name required";
                },
              })}
            />
          )}

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

          {selectedCategory !== "__custom__" && !!customCategory && (
            <p className="text-xs text-slate-400">
              Tip: custom category fill thayeli chhe, pan tame dropdown mathi select category use kari rahya cho.
            </p>
          )}
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
        {(addMutation.isError || patchMutation.isError) && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {((addMutation.error ?? patchMutation.error) as Error).message}
          </p>
        )}
      </form>
    </Modal>
  );
}
