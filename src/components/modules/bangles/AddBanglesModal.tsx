"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAddBangles, useBanglesStock, usePatchBangles } from "@/hooks/useBangles";
import { useBangleSizes } from "@/hooks/useBangleSizes";
import { PurchaseHistoryPanel } from "@/components/ui/PurchaseHistoryPanel";
import { formatPieceRate, resolvePurchaseHistory } from "@/lib/purchaseHistory";
import { banglesStockSchema, type BanglesStockInput, type IBanglesStock } from "@/types";

const PETA_MAP = { C1: 12, C2: 24, C4: 48, C6: 72 } as const;

interface AddBanglesModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: IBanglesStock | null;
}

type BanglesFormInput = z.input<typeof banglesStockSchema>;

export function AddBanglesModal({ isOpen, onClose, item }: AddBanglesModalProps) {
  "use no memo";
  const addMutation = useAddBangles();
  const patchMutation = usePatchBangles();
  const { data: stockItems = [] } = useBanglesStock();
  const { data: sizes = [], isLoading: isSizesLoading } = useBangleSizes();
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BanglesFormInput, unknown, BanglesStockInput>({
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
  const selectedSize = useWatch({ control, name: "size" });
  const quantityAdd = useWatch({ control, name: "quantityAdd" });
  const pricePerPiece = useWatch({ control, name: "pricePerPiece" });
  const peta = cutType && cutType in PETA_MAP ? PETA_MAP[cutType as keyof typeof PETA_MAP] : null;

  const previousRows = useMemo(() => {
    if (!selectedSize || !cutType) return [] as IBanglesStock[];
    return stockItems.filter((s) => s.size === selectedSize && s.cutType === cutType);
  }, [stockItems, selectedSize, cutType]);

  const previousClosingPieces = useMemo(
    () => previousRows.reduce((sum, row) => sum + row.closingStock, 0),
    [previousRows]
  );

  const previousAmount = useMemo(
    () => previousRows.reduce((sum, row) => sum + row.totalValue, 0),
    [previousRows]
  );

  const addPieces = useMemo(() => {
    const qty = Number(quantityAdd ?? 0);
    if (!peta || !Number.isFinite(qty) || qty <= 0) return 0;
    return qty * peta;
  }, [quantityAdd, peta]);

  const addAmount = useMemo(() => {
    const price = Number(pricePerPiece ?? 0);
    if (!Number.isFinite(price) || price <= 0) return 0;
    return addPieces * price;
  }, [addPieces, pricePerPiece]);

  const projectedAmount = previousAmount + addAmount;

  const purchaseHistory = useMemo(() => {
    if (!item) return [];
    const itemPeta = PETA_MAP[item.cutType];
    const pieces = item.quantityAdd * itemPeta;
    return resolvePurchaseHistory(item.purchaseHistory, {
      quantity: pieces,
      totalAmount: Number((pieces * item.pricePerPiece).toFixed(2)),
      ratePerUnit: item.pricePerPiece,
      date: String(item.createdAt),
    });
  }, [item]);

  const sizeOptions = useMemo(() => {
    const names = sizes
      .filter((s) => s.isActive)
      .map((s) => s.name?.trim())
      .filter((s): s is string => !!s);

    if (item?.size?.trim()) {
      names.push(item.size.trim());
    }

    return [...new Set(names)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [sizes, item]);

  useEffect(() => {
    if (!isOpen) return;
    
    if (item) {
      reset({
        size: item.size,
        cutType: item.cutType,
        quantityAdd: 0,
        pricePerPiece: 0,
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

  useEffect(() => {
    if (!isOpen || isEdit) return;
    if (selectedSize || sizeOptions.length === 0) return;
    setValue("size", sizeOptions[0], { shouldValidate: true });
  }, [isOpen, isEdit, selectedSize, sizeOptions, setValue]);

  const onSubmit = (data: BanglesStockInput) => {
    if (!item && data.quantityAdd <= 0) {
      setError("quantityAdd", { message: "Quantity must be more than 0" });
      return;
    }

    if (item) {
      patchMutation.mutate(
        {
          id: item._id,
          size: data.size,
          cutType: data.cutType,
          ...(data.quantityAdd > 0
            ? {
                addQuantity: data.quantityAdd,
                totalPurchaseAmount: addAmount,
                pricePerPiece: Number(data.pricePerPiece || 0),
              }
            : {}),
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
          <Select
            label="Bangle Size"
            required
            error={errors.size?.message}
            disabled={isSizesLoading || sizeOptions.length === 0}
            {...register("size")}
          >
            <option value="">
              {isSizesLoading ? "Loading sizes..." : "Select bangle size..."}
            </option>
            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
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
            required={!isEdit}
            error={errors.quantityAdd?.message}
            {...register("quantityAdd", { valueAsNumber: true })}
          />
          <Input
            label="Price per Piece (₹)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            required={!isEdit}
            error={errors.pricePerPiece?.message}
            {...register("pricePerPiece", { valueAsNumber: true })}
          />
        </div>

        {isEdit && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Add new stock at updated price. Leave quantity at 0 to update size/cut type only.
          </p>
        )}

        {(selectedSize && cutType && (!isEdit || Number(quantityAdd) > 0)) && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              {isEdit ? "Current Purchase Calculation" : "Current Running Valuation"}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {!isEdit && (
                <>
                  <p className="text-slate-600">
                    Current Stock: <span className="font-semibold text-slate-900">{previousClosingPieces.toLocaleString("en-IN")} pcs</span>
                  </p>
                  <p className="text-slate-600">
                    Current Amount: <span className="font-semibold text-slate-900">₹{previousAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                  </p>
                </>
              )}
              <p className="text-slate-600">
                {isEdit ? "Add Sets" : "Add Now"}: <span className="font-semibold text-slate-900">{Number(quantityAdd || 0).toLocaleString("en-IN")} sets ({addPieces.toLocaleString("en-IN")} pcs)</span>
              </p>
              <p className="text-slate-600">
                {isEdit ? "Total Amount" : "Add Amount"}: <span className="font-semibold text-slate-900">₹{addAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </p>
              <p className="text-slate-600">
                Per piece rate: <span className="font-semibold text-slate-900">{formatPieceRate(Number(pricePerPiece || 0))}</span>
              </p>
              {!isEdit && (
                <p className="text-slate-700 sm:col-span-2">
                  Projected Amount: <span className="font-bold text-[#1A1A1A]">₹{projectedAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {isEdit && purchaseHistory.length > 0 && (
          <PurchaseHistoryPanel
            entries={purchaseHistory}
            quantityLabel="Pieces"
            rateLabel="Per pc"
            showKgRate={false}
            formatRate={(entry) => formatPieceRate(entry.ratePerUnit)}
          />
        )}

        {sizeOptions.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No bangle sizes found. Please add sizes from the Manage Bangle Sizes page first.
          </p>
        )}
      </form>
    </Modal>
  );
}
