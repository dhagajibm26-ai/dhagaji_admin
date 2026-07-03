"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
  hsnCodes: z.array(z.string()).default([]),
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
    setValue,
    clearErrors,
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
      hsnCodes: [],
    },
  });

  const [hsnInput, setHsnInput] = useState("");
  const hsnCodes = useWatch({ control, name: "hsnCodes" }) || [];

  const handleAddHsn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = hsnInput.trim();
    if (!trimmed) return;
    if (!/^\d+$/.test(trimmed)) {
      setError("hsnCodes", { message: "HSN code must contain only numbers" });
      return;
    }
    if (hsnCodes.includes(trimmed)) {
      setError("hsnCodes", { message: "HSN code already added" });
      return;
    }
    setValue("hsnCodes", [...hsnCodes, trimmed], { shouldDirty: true });
    setHsnInput("");
    clearErrors("hsnCodes");
  };

  const handleRemoveHsn = (codeToRemove: string) => {
    setValue("hsnCodes", hsnCodes.filter((c) => c !== codeToRemove), { shouldDirty: true });
  };

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
      const effectiveUnitsPerPack = (item.unit === "box" || item.unit === "tube") ? safeUnitsPerPack : 1;
      const prefillQty = (item.purchasedQty || 0) / effectiveUnitsPerPack;
      const prefillAmount = Number(((item.purchasedQty || 0) * (item.ratePerUnit || 0)).toFixed(2));
      const rawHsnCodes = item.hsnCodes || [];

      reset({
        itemName: item.itemName,
        colorType: item.colorType ?? "",
        category: item.category,
        unit: item.unit === "gram" || item.unit === "box" || item.unit === "tube" || item.unit === "meter"
          ? item.unit
          : "gram",
        quantity: prefillQty,
        totalAmount: prefillAmount,
        unitsPerPack: safeUnitsPerPack,
        lowStockThreshold: item.lowStockThreshold,
        supplier: item.supplier ?? "",
        hsnCodes: rawHsnCodes,
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
      hsnCodes: [],
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
      hsnCodes: data.hsnCodes,
    };

    if (item) {
      patchMutation.mutate(
        {
          id: item._id,
          ...payloadBase,
          purchasedQty: effectiveQty,
          totalPurchaseAmount: amountNumber,
          ratePerUnit: computedRate,
          lastPurchaseDate: item.lastPurchaseDate,
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

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            HSN Codes (Optional)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={hsnInput}
                onChange={(e) => setHsnInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddHsn();
                  }
                }}
                placeholder="Type and press Enter, e.g. 8471"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
              />
            </div>
            <Button
              type="button"
              onClick={() => handleAddHsn()}
              variant="secondary"
              className="h-11 px-4 border border-slate-200 flex items-center gap-1"
            >
              <Plus size={16} /> Add
            </Button>
          </div>
          
          {errors.hsnCodes?.message && (
            <p className="text-xs text-rose-600 font-medium">{errors.hsnCodes.message}</p>
          )}

          {hsnCodes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
              {hsnCodes.map((code) => (
                <Badge
                  key={code}
                  variant="neutral"
                  className="pl-3 pr-2 py-1 font-mono text-xs flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm hover:border-rose-200 transition-colors"
                >
                  <span>{code}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHsn(code)}
                    className="rounded-full p-0.5 hover:bg-rose-50 hover:text-rose-600 transition-colors focus:outline-none cursor-pointer"
                    aria-label={`Remove HSN code ${code}`}
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
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
