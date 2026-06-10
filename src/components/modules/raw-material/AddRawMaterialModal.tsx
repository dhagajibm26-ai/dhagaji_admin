"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAddRawMaterial, usePatchRawMaterial } from "@/hooks/useRawMaterial";
import { useMaterialCategories } from "@/hooks/useMaterialCategories";
import { rawMaterialSchema, type RawMaterialInput, type IRawMaterial } from "@/types";

type RawMaterialFormInput = z.input<typeof rawMaterialSchema>;

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
  const { data: categories = [] } = useMaterialCategories();
  const isEdit = !!item;
  const [qtyForPrice, setQtyForPrice] = useState("0");
  const [totalPriceForQty, setTotalPriceForQty] = useState("0");

  const {
    register,
    handleSubmit,
    reset,
    watch,
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

  const unit = watch("unit");

  const categoryOptions = useMemo(() => {
    const fromCategoryMaster = categories
      .filter((c) => c.isActive)
      .map((c) => c.name?.trim())
      .filter((c): c is string => !!c);

    const unique = new Set<string>([...fromCategoryMaster]);
    if (item?.category?.trim()) unique.add(item.category.trim());

    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [categories, item]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    if (item) {
      const currentRate = Number(item.ratePerUnit || 0);
      const currentQty = Number(item.openingStock || 0);
      reset({
        itemName: item.itemName,
        colorType: item.colorType ?? "",
        category: item.category,
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
      setQtyForPrice(currentQty > 0 ? String(currentQty) : "1");
      setTotalPriceForQty(String(Number((currentRate * (currentQty || 1)).toFixed(2))));
      return;
    }

    reset({
      itemName: "",
      colorType: "",
      category: undefined,
      unit: undefined,
      openingStock: 0,
      purchasedQty: 0,
      usedQty: 0,
      ratePerUnit: 0,
      lowStockThreshold: 10,
      supplier: "",
      lastPurchaseDate: undefined,
    });
    setQtyForPrice("0");
    setTotalPriceForQty("0");
  }, [isOpen, item, reset, categoryOptions]);

  const onSubmit = (data: RawMaterialInput) => {
    const finalCategory = data.category?.trim();

    if (!finalCategory) {
      return;
    }

    const qtyNumber = Number.parseFloat(qtyForPrice || "0");
    const totalPriceNumber = Number.parseFloat(totalPriceForQty || "0");
    const computedRate =
      qtyNumber > 0 && totalPriceNumber >= 0 ? Number((totalPriceNumber / qtyNumber).toFixed(4)) : null;

    const payload: RawMaterialInput = {
      ...data,
      category: finalCategory,
      ratePerUnit: computedRate ?? data.ratePerUnit,
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

        {categoryOptions.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No categories found. Please add categories from the Material Categories page first.
          </p>
        )}

        {/* Row 3: Opening stock + Rate per unit */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={`Opening Stock (${unit || "unit"})`}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={`Qty for Total Price (${unit || "unit"})`}
            type="number"
            min="0"
            step="any"
            value={qtyForPrice}
            onChange={(e) => setQtyForPrice(e.target.value)}
            hint="Example: 1000 gram"
          />
          <Input
            label="Total Price for Above Qty (₹)"
            type="number"
            min="0"
            step="0.01"
            value={totalPriceForQty}
            onChange={(e) => setTotalPriceForQty(e.target.value)}
            hint="Example: 1000"
          />
          <p className="text-xs text-slate-500 sm:col-span-2">
            Auto unit rate: ₹
            {(() => {
              const q = Number.parseFloat(qtyForPrice || "0");
              const t = Number.parseFloat(totalPriceForQty || "0");
              if (q <= 0 || t < 0) return "0.0000";
              return (t / q).toFixed(4);
            })()}
            {unit ? ` per ${unit}` : " per unit"}
          </p>
        </div>

        {/* Row 4: Low stock threshold + Supplier */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={`Low Stock Alert Threshold (${unit || "unit"})`}
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
