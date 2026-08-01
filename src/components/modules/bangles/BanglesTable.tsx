"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { usePatchBangles, useDeleteBangles } from "@/hooks/useBangles";
import { formatPieceRate } from "@/lib/purchaseHistory";
import { useIsOwner } from "@/stores/useAuthStore";
import { formatDateDMY } from "@/lib/utils";
import type { IBanglesStock } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PETA_MAP = { C1: 12, C2: 24, C4: 48, C6: 72 } as const;

const STATUS_BADGE: Record<
  "OK" | "Low Stock" | "Out of Stock",
  { variant: "success" | "warning" | "danger"; label: string }
> = {
  OK: { variant: "success", label: "OK" },
  "Low Stock": { variant: "warning", label: "Low Stock" },
  "Out of Stock": { variant: "danger", label: "Out of Stock" },
};

// ─── Add-used inline cell ─────────────────────────────────────────────────────

function AddUsedCell({ item }: { item: IBanglesStock }) {
  const [qty, setQty] = useState("");
  const patch = usePatchBangles();

  const handleDeduct = () => {
    const n = parseInt(qty, 10);
    if (!n || n <= 0) return;
    patch.mutate(
      { id: item._id, addNetUsed: n },
      { onSuccess: () => setQty("") }
    );
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="1"
        step="1"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="pcs"
        className="w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#D32F2F]"
        aria-label={`Give pieces for size ${item.size}`}
      />
      <Button
        size="sm"
        variant="outline"
        isLoading={patch.isPending}
        onClick={handleDeduct}
        disabled={!qty || parseInt(qty, 10) <= 0}
      >
        Give
      </Button>
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

interface BanglesTableProps {
  items: IBanglesStock[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onAddNew: () => void;
  onEdit: (item: IBanglesStock) => void;
}

export function BanglesTable({ items, isLoading, isError, error, onAddNew, onEdit }: BanglesTableProps) {
  const deleteMutation = useDeleteBangles();
  const isOwner = useIsOwner();
  const [selectedHsnItem, setSelectedHsnItem] = useState<IBanglesStock | null>(null);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="animate-pulse divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3">
              <div className="h-4 w-1/6 rounded bg-gray-200" />
              <div className="h-4 w-1/8 rounded bg-gray-200" />
              <div className="h-4 w-1/8 rounded bg-gray-200" />
              <div className="h-4 flex-1 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load bangles: {error?.message}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
        <p className="mb-3 text-sm text-gray-500">No bangles stock added yet.</p>
        <Button onClick={onAddNew}>+ Add First Entry</Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-[#D32F2F] text-left text-xs font-semibold uppercase tracking-wider text-white">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Size</th>
            <th className="px-4 py-3">Cut Type</th>
            <th className="px-4 py-3">HSN Code</th>
            <th className="px-4 py-3 text-center">GST %</th>
            <th className="px-4 py-3 text-center">Peta</th>
            <th className="px-4 py-3 text-right">Qty Added</th>
            <th className="px-4 py-3 text-right">Total Pieces</th>
            {isOwner && <th className="px-4 py-3 text-right">Price/Pc (₹)</th>}
            {isOwner && <th className="px-4 py-3 text-right">Without GST (₹)</th>}
            {isOwner && <th className="px-4 py-3 text-right">GST Paid (₹)</th>}
            {isOwner && <th className="px-4 py-3 text-right">Total (With GST) (₹)</th>}
            <th className="px-4 py-3 text-right">Net Used</th>
            <th className="px-4 py-3 text-right font-bold">Closing</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3">Give to Worker</th>
            {isOwner && <th className="px-4 py-3 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const badgeInfo = STATUS_BADGE[item.status];
            const peta = PETA_MAP[item.cutType];
            const isLow = item.status !== "OK";
            const totalPurchaseAmount = item.totalPurchaseAmount || 0;
            const gstPercentage = item.gstPercentage || 0;
            const gstPaidAmount = gstPercentage > 0 ? (totalPurchaseAmount * gstPercentage) / (100 + gstPercentage) : 0;
            const amountWithoutGst = totalPurchaseAmount - gstPaidAmount;

            return (
              <tr
                key={item._id}
                className={isLow ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}
              >
                {/* Date */}
                <td className="whitespace-nowrap px-4 py-3 text-slate-500 tabular-nums">
                  {formatDateDMY(item.updatedAt)}
                </td>

                {/* Size */}
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#1A1A1A]">
                  {item.size}
                </td>

                {/* Cut Type */}
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {item.cutType}
                </td>

                {/* HSN Code */}
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                  <div className="flex items-center gap-1.5">
                    {item.hsnCode ? (
                      <Badge variant="neutral" className="font-mono text-[10px] px-1.5 py-0.5">
                        {item.hsnCode}
                      </Badge>
                    ) : item.hsnCodes && item.hsnCodes.length > 0 ? (
                      <>
                        <Badge variant="neutral" className="font-mono text-[10px] px-1.5 py-0.5">
                          {item.hsnCodes[0]}
                        </Badge>
                        {item.hsnCodes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedHsnItem(item)}
                            className="inline-flex items-center rounded-full bg-red-50 hover:bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#D32F2F] ring-1 ring-inset ring-[#D32F2F]/20 cursor-pointer transition-colors"
                            title="View all HSN codes"
                          >
                            +{item.hsnCodes.length - 1}
                          </button>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                </td>

                {/* GST % */}
                <td className="whitespace-nowrap px-4 py-3 text-center text-slate-600 tabular-nums">
                  {item.gstPercentage ? `${item.gstPercentage}%` : "—"}
                </td>

                {/* Peta (auto from cut type) */}
                <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums text-gray-500">
                  {peta} pcs/set
                </td>

                {/* Qty Added (sets) */}
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-600">
                  {item.quantityAdd}
                </td>

                {/* Total Pieces */}
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-green-700">
                  {item.totalPieces.toLocaleString("en-IN")}
                </td>

                {/* Price per piece (owner only) */}
                {isOwner && (
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">
                    {formatPieceRate(item.pricePerPiece)}
                  </td>
                )}

                {/* Without GST */}
                {isOwner && (
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
                    ₹{amountWithoutGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                )}

                {/* GST Paid */}
                {isOwner && (
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
                    {gstPaidAmount > 0 ? `₹${gstPaidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                  </td>
                )}

                {/* Total (With GST) */}
                {isOwner && (
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-slate-700">
                    ₹{totalPurchaseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                )}

                {/* Net used */}
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-orange-600">
                  -{item.netUsed.toLocaleString("en-IN")}
                </td>

                {/* Closing stock */}
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                    isLow ? "text-[#D32F2F]" : "text-[#1A1A1A]"
                  }`}
                >
                  {item.closingStock.toLocaleString("en-IN")}
                </td>

                {/* Status badge */}
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                </td>

                {/* Give pieces to worker */}
                <td className="whitespace-nowrap px-4 py-3">
                  <AddUsedCell item={item} />
                </td>

                {/* Owner: edit / delete */}
                {isOwner && (
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(item)}
                        className="text-slate-700 hover:text-slate-900"
                        aria-label={`Edit ${item.size} ${item.cutType}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isLoading={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Delete size "${item.size}" (${item.cutType})? This cannot be undone.`)) {
                            deleteMutation.mutate(item._id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                        aria-label={`Delete ${item.size} ${item.cutType}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedHsnItem && (
        <Modal
          isOpen={!!selectedHsnItem}
          onClose={() => setSelectedHsnItem(null)}
          title="HSN Codes"
          size="sm"
          footer={
            <Button onClick={() => setSelectedHsnItem(null)} variant="primary">
              Close
            </Button>
          }
        >
          <div className="space-y-3 p-1">
            <p className="text-sm text-slate-500">
              This bangles stock is associated with the following HSN codes:
            </p>
            <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3">
              {selectedHsnItem.hsnCodes?.map((code) => (
                <Badge
                  key={code}
                  variant="neutral"
                  className="font-mono text-sm px-2.5 py-1 bg-white border border-slate-200 shadow-sm"
                >
                  {code}
                </Badge>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
