"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { useBills, type BillFilters } from "@/hooks/useBilling";
import { BillBuilder } from "./BillBuilder";
import { BillPreview } from "./BillPreview";
import { Modal } from "@/components/ui/Modal";
import type { IBill, SalesSource } from "@/types";

const SOURCE_OPTIONS: { value: SalesSource | ""; label: string }[] = [
  { value: "", label: "All Sources" },
  { value: "Offline", label: "Shop" },
  { value: "Instagram", label: "Instagram" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Exhibition", label: "Exhibition" },
];

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const SOURCE_BADGES: Record<string, string> = {
  Offline: "bg-slate-100 text-slate-600",
  Instagram: "bg-pink-50 text-pink-700 ring-1 ring-pink-200",
  WhatsApp: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Exhibition: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

export function BillingPageClient() {
  const [viewBill, setViewBill] = useState<IBill | null>(null);
  const [filters, setFilters] = useState<BillFilters>({});

  const { data: bills = [], isLoading } = useBills(filters);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6 p-4 sm:p-6 animate-fade-in">
      {/* Left panel: Recent bills */}
      <aside className="hidden md:flex flex-col w-72 shrink-0 bg-white rounded-2xl border border-slate-100 overflow-hidden max-h-[calc(100vh-120px)] sticky top-4 shadow-sm">
        <div className="px-4 pt-4 pb-3 border-b border-slate-50">
          <h2 className="text-sm font-black text-slate-900 mb-3">Recent Bills</h2>
          <select
            value={filters.source ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value || undefined }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {isLoading && (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          )}
          {!isLoading && bills.length === 0 && (
            <div className="p-8 text-center">
              <Receipt size={28} className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-400">No bills yet</p>
            </div>
          )}
          {bills.map((bill) => (
            <button
              key={bill._id}
              onClick={() => setViewBill(bill)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex justify-between items-start gap-1">
                <span className="text-sm font-bold text-slate-700 group-hover:text-[#D32F2F] transition-colors">
                  {bill.billNumber}
                </span>
                <span className="text-sm font-black text-[#D32F2F] shrink-0 tabular-nums">
                  {fmt(bill.grandTotal)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate font-medium">{bill.customerName}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-slate-400">{formatDate(bill.billDate)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${SOURCE_BADGES[bill.salesSource] ?? "bg-slate-100 text-slate-600"}`}>
                  {bill.salesSource}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Right panel: Bill builder */}
      <div className="flex-1 min-w-0">
        {/* Mobile: recent bills strip */}
        <div className="md:hidden mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {bills.slice(0, 5).map((bill) => (
              <button
                key={bill._id}
                onClick={() => setViewBill(bill)}
                className="shrink-0 rounded-xl border border-slate-100 bg-white px-3 py-2 text-left text-xs shadow-sm hover:border-[#D32F2F]/30 hover:bg-rose-50 transition-all"
              >
                <p className="font-bold text-[#D32F2F]">{bill.billNumber}</p>
                <p className="text-slate-500 truncate max-w-25 mt-0.5">{bill.customerName}</p>
              </button>
            ))}
          </div>
        </div>

        <BillBuilder onBillSaved={setViewBill} />
      </div>

      {/* Bill preview modal */}
      <Modal
        isOpen={!!viewBill}
        onClose={() => setViewBill(null)}
        title={viewBill ? `Bill ${viewBill.billNumber}` : "Bill"}
        size="xl"
      >
        {viewBill && <BillPreview bill={viewBill} onClose={() => setViewBill(null)} />}
      </Modal>
    </div>
  );
}
