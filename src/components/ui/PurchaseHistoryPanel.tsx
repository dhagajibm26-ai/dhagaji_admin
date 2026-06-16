"use client";

import type { PurchaseEntry } from "@/lib/purchaseHistory";
import { formatGramRate, formatKgRateFromGramRate } from "@/lib/purchaseHistory";

interface PurchaseHistoryPanelProps {
  entries: PurchaseEntry[];
  quantityLabel?: string;
  rateLabel?: string;
  showKgRate?: boolean;
  formatRate?: (entry: PurchaseEntry) => string;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function PurchaseHistoryPanel({
  entries,
  quantityLabel = "Qty",
  rateLabel = "Rate",
  showKgRate = true,
  formatRate,
}: PurchaseHistoryPanelProps) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Purchase History</p>
      <div className="mt-2 max-h-44 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-500">
              <th className="pb-2 pr-2 font-semibold">Date</th>
              <th className="pb-2 pr-2 text-right font-semibold">{quantityLabel}</th>
              <th className="pb-2 pr-2 text-right font-semibold">Amount</th>
              <th className="pb-2 pr-2 text-right font-semibold">{rateLabel}</th>
              {showKgRate && <th className="pb-2 text-right font-semibold">1 kg</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {entries.map((entry, i) => (
              <tr key={`${entry.purchasedAt}-${i}`}>
                <td className="py-2 pr-2 text-slate-600">{formatDate(entry.purchasedAt)}</td>
                <td className="py-2 pr-2 text-right tabular-nums text-slate-800">
                  {entry.quantity.toLocaleString("en-IN")}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-slate-800">
                  ₹{entry.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums font-medium text-slate-900">
                  {formatRate ? formatRate(entry) : formatGramRate(entry.ratePerUnit)}
                </td>
                {showKgRate && (
                  <td className="py-2 text-right tabular-nums text-slate-700">
                    {formatKgRateFromGramRate(entry.ratePerUnit)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
