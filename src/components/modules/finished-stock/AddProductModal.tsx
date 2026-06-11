"use client";

import { useEffect } from "react";
import { Lock } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  useCreateFinishedProduct,
  useUpdateFinishedProduct,
} from "@/hooks/useFinishedStock";
import type { IFinishedProduct } from "@/types";

// ─── Local form schema ────────────────────────────────────────────────────────

const schema = z.object({
  designName: z.string().min(1, "Design name required"),
  designCode: z.string().min(1, "Design code required"),
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
  const isEdit = !!product;
  const create = useCreateFinishedProduct();
  const update = useUpdateFinishedProduct();
  const isPending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    mode: "onChange",
    reValidateMode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          designName: product.designName,
          designCode: product.designCode,
          size: product.size,
          makingCostPerPc: product.makingCostPerPc,
          otherCostPerPc: product.otherCostPerPc,
          readyStock: product.readyStock,
          overrideMRP: product.mrpMarginOverride,
          customMRP: product.MRP,
          overrideSellingPrice: false,
          customSellingPrice: product.sellingPrice,
        }
      : {
          designName: "",
          designCode: "",
          size: "",
          makingCostPerPc: 0,
          otherCostPerPc: 0,
          readyStock: 0,
          overrideMRP: false,
          overrideSellingPrice: false,
        },
  });

  // ── Live watch for auto-calculations ───────────────────────────────────────
  const making = useWatch({ control, name: "makingCostPerPc" }) ?? 0;
  const other = useWatch({ control, name: "otherCostPerPc" }) ?? 0;
  const overrideMRP = useWatch({ control, name: "overrideMRP" });
  const overrideSellingPrice = useWatch({ control, name: "overrideSellingPrice" });

  const totalCost = (Number(making) || 0) + (Number(other) || 0);
  const suggestedMRP = totalCost * 4;
  const suggestedSelling = totalCost * 3;
  const suggestedWholesale = totalCost * 2.5;

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
            <Input
              label="Size"
              required
              placeholder="e.g. 2.4, S/M/L"
              error={errors.size?.message}
              autoComplete="off"
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
            <Input
              label="Making Cost / pc (₹)"
              type="number"
              min={0}
              step="0.01"
              required
              error={errors.makingCostPerPc?.message}
              {...register("makingCostPerPc", { valueAsNumber: true })}
            />
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
  );
}
