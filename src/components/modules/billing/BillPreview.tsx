"use client";

import { useState } from "react";
import type { IBill } from "@/types";
import { WhatsAppShare, generateBillPDF } from "./WhatsAppShare";
import { Button } from "@/components/ui/Button";
import { Printer } from "lucide-react";

interface BillPreviewProps {
  bill: IBill;
  onClose: () => void;
}

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

const fmt = (n: number) => `₹${n.toFixed(2)}`;

export function BillPreview({ bill, onClose }: BillPreviewProps) {
  const [printLoading, setPrintLoading] = useState(false);

  const handlePrint = async () => {
    setPrintLoading(true);
    try {
      const doc = await generateBillPDF(bill);
      doc.autoPrint();
      
      const pdfBlob = doc.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.border = "none";
      iframe.src = blobUrl;

      document.body.appendChild(iframe);

      // Clean up after the print dialog is triggered
      setTimeout(() => {
        try {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        } catch (e) {
          console.warn("Cleanup iframe warning:", e);
        }
        URL.revokeObjectURL(blobUrl);
      }, 6000);
    } catch (err) {
      console.error("Print bill failed:", err);
    } finally {
      setPrintLoading(false);
    }
  };

  return (
    <>
      {/* Print isolation styles are kept as fallback */}
      <style>{`
        @media print {
          body > * { visibility: hidden; }
          #dc-bill-print, #dc-bill-print * { visibility: visible; }
          #dc-bill-print {
            position: fixed; top: 0; left: 0; width: 100%;
            background: white; padding: 8mm;
          }
          @page { margin: 8mm; }
        }
      `}</style>

      <div className="flex flex-col gap-4">
        {/* ── Bill content ───────────────────────────────────────────── */}
        <div
          id="dc-bill-print"
          className="bg-white border border-gray-200 rounded-lg p-5 text-sm"
        >
          {/* Header */}
          <div className="flex flex-col items-start justify-center mb-4 pb-3 border-b border-dashed border-gray-300">
            <img src="/logo.png" className="h-10 w-auto object-contain" alt="Dhagaji Creation" />
          </div>

          {/* Bill meta */}
          <div className="flex justify-between text-xs text-gray-700 mb-3 gap-2">
            <div className="space-y-0.5">
              <p>
                <span className="font-semibold">Bill No:</span> {bill.billNumber}
              </p>
              <p>
                <span className="font-semibold">Date:</span> {formatDate(bill.billDate)}
              </p>
              <p>
                <span className="font-semibold">Source:</span> {bill.salesSource}
              </p>
            </div>
            <div className="space-y-0.5 text-right font-medium">
              <p>
                <span className="font-semibold">Customer:</span> {bill.customerName}
              </p>
              {bill.customerPhone && (
                <p>
                  <span className="font-semibold">Phone:</span> {bill.customerPhone}
                </p>
              )}
              {bill.customerAddress && (
                <p>
                  <span className="font-semibold">Address:</span> {bill.customerAddress}
                </p>
              )}
              <p>
                <span className="font-semibold">Payment:</span> {bill.paymentMethod}
              </p>
            </div>
          </div>

          {/* Items table */}
          <table className="w-full text-xs mb-3 border-collapse">
            <thead>
              <tr className="border-y border-gray-300 bg-gray-50">
                <th className="py-1.5 px-1.5 text-left font-semibold text-gray-700">Item</th>
                <th className="py-1.5 px-1.5 text-center font-semibold text-gray-700 w-10">
                  Qty
                </th>
                <th className="py-1.5 px-1.5 text-right font-semibold text-gray-700 w-20">
                  Rate
                </th>
                <th className="py-1.5 px-1.5 text-right font-semibold text-gray-700 w-20">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 px-1.5">
                    <div>{item.designName}</div>
                    {item.hsnCodes && item.hsnCodes.length > 0 && (
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        HSN: {item.hsnCodes.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 px-1.5 text-center">{item.qty}</td>
                  <td className="py-1.5 px-1.5 text-right">{fmt(item.sellingPrice)}</td>
                  <td className="py-1.5 px-1.5 text-right font-medium">
                    {fmt(item.sellingPrice * item.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="space-y-1 text-xs border-t border-gray-300 pt-2">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>{fmt(bill.subtotal)}</span>
            </div>
            {bill.discountTotal > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Item Discounts</span>
                <span>−{fmt(bill.discountTotal)}</span>
              </div>
            )}
            {(bill.billDiscount ?? 0) > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Bill Discount</span>
                <span>−{fmt(bill.billDiscount!)}</span>
              </div>
            )}
            {bill.gstEnabled && bill.taxAmount > 0 && (
              <div className="flex justify-between text-blue-700">
                <span>GST ({bill.gstRate}%)</span>
                <span>{fmt(bill.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1.5 mt-1">
              <span>GRAND TOTAL</span>
              <span className="text-[#D32F2F] text-base">{fmt(bill.grandTotal)}</span>
            </div>
          </div>

          {/* Footer */}
          {bill.gstEnabled && bill.gstNumber && (
            <p className="text-xs text-gray-500 mt-2">GSTIN: {bill.gstNumber}</p>
          )}
          <div className="mt-3 pt-2 border-t border-dashed border-gray-300 text-center text-xs text-gray-400">
            Thank you for shopping with Dhagaji Creation!
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────── */}
        <WhatsAppShare bill={bill} />

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handlePrint} isLoading={printLoading}>
            {printLoading ? "Preparing Print..." : (
              <span className="flex items-center gap-2">
                <Printer size={14} /> Print Bill
              </span>
            )}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={printLoading}>
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
