"use client";

import { useState, useMemo } from "react";
import { Receipt, ArrowLeft } from "lucide-react";
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

const formatFullDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const SOURCE_BADGES: Record<string, string> = {
  Offline: "bg-slate-100 text-slate-600 border border-slate-200",
  Instagram: "bg-pink-50 text-pink-700 ring-1 ring-pink-200",
  WhatsApp: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Exhibition: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

export function BillingPageClient() {
  const [viewBill, setViewBill] = useState<IBill | null>(null);
  const [viewMode, setViewMode] = useState<"builder" | "all-bills">("builder");

  // ─── Builder/Sidebar Query ───
  const { data: bills = [], isLoading: isSidebarLoading } = useBills({});

  // ─── Directory Screen Filters & Query ───
  const now = new Date();
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(firstDayStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [selectedSource, setSelectedSource] = useState<SalesSource | "">("");

  const allBillsFilters = useMemo<BillFilters>(() => ({
    dateFrom,
    dateTo,
    source: selectedSource || undefined,
  }), [dateFrom, dateTo, selectedSource]);

  const { data: allBills = [], isLoading: isAllBillsLoading } = useBills(allBillsFilters);

  const recentBillsLimit = 10;
  const recentBills = bills.slice(0, recentBillsLimit);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6 p-4 sm:p-6 animate-fade-in">
      {viewMode === "builder" ? (
        <>
          {/* Left panel: Recent bills */}
          <aside className="hidden md:flex flex-col w-72 shrink-0 bg-white rounded-2xl border border-slate-100 overflow-hidden max-h-[calc(100vh-120px)] sticky top-4 shadow-sm">
            <div className="px-4 pt-4 pb-3 border-b border-slate-50">
              <h2 className="text-sm font-black text-slate-900">Recent Bills</h2>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {isSidebarLoading && (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton h-16 rounded-xl" />
                  ))}
                </div>
              )}
              {!isSidebarLoading && recentBills.length === 0 && (
                <div className="p-8 text-center">
                  <Receipt size={28} className="text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-400">No bills yet</p>
                </div>
              )}
              {!isSidebarLoading && recentBills.map((bill) => (
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

            {/* Show All Option */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewMode("all-bills")}
                className="w-full text-center bg-white hover:bg-slate-50 text-xs font-bold text-[#D32F2F] py-2.5 rounded-xl border border-slate-200 shadow-sm transition-colors cursor-pointer"
              >
                Show All Recent Bills
              </button>
            </div>
          </aside>

          {/* Right panel: Bill builder */}
          <div className="flex-1 min-w-0">
            {/* Mobile: recent bills strip */}
            <div className="md:hidden mb-4 flex flex-col gap-2">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {recentBills.map((bill) => (
                  <button
                    key={bill._id}
                    onClick={() => setViewBill(bill)}
                    className="shrink-0 rounded-xl border border-slate-100 bg-white px-3 py-2 text-left text-xs shadow-sm hover:border-[#D32F2F]/30 hover:bg-rose-50 transition-all font-medium"
                  >
                    <p className="font-bold text-[#D32F2F]">{bill.billNumber}</p>
                    <p className="text-slate-500 truncate max-w-25 mt-0.5">{bill.customerName}</p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setViewMode("all-bills")}
                className="w-full text-center bg-white hover:bg-slate-50 text-xs font-bold text-[#D32F2F] py-2 rounded-xl border border-slate-200 shadow-sm transition-colors cursor-pointer"
              >
                Show All Recent Bills
              </button>
            </div>

            <BillBuilder onBillSaved={setViewBill} />
          </div>
        </>
      ) : (
        /* Screen: All Bills Directory */
        <div className="flex-1 bg-white border border-slate-100 rounded-2xl shadow-sm p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h1 className="text-xl font-black text-slate-900">Recent Bills Directory</h1>
              <p className="text-sm text-slate-500 mt-0.5">Filter, search, and preview invoices</p>
            </div>
            <button
              onClick={() => setViewMode("builder")}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 border border-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              Back to Billing
            </button>
          </div>

          {/* Filters grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 pl-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 pl-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 pl-1">Sales Source</label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value as SalesSource | "")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Directory Results */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#D32F2F] border-b border-slate-100 text-left text-white">
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-white">Bill Number</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-white">Date</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-white">Customer Name</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-white">Source</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-white">Payment</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-white">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isAllBillsLoading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="flex justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#D32F2F]" />
                        <span className="text-xs text-slate-500 font-semibold">Loading bills...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!isAllBillsLoading && allBills.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-semibold text-xs">
                      No bills found for the selected criteria.
                    </td>
                  </tr>
                )}
                {!isAllBillsLoading && allBills.map((bill) => (
                  <tr
                    key={bill._id}
                    onClick={() => setViewBill(bill)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 font-black text-[#D32F2F]">{bill.billNumber}</td>
                    <td className="px-5 py-4 text-slate-600 font-medium">{formatFullDate(bill.billDate)}</td>
                    <td className="px-5 py-4 text-slate-800 font-semibold">
                      <div className="flex flex-col">
                        <span>{bill.customerName}</span>
                        {bill.customerPhone && <span className="text-[10px] text-slate-400">{bill.customerPhone}</span>}
                        {bill.customerEmail && <span className="text-[9px] text-slate-400 font-medium">{bill.customerEmail}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${SOURCE_BADGES[bill.salesSource] ?? "bg-slate-100 text-slate-600"}`}>
                        {bill.salesSource}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium">{bill.paymentMethod}</td>
                    <td className="px-5 py-4 text-right font-black text-slate-900">{fmt(bill.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
