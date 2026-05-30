"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BarcodeDisplay } from "./BarcodeDisplay";
import type { IFinishedProduct } from "@/types";

interface PrintBarcodeProps {
  products: IFinishedProduct[];
  isOpen: boolean;
  onClose: () => void;
}

/** Single barcode label — used in preview and print area */
function BarcodeLabel({ product }: { product: IFinishedProduct }) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 6,
        padding: "8px 6px",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          textAlign: "center",
          color: "#1a1a1a",
          lineHeight: 1.2,
          margin: 0,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {product.designName}
      </p>
      <p style={{ fontSize: 8, color: "#555", margin: 0 }}>
        {product.designCode} · Size {product.size}
      </p>
      <BarcodeDisplay
        value={product.barcodeId}
        barWidth={1.4}
        height={44}
        fontSize={8}
      />
      <p style={{ fontSize: 9, color: "#333", margin: 0 }}>
        MRP ₹{product.sellingPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

/**
 * Print-barcode label component.
 *
 * Shows a preview grid of selected products.
 * Clicking "Print" uses window.print() with injected @media print CSS
 * that hides everything except the label area.
 */
export function PrintBarcode({ products, isOpen, onClose }: PrintBarcodeProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  if (!isOpen || products.length === 0) return null;

  return (
    <>
      {/* @media print: hide UI, show only the print labels */}
      <style>{`
        @media print {
          body > * { visibility: hidden !important; }
          #dc-print-labels,
          #dc-print-labels * { visibility: visible !important; }
          #dc-print-labels {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 8mm !important;
          }
          @page { margin: 8mm; }
        }
      `}</style>

      {/* Print labels area — always in DOM while modal open */}
      <div
        id="dc-print-labels"
        ref={printAreaRef}
        style={{
          display: "none",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          padding: 8,
        }}
      >
        {products.map((p) => (
          <BarcodeLabel key={p._id} product={p} />
        ))}
      </div>

      {/* Preview modal (hidden during print) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Panel */}
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Print Barcode Labels</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {products.length} label{products.length !== 1 ? "s" : ""} selected
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Preview grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-xs text-gray-400 mb-4 text-center">
              Preview — labels will print 3 per row
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map((p) => (
                <BarcodeLabel key={p._id} product={p} />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePrint}>
              <Printer size={14} /> Print Labels
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
