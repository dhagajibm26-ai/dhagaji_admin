"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useRawMaterials, usePatchRawMaterial, useDeleteRawMaterial } from "@/hooks/useRawMaterial";
import { useIsOwner } from "@/stores/useAuthStore";
import type { IRawMaterial } from "@/types";

// ─── Derived status ────────────────────────────────────────────────────────────

function getStatus(item: IRawMaterial): "ok" | "low" | "out" {
  if (item.closingStock <= 0) return "out";
  if (item.closingStock < item.lowStockThreshold) return "low";
  return "ok";
}

// ─── Add-stock inline form ─────────────────────────────────────────────────────

function AddStockCell({ item }: { item: IRawMaterial }) {
  const [qty, setQty] = useState("");
  const patch = usePatchRawMaterial();

  const handleAdd = () => {
    const n = parseFloat(qty);
    if (!n || n <= 0) return;
    patch.mutate(
      { id: item._id, addPurchasedQty: n },
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
        placeholder="Qty"
        className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#D32F2F]"
        aria-label={`Add stock for ${item.itemName}`}
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

// ─── Inline rate editor ────────────────────────────────────────────────────────

function RateCell({ item, isOwner }: { item: IRawMaterial; isOwner: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.ratePerUnit));
  const patch = usePatchRawMaterial();

  if (!isOwner) {
    return <span className="text-sm text-gray-500">—</span>;
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1 text-sm text-gray-700 hover:text-[#D32F2F]"
        title="Click to edit rate"
      >
        ₹{item.ratePerUnit.toFixed(2)}
        <span className="hidden text-xs text-gray-400 group-hover:inline">✎</span>
      </button>
    );
  }

  const handleSave = () => {
    const n = parseFloat(value);
    if (isNaN(n) || n < 0) return;
    patch.mutate(
      { id: item._id, ratePerUnit: n },
      { onSuccess: () => setEditing(false) }
    );
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-24 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#D32F2F]"
        aria-label="Edit rate"
      />
      <Button size="sm" variant="primary" isLoading={patch.isPending} onClick={handleSave}>
        ✓
      </Button>
      <button
        className="text-xs text-gray-400 hover:text-gray-700"
        onClick={() => { setValue(String(item.ratePerUnit)); setEditing(false); }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── Main table ────────────────────────────────────────────────────────────────

interface RawMaterialTableProps {
  onAddNew: () => void;
  onEdit: (item: IRawMaterial) => void;
}

const STATUS_BADGE: Record<"ok" | "low" | "out", { variant: "success" | "warning" | "danger"; label: string }> = {
  ok: { variant: "success", label: "OK" },
  low: { variant: "warning", label: "Low Stock" },
  out: { variant: "danger", label: "Out of Stock" },
};

export function RawMaterialTable({ onAddNew, onEdit }: RawMaterialTableProps) {
  const { data: items = [], isLoading, isError, error } = useRawMaterials();
  const deleteMutation = useDeleteRawMaterial();
  const isOwner = useIsOwner();

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Skeleton rows */}
        <div className="animate-pulse divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3">
              <div className="h-4 w-1/4 rounded bg-gray-200" />
              <div className="h-4 w-1/6 rounded bg-gray-200" />
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
        Failed to load materials: {(error as Error).message}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
        <p className="mb-3 text-sm text-gray-500">No raw materials added yet.</p>
        <Button onClick={onAddNew}>+ Add First Material</Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Unit</th>
            <th className="px-4 py-3 text-right">Opening</th>
            <th className="px-4 py-3 text-right">Purchased</th>
            <th className="px-4 py-3 text-right">Used</th>
            <th className="px-4 py-3 text-right font-bold text-[#1A1A1A]">Closing</th>
            {isOwner && <th className="px-4 py-3 text-right">Rate</th>}
            {isOwner && <th className="px-4 py-3 text-right">Total Value</th>}
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3">Add Stock</th>
            {isOwner && <th className="px-4 py-3 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const st = getStatus(item);
            const isLow = st !== "ok";
            return (
              <tr
                key={item._id}
                className={
                  isLow
                    ? "bg-red-50 hover:bg-red-100"
                    : "hover:bg-gray-50"
                }
              >
                {/* Item name + color type */}
                <td className="whitespace-nowrap px-4 py-3 font-medium text-[#1A1A1A]">
                  {item.itemName}
                  {item.colorType && (
                    <span className="ml-1.5 text-xs text-gray-400">({item.colorType})</span>
                  )}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {item.category}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                  {item.unit}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-600">
                  {item.openingStock}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-green-700">
                  +{item.purchasedQty}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-orange-600">
                  -{item.usedQty}
                </td>

                {/* Closing stock — bold + red if low */}
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                    isLow ? "text-[#D32F2F]" : "text-[#1A1A1A]"
                  }`}
                >
                  {item.closingStock}
                </td>

                {/* Owner-only columns */}
                {isOwner && (
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <RateCell item={item} isOwner={isOwner} />
                  </td>
                )}
                {isOwner && (
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-gray-700">
                    ₹{item.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                )}

                {/* Status badge */}
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <Badge variant={STATUS_BADGE[st].variant}>
                    {STATUS_BADGE[st].label}
                  </Badge>
                </td>

                {/* Add stock */}
                <td className="whitespace-nowrap px-4 py-3">
                  <AddStockCell item={item} />
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
  );
}
