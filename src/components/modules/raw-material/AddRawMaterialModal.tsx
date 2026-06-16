"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAddRawMaterial, usePatchRawMaterial } from "@/hooks/useRawMaterial";
import { useMaterialCategories } from "@/hooks/useMaterialCategories";
import { PurchaseHistoryPanel } from "@/components/ui/PurchaseHistoryPanel";
import { formatGramRate, formatKgRateFromGramRate, resolvePurchaseHistory } from "@/lib/purchaseHistory";
import type { IRawMaterial } from "@/types";

const UNITS = ["gram", "tube", "box", "meter"] as const;
type UnitType = (typeof UNITS)[number];

const formSchema = z.object({
  itemName: z.string().min(1, "Item name required"),
  colorType: z.string().optional(),
  category: z.string().min(1, "Category required"),
  unit: z.enum(UNITS),
  quantity: z.number().min(0),
  totalAmount: z.number().min(0, "Amount must be 0 or more"),
  unitsPerPack: z.number().min(1, "Must be 1 or more").default(1),
  lowStockThreshold: z.number().min(0).default(10),
  supplier: z.string().optional(),
});

type RawMaterialFormInput = z.input<typeof formSchema>;
type RawMaterialFormOutput = z.output<typeof formSchema>;

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: IRawMaterial | null;
}

function isPackUnit(unit?: string): unit is "box" | "tube" {
  return unit === "box" || unit === "tube";
}

export function AddRawMaterialModal({ isOpen, onClose, item }: AddRawMaterialModalProps) {
  "use no memo";
  const addMutation = useAddRawMaterial();
  const patchMutation = usePatchRawMaterial();
  const { data: categories = [] } = useMaterialCategories();
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RawMaterialFormInput, unknown, RawMaterialFormOutput>({
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: false,
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemName: "",
      colorType: "",
      category: "",
      unit: "gram",
      quantity: 0,
      totalAmount: 0,
      unitsPerPack: 1,
      lowStockThreshold: 10,
      supplier: "",
    },
  });

  const unit = useWatch({ control, name: "unit" }) as UnitType | undefined;
  const quantity = useWatch({ control, name: "quantity" });
  const totalAmount = useWatch({ control, name: "totalAmount" });
  const unitsPerPack = useWatch({ control, name: "unitsPerPack" });

  const categoryOptions = useMemo(() => {
    const fromCategoryMaster = categories
      .filter((c) => c.isActive)
      .map((c) => c.name?.trim())
      .filter((c): c is string => !!c);

    const unique = new Set<string>([...fromCategoryMaster]);
    if (item?.category?.trim()) unique.add(item.category.trim());

    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [categories, item]);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    if (item) {
      const safeUnitsPerPack = Number(item.unitsPerPack || 1);
      reset({
        itemName: item.itemName,
        colorType: item.colorType ?? "",
        category: item.category,
        unit: item.unit === "gram" || item.unit === "box" || item.unit === "tube" || item.unit === "meter"
          ? item.unit
          : "gram",
        quantity: 0,
        totalAmount: 0,
        unitsPerPack: safeUnitsPerPack,
        lowStockThreshold: item.lowStockThreshold,
        supplier: item.supplier ?? "",
      });
      return;
    }

    reset({
      itemName: "",
      colorType: "",
      category: "",
      unit: "gram",
      quantity: 0,
      totalAmount: 0,
      unitsPerPack: 1,
      lowStockThreshold: 10,
      supplier: "",
    });
  }, [isOpen, item, reset]);

  const effectiveUnitsPerPack = isPackUnit(unit) ? Number(unitsPerPack || 1) : 1;
  const effectiveQty = Number(quantity || 0) * effectiveUnitsPerPack;
  const computedRate = effectiveQty > 0 ? Number((Number(totalAmount || 0) / effectiveQty).toFixed(4)) : 0;

  const qtyNumber = Number(quantity || 0);
  const amountNumber = Number(totalAmount || 0);
  const perUnitRate = qtyNumber > 0 ? Number((amountNumber / qtyNumber).toFixed(4)) : 0;
  const perPieceRate = effectiveQty > 0 ? Number((amountNumber / effectiveQty).toFixed(4)) : 0;
  const perKgRate = unit === "gram" ? Number((computedRate * 1000).toFixed(2)) : null;

  const purchaseHistory = useMemo(() => {
    if (!item) return [];
    return resolvePurchaseHistory(item.purchaseHistory, {
      quantity: item.purchasedQty,
      totalAmount: Number((item.purchasedQty * item.ratePerUnit).toFixed(2)),
      ratePerUnit: item.ratePerUnit,
      date: item.lastPurchaseDate ?? String(item.createdAt),
    });
  }, [item]);

  const onSubmit = (data: RawMaterialFormOutput) => {
    const finalCategory = data.category?.trim();
    if (!finalCategory) return;

    if (!item && effectiveQty <= 0) {
      setError("quantity", { message: "Quantity must be more than 0" });
      return;
    }

    const payloadBase = {
      itemName: data.itemName.trim(),
      colorType: data.colorType?.trim() || undefined,
      category: finalCategory,
      unit: data.unit,
      unitsPerPack: isPackUnit(data.unit) ? Number(data.unitsPerPack || 1) : 1,
      lowStockThreshold: data.lowStockThreshold,
      supplier: data.supplier?.trim() || undefined,
    };

    if (item) {
      patchMutation.mutate(
        {
          id: item._id,
          ...payloadBase,
          ...(effectiveQty > 0
            ? {
                addPurchasedQty: effectiveQty,
                totalPurchaseAmount: amountNumber,
                ratePerUnit: computedRate,
                lastPurchaseDate: new Date().toISOString(),
              }
            : {}),
        },
        { onSuccess: () => onClose() }
      );
      return;
    }

    addMutation.mutate(
      {
        ...payloadBase,
        openingStock: 0,
        purchasedQty: effectiveQty,
        usedQty: 0,
        ratePerUnit: computedRate,
        lastPurchaseDate: new Date().toISOString(),
      },
      { onSuccess: () => onClose() }
    );
  };

  const isMutating = isSubmitting || addMutation.isPending || patchMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Raw Material" : "Add Raw Material"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isMutating}>
            Cancel
          </Button>
          <Button type="submit" form="add-raw-material-form" isLoading={isMutating}>
            {isEdit ? "Update Material" : "Add Material"}
          </Button>
        </>
      }
    >
      <form id="add-raw-material-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Item Name"
            placeholder="e.g. PVC Line"
            required
            error={errors.itemName?.message}
            autoComplete="off"
            {...register("itemName")}
          />
          <Input
            label="Sub Category / Details"
            placeholder="e.g. White, 2mm"
            error={errors.colorType?.message}
            autoComplete="off"
            {...register("colorType")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Category" required error={errors.category?.message} {...register("category")}>
            <option value="">Select category…</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Select label="Unit" required error={errors.unit?.message} {...register("unit")}>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={unit ? `Add Stock (${unit})` : "Add Stock"}
            type="number"
            min="0"
            step="any"
            placeholder="0"
            required={!isEdit}
            error={errors.quantity?.message}
            {...register("quantity", { valueAsNumber: true })}
          />

          <Input
            label="Total Purchase Amount (₹)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            required={!isEdit}
            error={errors.totalAmount?.message}
            {...register("totalAmount", { valueAsNumber: true })}
          />
        </div>

        {isEdit && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Add new stock at updated price (e.g. ₹1000/kg → ₹1200/kg). Leave stock at 0 to update details only.
          </p>
        )}

        {isPackUnit(unit) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={unit === "box" ? "Pieces per Box" : "Pieces per Tube"}
              type="number"
              min="1"
              step="1"
              required
              error={errors.unitsPerPack?.message}
              {...register("unitsPerPack", { valueAsNumber: true })}
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Effective total pieces: <span className="font-semibold">{effectiveQty.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Current Purchase Calculation</p>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p className="text-slate-600">
              Quantity: <span className="font-semibold text-slate-900">{qtyNumber.toLocaleString("en-IN")} {unit || "unit"}</span>
            </p>
            <p className="text-slate-600">
              Total Amount: <span className="font-semibold text-slate-900">₹{amountNumber.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </p>

            {unit === "gram" && (
              <>
                <p className="text-slate-600">
                  1 gram rate: <span className="font-semibold text-slate-900">{formatGramRate(computedRate)}</span>
                </p>
                <p className="text-slate-600">
                  1 kg rate: <span className="font-semibold text-slate-900">{formatKgRateFromGramRate(computedRate)}</span>
                </p>
              </>
            )}

            {unit === "box" && (
              <>
                <p className="text-slate-600">
                  Per box rate: <span className="font-semibold text-slate-900">₹{perUnitRate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </p>
                <p className="text-slate-600">
                  Total pieces: <span className="font-semibold text-slate-900">{effectiveQty.toLocaleString("en-IN")}</span>
                </p>
                <p className="text-slate-600 sm:col-span-2">
                  Per piece rate: <span className="font-semibold text-slate-900">₹{perPieceRate.toLocaleString("en-IN", { maximumFractionDigits: 4 })}</span>
                </p>
              </>
            )}

            {unit === "tube" && (
              <>
                <p className="text-slate-600">
                  Per tube rate: <span className="font-semibold text-slate-900">₹{perUnitRate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </p>
                <p className="text-slate-600">
                  Total pieces: <span className="font-semibold text-slate-900">{effectiveQty.toLocaleString("en-IN")}</span>
                </p>
                <p className="text-slate-600 sm:col-span-2">
                  Per piece rate: <span className="font-semibold text-slate-900">₹{perPieceRate.toLocaleString("en-IN", { maximumFractionDigits: 4 })}</span>
                </p>
              </>
            )}

            {unit === "meter" && (
              <p className="text-slate-600 sm:col-span-2">
                Per meter rate: <span className="font-semibold text-slate-900">₹{computedRate.toLocaleString("en-IN", { maximumFractionDigits: 4 })}</span>
              </p>
            )}
          </div>
        </div>

        {isEdit && purchaseHistory.length > 0 && (
          <PurchaseHistoryPanel
            entries={purchaseHistory}
            quantityLabel={unit === "gram" ? "Qty (g)" : "Qty"}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={unit ? `Low Stock Alert (${unit})` : "Low Stock Alert"}
            type="number"
            min="0"
            step="any"
            placeholder="10"
            hint="Alert when stock goes below this"
            error={errors.lowStockThreshold?.message}
            {...register("lowStockThreshold", { valueAsNumber: true })}
          />
          <Input
            label="Supplier (Optional)"
            placeholder="Supplier name"
            error={errors.supplier?.message}
            {...register("supplier")}
          />
        </div>

        {(addMutation.isError || patchMutation.isError) && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {((addMutation.error ?? patchMutation.error) as Error).message}
          </p>
        )}
      </form>
    </Modal>
  );
}
