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

  const [totalAmountInput, setTotalAmountInput] = useState<string>("");
  const [totalAmountError, setTotalAmountError] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
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
      hsnCodes: [],
    },
  });

  const cutType = useWatch({ control, name: "cutType" }) as keyof typeof PETA_MAP | undefined;
  const selectedSize = useWatch({ control, name: "size" });
  const quantityAdd = useWatch({ control, name: "quantityAdd" });
  const pricePerPiece = useWatch({ control, name: "pricePerPiece" });
  const peta = cutType && cutType in PETA_MAP ? PETA_MAP[cutType as keyof typeof PETA_MAP] : null;

  const [hsnInput, setHsnInput] = useState("");
  const hsnCodes = useWatch({ control, name: "hsnCodes" }) || [];

  const handleAddHsn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = hsnInput.trim();
    if (!trimmed) return;
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
    return Number(totalAmountInput || 0);
  }, [totalAmountInput]);

  const [isTotalFocused, setIsTotalFocused] = useState(false);
  const pricePerPieceVal = useWatch({ control, name: "pricePerPiece" });

  useEffect(() => {
    if (isTotalFocused) return;
    if (addPieces > 0 && pricePerPieceVal >= 0) {
      const calculatedTotal = Number((pricePerPieceVal * addPieces).toFixed(2));
      setTotalAmountInput(calculatedTotal.toString());
    }
  }, [addPieces, pricePerPieceVal, isTotalFocused]);

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
      const itemPeta = PETA_MAP[item.cutType];
      const pieces = item.quantityAdd * itemPeta;
      const initialTotal = (pieces * item.pricePerPiece).toFixed(2);
      setTotalAmountInput(initialTotal);
      setTotalAmountError("");
      reset({
        size: item.size,
        cutType: item.cutType,
        quantityAdd: item.quantityAdd,
        pricePerPiece: item.pricePerPiece,
        hsnCodes: item.hsnCodes || [],
      });
    } else {
      setTotalAmountInput("");
      setTotalAmountError("");
      reset({
        size: "",
        cutType: "C1",
        quantityAdd: 0,
        pricePerPiece: 0,
        hsnCodes: [],
      });
    }
  }, [isOpen, item, reset]);

  useEffect(() => {
    if (!isOpen || isEdit) return;
    if (selectedSize || sizeOptions.length === 0) return;
    setValue("size", sizeOptions[0], { shouldValidate: true });
  }, [isOpen, isEdit, selectedSize, sizeOptions, setValue]);

  const onSubmit = (data: BanglesStockInput) => {
    if (data.quantityAdd <= 0) {
      setError("quantityAdd", { message: "Quantity must be more than 0" });
      return;
    }

    const totalAmt = Number(totalAmountInput || 0);
    if (totalAmt <= 0) {
      setTotalAmountError("Total purchase amount must be more than 0");
      return;
    }

    if (item) {
      patchMutation.mutate(
        {
          id: item._id,
          size: data.size,
          cutType: data.cutType,
          quantityAdd: data.quantityAdd,
          pricePerPiece: Number(data.pricePerPiece || 0),
          totalPurchaseAmount: totalAmt,
          hsnCodes: data.hsnCodes,
        },
        { onSuccess: () => onClose() }
      );
    } else {
      addMutation.mutate(
        {
          ...data,
          totalPurchaseAmount: totalAmt,
        },
        { onSuccess: () => onClose() }
      );
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
            label={isEdit ? "Quantity (sets)" : "Quantity Added (sets)"}
            type="number"
            min="0"
            step="1"
            placeholder="0"
            required={!isEdit}
            error={errors.quantityAdd?.message}
            {...register("quantityAdd", { valueAsNumber: true })}
          />
          <Input
            label="Total Purchase Amount (₹)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            required={!isEdit}
            error={totalAmountError}
            value={totalAmountInput}
            onFocus={() => setIsTotalFocused(true)}
            onBlur={() => setIsTotalFocused(false)}
            onChange={(e) => {
              const val = e.target.value;
              setTotalAmountInput(val);
              if (Number(val) > 0) {
                setTotalAmountError("");
              }
              const numVal = Number(val || 0);
              if (addPieces > 0) {
                const calculatedPrice = Number((numVal / addPieces).toFixed(2));
                setValue("pricePerPiece", calculatedPrice, { shouldValidate: true });
              }
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Price per Piece (₹)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            required={!isEdit}
            error={errors.pricePerPiece?.message}
            {...register("pricePerPiece", {
              valueAsNumber: true,
              onChange: (e) => {
                const val = Number(e.target.value || 0);
                if (addPieces > 0) {
                  const calculatedTotal = Number((val * addPieces).toFixed(2));
                  setTotalAmountInput(calculatedTotal.toString());
                }
              }
            })}
          />
        </div>

        {/* HSN Codes */}
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

        {(selectedSize && cutType && Number(quantityAdd) > 0) && (
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
                {isEdit ? "Quantity" : "Add Now"}: <span className="font-semibold text-slate-900">{Number(quantityAdd || 0).toLocaleString("en-IN")} sets ({addPieces.toLocaleString("en-IN")} pcs)</span>
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
