"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  useRawMaterialsPaginated,
  useDeleteRawMaterial,
  RAW_MATERIAL_PAGE_SIZES,
  type RawMaterialPageSize,
} from "@/hooks/useRawMaterial";
import { useIsOwner } from "@/stores/useAuthStore";
import { formatGramRate, formatKgRateFromGramRate } from "@/lib/purchaseHistory";
import type { IRawMaterial } from "@/types";

function getStatus(item: IRawMaterial): "ok" | "low" | "out" {
  if (item.closingStock <= 0) return "out";
  if (item.closingStock < item.lowStockThreshold) return "low";
  return "ok";
}

function formatQty(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 4 });
}

function formatMoney(n: number, fractionDigits = 2) {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function getTotalPurchaseAmount(item: IRawMaterial) {
  return Number((item.purchasedQty * item.ratePerUnit).toFixed(2));
}

interface RawMaterialTableProps {
  onAddNew: () => void;
  onEdit: (item: IRawMaterial) => void;
}

const STATUS_BADGE: Record<"ok" | "low" | "out", { variant: "success" | "warning" | "danger"; label: string }> = {
  ok: { variant: "success", label: "OK" },
  low: { variant: "warning", label: "Low Stock" },
  out: { variant: "danger", label: "Out of Stock" },
};

function PaginationBar({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  isLoading,
}: {
  page: number;
  limit: RawMaterialPageSize;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: RawMaterialPageSize) => void;
  isLoading?: boolean;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span>
          Showing <span className="font-semibold text-slate-900">{from}–{to}</span> of{" "}
          <span className="font-semibold text-slate-900">{total}</span>
        </span>
        <label className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value) as RawMaterialPageSize)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 focus:border-[#D32F2F] focus:outline-none focus:ring-1 focus:ring-[#D32F2F]"
            aria-label="Rows per page"
          >
            {RAW_MATERIAL_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <PaginationBtn
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || !!isLoading}
          aria-label="First page"
        >
          <ChevronsLeft size={14} />
        </PaginationBtn>
        <PaginationBtn
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || !!isLoading}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </PaginationBtn>
        <span className="min-w-[5.5rem] px-2 text-center text-xs font-medium text-slate-700">
          Page {page} / {totalPages}
        </span>
        <PaginationBtn
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || !!isLoading}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </PaginationBtn>
        <PaginationBtn
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || !!isLoading}
          aria-label="Last page"
        >
          <ChevronsRight size={14} />
        </PaginationBtn>
      </div>
    </div>
  );
}

function PaginationBtn({
  children,
  onClick,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:border-[#D32F2F] hover:text-[#D32F2F] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function RawMaterialTable({ onAddNew, onEdit }: RawMaterialTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<RawMaterialPageSize>(20);
  const [selectedHsnItem, setSelectedHsnItem] = useState<IRawMaterial | null>(null);

  const { data, isLoading, isError, error, isFetching } = useRawMaterialsPaginated(page, limit);
  const deleteMutation = useDeleteRawMaterial();
  const isOwner = useIsOwner();

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, totalPages: 1 };

  useEffect(() => {
    if (pagination.totalPages > 0 && page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  const handleLimitChange = (nextLimit: RawMaterialPageSize) => {
    setLimit(nextLimit);
    setPage(1);
  };

  if (isLoading && !data) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="animate-pulse divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3">
              <div className="h-4 w-1/4 rounded bg-slate-200" />
              <div className="h-4 w-1/6 rounded bg-slate-200" />
              <div className="h-4 w-1/6 rounded bg-slate-200" />
              <div className="h-4 flex-1 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load materials: {(error as Error).message}
      </div>
    );
  }

  if (pagination.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="mb-3 text-sm text-slate-500">No raw materials added yet.</p>
        <Button onClick={onAddNew}>+ Add First Material</Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <PaginationBar
        page={pagination.page}
        limit={limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        isLoading={isFetching}
      />

      <div className="relative w-full overflow-x-auto">
        <table className="min-w-[1200px] w-full text-sm">
          <thead>
            <tr className="bg-[#D32F2F] text-left text-xs font-semibold uppercase tracking-wider text-white">
              <th className="sticky left-0 z-10 min-w-[140px] bg-[#D32F2F] px-4 py-3 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]">
                Item Name
              </th>
              <th className="min-w-[150px] whitespace-nowrap px-4 py-3">Sub Category / Details</th>
              <th className="min-w-[120px] whitespace-nowrap px-4 py-3">Category</th>
              <th className="min-w-[100px] whitespace-nowrap px-4 py-3">HSN Code</th>
              <th className="min-w-[70px] whitespace-nowrap px-4 py-3">Unit</th>
              <th className="min-w-[110px] whitespace-nowrap px-4 py-3 text-right">Stock</th>
              <th className="min-w-[160px] whitespace-nowrap px-4 py-3 text-right">Total Purchase (₹)</th>
              <th className="min-w-[120px] whitespace-nowrap px-4 py-3 text-right">1 Unit Rate</th>
              <th className="min-w-[110px] whitespace-nowrap px-4 py-3 text-right">1 kg Rate</th>
              <th className="min-w-[130px] whitespace-nowrap px-4 py-3 text-right">Low Stock Alert</th>
              <th className="min-w-[120px] whitespace-nowrap px-4 py-3">Supplier</th>
              <th className="min-w-[100px] whitespace-nowrap px-4 py-3 text-center">Status</th>
              {isOwner && (
                <th className="min-w-[130px] whitespace-nowrap px-4 py-3 text-center">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-100 ${isFetching ? "opacity-60" : ""}`}>
            {items.map((item, index) => {
              const st = getStatus(item);
              const isLow = st !== "ok";
              const totalPurchaseAmount = getTotalPurchaseAmount(item);
              const rowBg = isLow
                ? "bg-rose-50"
                : index % 2 === 0
                  ? "bg-white"
                  : "bg-slate-50/80";

              return (
                <tr key={item._id} className={`${rowBg} hover:bg-slate-100/80`}>
                  <td
                    className={`sticky left-0 z-10 whitespace-nowrap px-4 py-3 font-semibold text-[#1A1A1A] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] ${rowBg}`}
                  >
                    {item.itemName}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {item.colorType?.trim() || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.category}</td>
                  
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                    <div className="flex items-center gap-1.5">
                      {item.hsnCodes && item.hsnCodes.length > 0 ? (
                        item.hsnCodes.length === 1 ? (
                          <Badge variant="neutral" className="font-mono text-[10px] px-1.5 py-0">
                            {item.hsnCodes[0]}
                          </Badge>
                        ) : (
                          <>
                            <Badge variant="neutral" className="font-mono text-[10px] px-1.5 py-0">
                              {item.hsnCodes[0]}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => setSelectedHsnItem(item)}
                              className="inline-flex items-center rounded-full bg-red-50 hover:bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#D32F2F] ring-1 ring-inset ring-[#D32F2F]/20 cursor-pointer transition-colors"
                              title="View all HSN codes"
                            >
                              +{item.hsnCodes.length - 1}
                            </button>
                          </>
                        )
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-500">{item.unit}</td>

                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                      isLow ? "text-[#D32F2F]" : "text-[#1A1A1A]"
                    }`}
                  >
                    {formatQty(item.closingStock)} {item.unit}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                    ₹{formatMoney(totalPurchaseAmount)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                    {item.unit === "gram" ? (
                      formatGramRate(item.ratePerUnit)
                    ) : (
                      <>₹{formatMoney(item.ratePerUnit, 2)}</>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                    {item.unit === "gram" ? formatKgRateFromGramRate(item.ratePerUnit) : "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
                    {formatQty(item.lowStockThreshold)} {item.unit}
                  </td>

                  <td className="max-w-[180px] truncate whitespace-nowrap px-4 py-3 text-slate-600" title={item.supplier}>
                    {item.supplier?.trim() || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <Badge variant={STATUS_BADGE[st].variant}>{STATUS_BADGE[st].label}</Badge>
                  </td>

                  {isOwner && (
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(item)}
                          className="text-slate-700 hover:text-slate-900"
                          aria-label={`Edit ${item.itemName}`}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          isLoading={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Delete "${item.itemName}"? This cannot be undone.`)) {
                              deleteMutation.mutate(item._id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                          aria-label={`Delete ${item.itemName}`}
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
      </div>

      <div className="border-t border-slate-200">
        <PaginationBar
          page={pagination.page}
          limit={limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
          isLoading={isFetching}
        />
      </div>

      {selectedHsnItem && (
        <Modal
          isOpen={!!selectedHsnItem}
          onClose={() => setSelectedHsnItem(null)}
          title={`HSN Codes for ${selectedHsnItem.itemName}`}
          size="sm"
          footer={
            <Button onClick={() => setSelectedHsnItem(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-3 p-1">
            <p className="text-sm text-slate-500">
              This raw material is associated with the following HSN codes:
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
