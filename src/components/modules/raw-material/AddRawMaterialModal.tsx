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
import { useRawMaterialUnits, useCreateRawMaterialUnit, useDeleteRawMaterialUnit } from "@/hooks/useRawMaterialUnits";
import { useHsnCodes, useCreateHsnCode, useDeleteHsnCode } from "@/hooks/useHsnCodes";
import { ManageHsnCodesModal } from "../hsn-codes/ManageHsnCodesModal";
import { PurchaseHistoryPanel } from "@/components/ui/PurchaseHistoryPanel";
import { formatGramRate, formatKgRateFromGramRate, resolvePurchaseHistory } from "@/lib/purchaseHistory";
import type { IRawMaterial } from "@/types";

const formSchema = z.object({
  itemName: z.string().min(1, "Item name required"),
  colorType: z.string().optional(),
  category: z.string().min(1, "Category required"),
  unit: z.string().min(1, "Unit required"),
  quantity: z.number().min(0),
  totalAmount: z.number().min(0, "Amount must be 0 or more"),
  unitsPerPack: z.number().min(1, "Must be 1 or more").default(1),
  lowStockThreshold: z.number().min(0).default(10),
  supplier: z.string().optional(),
  hsnCode: z.string().optional().default(""),
  gstPercentage: z.number().optional().default(0),
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
  const { data: units = [] } = useRawMaterialUnits();
  const { data: hsnList = [] } = useHsnCodes("raw-material");
  const [isManagingUnits, setIsManagingUnits] = useState(false);
  const [isManagingHsn, setIsManagingHsn] = useState(false);
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
      hsnCode: "",
      gstPercentage: 0,
      hsnCodes: [],
    },
  });

  const selectedHsnCode = useWatch({ control, name: "hsnCode" });
  const gstPercentage = useWatch({ control, name: "gstPercentage" }) || 0;

  const unit = useWatch({ control, name: "unit" }) as string | undefined;
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
        unit: item.unit || "gram",
        quantity: prefillQty,
        totalAmount: prefillAmount,
        unitsPerPack: safeUnitsPerPack,
        lowStockThreshold: item.lowStockThreshold,
        supplier: item.supplier ?? "",
        hsnCode: item.hsnCode || (rawHsnCodes.length > 0 ? rawHsnCodes[0] : ""),
        gstPercentage: item.gstPercentage || 0,
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
      hsnCode: "",
      gstPercentage: 0,
      hsnCodes: [],
    });
  }, [isOpen, item, reset]);

  const effectiveUnitsPerPack = isPackUnit(unit) ? Number(unitsPerPack || 1) : 1;
  const effectiveQty = Number(quantity || 0) * effectiveUnitsPerPack;
  const computedRate = effectiveQty > 0 ? Number((Number(totalAmount || 0) / effectiveQty).toFixed(4)) : 0;

  const qtyNumber = Number(quantity || 0);
  const amountNumber = Number(totalAmount || 0);
  const gstPct = Number(gstPercentage || 0);
  const calculatedGstPaid = gstPct > 0 ? (amountNumber * gstPct) / 100 : 0;
  const perUnitRate = qtyNumber > 0 ? Number((amountNumber / qtyNumber).toFixed(4)) : 0;
  const perPieceRate = effectiveQty > 0 ? Number((amountNumber / effectiveQty).toFixed(4)) : 0;
  const perKgRate = unit === "gram" ? Number((computedRate * 1000).toFixed(2)) : null;

  const purchaseHistory = useMemo(() => {
    if (!item) return [];
    const resolved = resolvePurchaseHistory(item.purchaseHistory, {
      quantity: item.purchasedQty,
      totalAmount: Number((item.purchasedQty * item.ratePerUnit).toFixed(2)),
      ratePerUnit: item.ratePerUnit,
      date: item.lastPurchaseDate ?? String(item.createdAt),
    });
    return resolved.slice(0, 1);
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
      hsnCode: data.hsnCode || undefined,
      gstPercentage: data.gstPercentage || 0,
      hsnCodes: data.hsnCode ? [data.hsnCode] : [],
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
    <>
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="unit-select" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Unit <span className="text-[#D32F2F] ml-0.5">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsManagingUnits(true)}
                className="text-[11px] font-bold uppercase tracking-wider text-rose-600 hover:text-rose-800 transition-colors focus:outline-none cursor-pointer"
              >
                Manage
              </button>
            </div>
            <Select id="unit-select" error={errors.unit?.message} {...register("unit")}>
              <option value="">Select unit…</option>
              {units.filter((u) => u.isActive).map((u) => (
                <option key={u._id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="hsn-select" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                HSN Code (Optional)
              </label>
              <button
                type="button"
                onClick={() => setIsManagingHsn(true)}
                className="text-[11px] font-bold uppercase tracking-wider text-rose-600 hover:text-rose-800 transition-colors focus:outline-none cursor-pointer"
              >
                Manage
              </button>
            </div>
            <Select
              id="hsn-select"
              error={errors.hsnCode?.message}
              {...register("hsnCode", {
                onChange: (e) => {
                  const code = e.target.value;
                  const matched = hsnList.find((h) => h.code === code);
                  const pct = matched ? matched.gstPercentage : 0;
                  setValue("gstPercentage", pct, { shouldDirty: true });
                }
              })}
            >
              <option value="">Select HSN Code…</option>
              {hsnList.filter((h) => h.isActive || h.code === item?.hsnCode).map((h) => (
                <option key={h._id} value={h.code}>
                  {h.code}{h.label ? ` (${h.label})` : ""} — {h.gstPercentage}%
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="GST Paid (₹)"
            type="text"
            readOnly
            disabled
            value={calculatedGstPaid > 0 ? `₹${calculatedGstPaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
            hint={selectedHsnCode && gstPct > 0 ? `${gstPct}% GST of total ₹${amountNumber.toLocaleString("en-IN")}` : "Calculated when HSN & amount are selected"}
          />
        </div>

        {(addMutation.isError || patchMutation.isError) && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {((addMutation.error ?? patchMutation.error) as Error).message}
          </p>
        )}
      </form>
    </Modal>

    <ManageUnitsModal isOpen={isManagingUnits} onClose={() => setIsManagingUnits(false)} />
    <ManageHsnCodesModal isOpen={isManagingHsn} onClose={() => setIsManagingHsn(false)} scope="raw-material" />
  </>
);
}

interface ManageUnitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ManageUnitsModal({ isOpen, onClose }: ManageUnitsModalProps) {
  const { data: units = [], isLoading } = useRawMaterialUnits();
  const createMutation = useCreateRawMaterialUnit();
  const deleteMutation = useDeleteRawMaterialUnit();
  const [newUnit, setNewUnit] = useState("");

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newUnit.trim();
    if (!name) return;
    createMutation.mutate({ name, isActive: true }, {
      onSuccess: () => setNewUnit(""),
    });
  };

  const isPending = createMutation.isPending || deleteMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Units" size="sm">
      <div className="space-y-4">
        <form onSubmit={handleAdd} className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="New Unit"
              placeholder="e.g. roll, pack"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button type="submit" isLoading={createMutation.isPending} disabled={!newUnit.trim()}>
            Add
          </Button>
        </form>

        <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {isLoading ? (
            <p className="p-4 text-center text-sm text-slate-400">Loading units...</p>
          ) : units.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-400">No units defined yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {units.map((u) => (
                <li key={u._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium text-slate-700">{u.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-800 h-8 px-2"
                    isLoading={deleteMutation.isPending && deleteMutation.variables === u._id}
                    disabled={isPending}
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete unit "${u.name}"?`)) {
                        deleteMutation.mutate(u._id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}


