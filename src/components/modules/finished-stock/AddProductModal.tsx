"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Plus, Trash2, Calculator } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  useCreateFinishedProduct,
  useUpdateFinishedProduct,
} from "@/hooks/useFinishedStock";
import { useSkuCategories } from "@/hooks/useSkuCategories";
import type { IFinishedProduct } from "@/types";

// ─── Local form schema ────────────────────────────────────────────────────────

const schema = z.object({
  designName: z.string().min(1, "Design name required"),
  designCode: z.string().min(1, "Design code required"),
  category: z.string().min(1, "SKU Category required").default(""),
  size: z.string().min(1, "Size required"),
  makingCostPerPc: z
    .number({ error: "Making cost required" })
    .min(0, "Must be ≥ 0"),
  otherCostPerPc: z.number().min(0).default(0),
  readyStock: z.number().min(0).default(0),
  overrideMRP: z.boolean().default(false),
  customMRP: z.number().min(0).optional(),
  overrideSellingPrice: z.boolean().default(false),
  customSellingPrice: z.number().min(0).optional(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return isNaN(n) ? "—" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pass existing product to switch to edit mode */
  product?: IFinishedProduct | null;
}

export function AddProductModal({ isOpen, onClose, product }: AddProductModalProps) {
  "use no memo";
  const isEdit = !!product;
  const create = useCreateFinishedProduct();
  const update = useUpdateFinishedProduct();
  const isPending = create.isPending || update.isPending;

  const { data: skuCategories = [] } = useSkuCategories();
  const activeSkuCategories = useMemo(() => {
    return skuCategories.filter((c) => c.isActive);
  }, [skuCategories]);

  const [subCosts, setSubCosts] = useState<{ id: number; name: string; value: number }[]>([]);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: false,
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
        designName: product.designName,
        designCode: product.designCode,
        category: product.category ?? "",
        size: product.size,
        makingCostPerPc: product.makingCostPerPc,
        otherCostPerPc: product.otherCostPerPc,
        readyStock: product.readyStock,
        overrideMRP: product.mrpMarginOverride,
        customMRP: product.mrpMarginOverride ? product.MRP : undefined,
        overrideSellingPrice: product.sellingPrice !== (product.makingCostPerPc * 3 + product.otherCostPerPc),
        customSellingPrice: product.sellingPrice,
      }
      : {
        designName: "",
        designCode: "",
        category: "",
        size: "",
        makingCostPerPc: 0,
        otherCostPerPc: 0,
        readyStock: 0,
        overrideMRP: false,
        overrideSellingPrice: false,
      },
  });

  useEffect(() => {
    if (isOpen) {
      if (product) {
        reset({
          designName: product.designName,
          designCode: product.designCode,
          category: product.category ?? "",
          size: product.size,
          makingCostPerPc: product.makingCostPerPc,
          otherCostPerPc: product.otherCostPerPc,
          readyStock: product.readyStock,
          overrideMRP: product.mrpMarginOverride,
          customMRP: product.mrpMarginOverride ? product.MRP : undefined,
          overrideSellingPrice: product.sellingPrice !== (product.makingCostPerPc * 3 + product.otherCostPerPc),
          customSellingPrice: product.sellingPrice,
        });
        setSubCosts([{ id: Date.now(), name: "Base Making Cost", value: product.makingCostPerPc }]);
      } else {
        reset({
          designName: "",
          designCode: "",
          category: "",
          size: "",
          makingCostPerPc: 0,
          otherCostPerPc: 0,
          readyStock: 0,
          overrideMRP: false,
          overrideSellingPrice: false,
        });
        setSubCosts([]);
      }
    }
  }, [isOpen, product, reset]);

  const totalSubCosts = subCosts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);

  useEffect(() => {
    if (subCosts.length > 0) {
      setValue("makingCostPerPc", Number(totalSubCosts.toFixed(2)));
    }
  }, [totalSubCosts, setValue, subCosts.length]);

  // ── Live watch for auto-calculations ───────────────────────────────────────
  const making = useWatch({ control, name: "makingCostPerPc" }) ?? 0;
  const other = useWatch({ control, name: "otherCostPerPc" }) ?? 0;
  const overrideMRP = useWatch({ control, name: "overrideMRP" });
  const overrideSellingPrice = useWatch({ control, name: "overrideSellingPrice" });

  const totalCost = (Number(making) || 0) + (Number(other) || 0);
  const suggestedMRP = (Number(making) || 0) * 4 + (Number(other) || 0);
  const suggestedSelling = (Number(making) || 0) * 3 + (Number(other) || 0);
  const suggestedWholesale = (Number(making) || 0) * 2.5 + (Number(other) || 0);

  const selectedCategoryName = useWatch({ control, name: "category" });
  
  const selectedCategoryObj = useMemo(() => {
    return activeSkuCategories.find((c) => c.name === selectedCategoryName);
  }, [activeSkuCategories, selectedCategoryName]);

  const isSizeEnabled = selectedCategoryObj ? selectedCategoryObj.isSizeFieldEnabled : false;

  // Automatically select first category if not set on creation
  useEffect(() => {
    if (isOpen && activeSkuCategories.length > 0) {
      const currentCategory = control._formValues.category;
      if (!currentCategory && !isEdit) {
        setValue("category", activeSkuCategories[0].name);
      }
    }
  }, [isOpen, activeSkuCategories, isEdit, setValue, control]);

  // Adjust size value according to selected category's toggle setting
  useEffect(() => {
    if (selectedCategoryName) {
      if (!isSizeEnabled) {
        setValue("size", "—");
      } else {
        if (product && product.category === selectedCategoryName) {
          setValue("size", product.size);
        } else {
          const currentSize = control._formValues.size;
          if (currentSize === "—") {
            setValue("size", "");
          }
        }
      }
    }
  }, [isSizeEnabled, selectedCategoryName, setValue, product, control]);

  // Reset override fields when checkbox is unchecked
  useEffect(() => {
    if (!overrideMRP) setValue("customMRP", undefined);
  }, [overrideMRP, setValue]);

  useEffect(() => {
    if (!overrideSellingPrice) setValue("customSellingPrice", undefined);
  }, [overrideSellingPrice, setValue]);

  function handleClose() {
    reset();
    onClose();
  }

  function onSubmit(data: FormOutput) {
    const finalMRP = data.overrideMRP && data.customMRP != null
      ? data.customMRP
      : suggestedMRP;
    const finalSelling = data.overrideSellingPrice && data.customSellingPrice != null
      ? data.customSellingPrice
      : suggestedSelling;

    const payload = {
      designName: data.designName,
      designCode: data.designCode,
      category: data.category,
      size: data.size,
      makingCostPerPc: data.makingCostPerPc,
      otherCostPerPc: data.otherCostPerPc,
      MRP: finalMRP,
      wholesalePrice: suggestedWholesale,
      sellingPrice: finalSelling,
      mrpMarginOverride: data.overrideMRP,
      readyStock: data.readyStock,
    };

    if (isEdit && product) {
      update.mutate({ id: product._id, data: payload }, { onSuccess: handleClose });
    } else {
      create.mutate(payload, { onSuccess: handleClose });
    }
  }

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? "Edit Product" : "Add Finished Product"}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            isLoading={isPending}
          >
            {isEdit ? "Save Changes" : "Add Product"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 py-2">
        {isEdit && product && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs shadow-sm">
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Barcode ID</p>
              <p className="font-mono text-slate-800 text-sm mt-0.5">{product.barcodeId}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Total Sold</p>
              <p className="font-semibold text-slate-800 text-sm mt-0.5">{product.totalSold} pcs</p>
            </div>
            {product.hsnCodes && product.hsnCodes.length > 0 && (
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">HSN Codes</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {product.hsnCodes.map((code) => (
                    <span key={code} className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-600 border border-slate-200">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Product Identity ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <Input
              label="Design Code"
              required
              placeholder="e.g. DC-001"
              error={errors.designCode?.message}
              autoComplete="off"
              {...register("designCode")}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Design Name"
              required
              placeholder="e.g. Red Bangle Set"
              error={errors.designName?.message}
              autoComplete="off"
              {...register("designName")}
            />
          </div>
          <div>
            <Select
              label="SKU"
              error={errors.category?.message}
              {...register("category")}
            >
              <option value="">Select SKU Category...</option>
              {activeSkuCategories.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Input
              label="Size"
              required
              placeholder={isSizeEnabled ? "e.g. 2.4, S/M/L" : "Disabled for this category"}
              error={errors.size?.message}
              autoComplete="off"
              disabled={!isSizeEnabled}
              {...register("size")}
            />
          </div>
          <div>
            <Input
              label="Initial Stock (pcs)"
              type="number"
              min={0}
              error={errors.readyStock?.message}
              {...register("readyStock", { valueAsNumber: true })}
            />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ── Costing ── */}
        <div>
          <p className="text-sm font-medium text-[#1A1A1A] mb-3">
            Costing (Owner Only)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    label="Making Cost / pc (₹)"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    error={errors.makingCostPerPc?.message}
                    {...register("makingCostPerPc", { valueAsNumber: true })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsCalcOpen(true)}
                  className="h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold text-slate-600 shadow-sm flex-shrink-0"
                  title="Calculate Making Cost"
                >
                  <Calculator size={16} className="text-slate-500" />
                  <span>Calc</span>
                  {subCosts.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-[#D32F2F] w-4 h-4 text-[9px] font-bold text-white">
                      {subCosts.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            <Input
              label="Other Cost / pc (₹)"
              type="number"
              min={0}
              step="0.01"
              hint="Packaging, overhead, etc."
              error={errors.otherCostPerPc?.message}
              {...register("otherCostPerPc", { valueAsNumber: true })}
            />
          </div>

          {/* Live calc summary */}
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-amber-700">Total Cost</p>
              <p className="font-bold text-amber-900 text-sm">{fmt(totalCost)}</p>
            </div>
            <div>
              <p className="text-amber-700">Suggested MRP (×4)</p>
              <p className="font-semibold text-amber-900">{fmt(suggestedMRP)}</p>
            </div>
            <div>
              <p className="text-amber-700">Suggested Selling (×3)</p>
              <p className="font-semibold text-amber-900">{fmt(suggestedSelling)}</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ── Pricing overrides ── */}
        <div>
          <p className="text-sm font-medium text-[#1A1A1A] mb-3">Pricing</p>
          <div className="space-y-3">
            {/* MRP */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 accent-[#D32F2F]"
                  {...register("overrideMRP")}
                />
                <span>Override MRP (default: ×4 = {fmt(suggestedMRP)})</span>
              </label>
              {overrideMRP && (
                <Input
                  label="Custom MRP (₹)"
                  type="number"
                  min={0}
                  step="0.01"
                  error={errors.customMRP?.message}
                  {...register("customMRP", { valueAsNumber: true })}
                />
              )}
            </div>

            {/* Selling Price */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 accent-[#D32F2F]"
                  {...register("overrideSellingPrice")}
                />
                <span>Override Selling Price (default: ×3 = {fmt(suggestedSelling)})</span>
              </label>
              {overrideSellingPrice && (
                <Input
                  label="Custom Selling Price (₹)"
                  type="number"
                  min={0}
                  step="0.01"
                  error={errors.customSellingPrice?.message}
                  {...register("customSellingPrice", { valueAsNumber: true })}
                />
              )}
            </div>

            {/* Wholesale — disabled (future) */}
            <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
              <Lock size={13} />
              <span>Wholesale Price (×2.5 = {fmt(suggestedWholesale)}) — coming soon</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>

    {isCalcOpen && (
      <Modal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        title="Making Cost Calculator"
        size="md"
        footer={
          <div className="flex justify-between items-center w-full">
            <div className="text-sm font-semibold text-slate-700">
              Total Making Cost: <span className="font-mono text-[#D32F2F] text-base">₹{totalSubCosts.toFixed(2)}</span>
            </div>
            <Button variant="primary" onClick={() => setIsCalcOpen(false)}>
              Apply & Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Break down the making cost into multiple parts (e.g., Labor, Beads, Polishing).
            </p>
            <button
              type="button"
              onClick={() => setSubCosts([...subCosts, { id: Date.now() + Math.random(), name: "", value: 0 }])}
              className="inline-flex items-center rounded-lg bg-red-50 hover:bg-red-100 px-2 py-1.5 text-xs font-semibold text-[#D32F2F] ring-1 ring-inset ring-[#D32F2F]/20 cursor-pointer transition-colors"
            >
              <Plus size={12} className="mr-1" /> Add Component
            </button>
          </div>

          {subCosts.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {subCosts.map((c, index) => (
                <div key={c.id} className="flex gap-2 items-center">
                  <span className="text-[10px] text-slate-400 font-bold w-5">#{index + 1}</span>
                  <input
                    type="text"
                    placeholder="e.g. Labor / Polishing"
                    value={c.name}
                    onChange={(e) => {
                      const nameVal = e.target.value;
                      setSubCosts(subCosts.map((item) => item.id === c.id ? { ...item, name: nameVal } : item));
                    }}
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-transparent shadow-sm"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={c.value || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setSubCosts(subCosts.map((item) => item.id === c.id ? { ...item, value: val } : item));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-transparent text-right shadow-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubCosts(subCosts.filter((item) => item.id !== c.id))}
                    className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                    title="Remove component"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 rounded-xl bg-slate-50 border border-dashed border-slate-200">
              <Calculator className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-medium">No cost components added yet.</p>
              <button
                type="button"
                onClick={() => setSubCosts([{ id: Date.now(), name: "", value: 0 }])}
                className="mt-2 text-xs font-semibold text-[#D32F2F] hover:underline cursor-pointer"
              >
                Create First Component
              </button>
            </div>
          )}
        </div>
      </Modal>
    )}
    </>
  );
}
