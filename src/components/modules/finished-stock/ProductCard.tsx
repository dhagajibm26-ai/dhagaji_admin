"use client";

import { useIsOwner } from "@/stores/useAuthStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Printer } from "lucide-react";
import { BarcodeDisplay } from "./BarcodeDisplay";
import type { IFinishedProduct } from "@/types";

interface ProductCardProps {
  product: IFinishedProduct;
  onPrint: (product: IFinishedProduct) => void;
  onEdit: (product: IFinishedProduct) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

const LOW_STOCK_THRESHOLD = 5;

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ProductCard({
  product,
  onPrint,
  onEdit,
  isSelected = false,
  onSelect,
}: ProductCardProps) {
  const isOwner = useIsOwner();
  const isLowStock = product.readyStock < LOW_STOCK_THRESHOLD;

  return (
    <div
      className={`relative rounded-xl border bg-white shadow-sm flex flex-col gap-3 p-4 transition-colors ${
        isSelected ? "border-[#D32F2F] ring-1 ring-[#D32F2F]" : "border-gray-200"
      }`}
    >
      {/* Select checkbox (bulk print) */}
      {onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(product._id)}
          className="absolute top-3 right-3 h-4 w-4 rounded border-gray-300 accent-[#D32F2F] cursor-pointer"
          aria-label={`Select ${product.designName}`}
        />
      )}

      {/* Header */}
      <div className="pr-6">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[#1A1A1A] text-sm leading-tight">
            {product.designName}
          </p>
          {product.category && (
            <Badge variant="info" className="text-[9px] px-1.5 py-0 shrink-0">
              {product.category}
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Code: <span className="font-medium text-[#1A1A1A]">{product.designCode}</span>
          {" · "}Size: <span className="font-medium text-[#1A1A1A]">{product.size}</span>
        </p>
      </div>

      {/* Barcode */}
      <div className="flex justify-center bg-gray-50 rounded-lg p-2 overflow-hidden">
        <BarcodeDisplay
          value={product.barcodeId}
          barWidth={1.5}
          height={50}
          fontSize={10}
          className="max-h-20"
        />
      </div>

      {/* Stock + Pricing */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Ready Stock */}
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="text-gray-500">Ready Stock</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className={`font-bold text-sm ${isLowStock ? "text-[#D32F2F]" : "text-[#1A1A1A]"}`}>
              {product.readyStock} pcs
            </p>
            {isLowStock && (
              <Badge variant="danger" className="text-[9px] px-1.5 py-0">Low</Badge>
            )}
          </div>
        </div>

        {/* Selling Price */}
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="text-gray-500">Selling Price</p>
          <p className="font-bold text-sm text-[#1A1A1A] mt-0.5">
            ₹{fmt(product.sellingPrice)}
          </p>
        </div>

        {/* Owner-only pricing data */}
        {isOwner && (
          <>
            <div className="rounded-lg bg-amber-50 p-2">
              <p className="text-amber-700">Total Cost</p>
              <p className="font-semibold text-[#1A1A1A] mt-0.5">
                ₹{fmt(product.totalCost)}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2">
              <p className="text-amber-700">MRP</p>
              <p className="font-semibold text-[#1A1A1A] mt-0.5">
                ₹{fmt(product.MRP)}
              </p>
            </div>
            <div className="col-span-2 rounded-lg bg-green-50 p-2 flex justify-between items-center">
              <div>
                <p className="text-green-700">Profit / pc</p>
                <p className="font-semibold text-green-900 mt-0.5">
                  ₹{fmt(product.profitPerPc)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-green-700">Total Revenue</p>
                <p className="font-semibold text-green-900 mt-0.5">
                  ₹{fmt(product.totalRevenue)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onPrint(product)}
        >
          <Printer size={14} /> Print Label
        </Button>
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onEdit(product)}
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
