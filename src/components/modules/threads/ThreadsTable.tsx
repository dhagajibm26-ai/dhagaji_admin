"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { usePatchThread, useDeleteThread } from "@/hooks/useThreads";
import { useIsOwner } from "@/stores/useAuthStore";
import type { IThreadsStock } from "@/types";

// ─── Add stock inline cell ────────────────────────────────────────────────────

function AddStockCell({ item }: { item: IThreadsStock }) {
  const [qty, setQty] = useState("");
  const patch = usePatchThread();

  const handleAdd = () => {
    const n = parseFloat(qty);
    if (!n || n <= 0) return;
    patch.mutate(
      { id: item._id, addStockQty: n },
      { onSuccess: () => setQty("") }
    );
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        step="any"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="g"
        className="w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#D32F2F]"
        aria-label={`Add stock for ${item.threadCode}`}
      />
      <Button
        size="sm"
        variant="outline"
        isLoading={patch.isPending}
        onClick={handleAdd}
        disabled={!qty || parseFloat(qty) <= 0}
      >
        + Add
      </Button>
    </div>
  );
}

// ─── Give to worker inline cell ────────────────────────────────────────────────

function GiveCell({ item }: { item: IThreadsStock }) {
  const [qty, setQty] = useState("");
  const patch = usePatchThread();

  const handleGive = () => {
    const n = parseFloat(qty);
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
        min="0"
        step="any"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="g"
        className="w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#D32F2F]"
        aria-label={`Give thread for ${item.threadCode}`}
      />
      <Button
        size="sm"
        variant="outline"
        isLoading={patch.isPending}
        onClick={handleGive}
        disabled={!qty || parseFloat(qty) <= 0}
      >
        Give
      </Button>
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

interface ThreadsTableProps {
  items: IThreadsStock[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onAddNew: () => void;
  onEdit: (item: IThreadsStock) => void;
}

export function ThreadsTable({ items, isLoading, isError, error, onAddNew, onEdit }: ThreadsTableProps) {
  const deleteMutation = useDeleteThread();
  const isOwner = useIsOwner();

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="animate-pulse divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3">
              <div className="h-4 w-1/5 rounded bg-gray-200" />
              <div className="h-4 w-1/6 rounded bg-gray-200" />
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
        Failed to load threads: {error?.message}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
        <p className="mb-3 text-sm text-gray-500">No thread stock added yet.</p>
        <Button onClick={onAddNew}>+ Add First Thread</Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Colour</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3 text-right">Wt/Unit (g)</th>
            <th className="px-4 py-3 text-right">Opening</th>
            <th className="px-4 py-3 text-right">Stock Add</th>
            <th className="px-4 py-3 text-right">Net Used</th>
            <th className="px-4 py-3 text-right font-bold text-[#1A1A1A]">Closing</th>
            {isOwner && <th className="px-4 py-3 text-right">Cost/Unit (₹)</th>}
            {isOwner && <th className="px-4 py-3 text-right">Total Value</th>}
            <th className="px-4 py-3">Add Stock</th>
            <th className="px-4 py-3">Give</th>
            {isOwner && <th className="px-4 py-3 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const isLow = item.closingStock <= 0;

            return (
              <tr
                key={item._id}
                className={isLow ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}
              >
                {/* Thread Code */}
                <td className="whitespace-nowrap px-4 py-3 font-medium text-[#1A1A1A]">
                  {item.threadCode}
                </td>

                {/* Colour */}
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full border border-gray-300 shrink-0"
                      style={{ backgroundColor: item.threadColour.toLowerCase() }}
                      aria-hidden
                    />
                    <span className="text-gray-700">{item.threadColour}</span>
                  </div>
                </td>

                {/* Company */}
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {item.threadCompanyName}
                </td>

                {/* Weight per unit */}
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-500">
                  {item.weightPerUnit}g
                </td>

                {/* Opening stock */}
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-600">
                  {item.openingStock.toLocaleString("en-IN")}
                </td>

                {/* Stock add */}
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-green-700">
                  +{item.stockAdd.toLocaleString("en-IN")}
                </td>

                {/* Net used */}
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-orange-600">
                  -{item.netUsed.toLocaleString("en-IN")}
                </td>

                {/* Closing */}
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                    isLow ? "text-[#D32F2F]" : "text-[#1A1A1A]"
                  }`}
                >
                  {item.closingStock.toLocaleString("en-IN")}
                </td>

                {/* Cost per unit (owner) */}
                {isOwner && (
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">
                    ₹{item.costPerUnit.toFixed(2)}
                  </td>
                )}

                {/* Total value (owner) */}
                {isOwner && (
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-gray-700">
                    ₹{item.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                )}

                {/* Add stock */}
                <td className="whitespace-nowrap px-4 py-3">
                  <AddStockCell item={item} />
                </td>

                {/* Give to worker */}
                <td className="whitespace-nowrap px-4 py-3">
                  <GiveCell item={item} />
                </td>

                {/* Owner: delete */}
                {isOwner && (
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(item)}
                        className="text-slate-700 hover:text-slate-900"
                        aria-label={`Edit ${item.threadCode}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isLoading={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Delete thread "${item.threadCode}"? This cannot be undone.`)) {
                            deleteMutation.mutate(item._id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                        aria-label={`Delete ${item.threadCode}`}
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
  );
}

// Unused import guard
export type { ThreadsTableProps };
