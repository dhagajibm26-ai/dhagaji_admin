"use client";

import { useState } from "react";
import { AlertTriangle, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThreadsTable } from "./ThreadsTable";
import { AddThreadsModal } from "./AddThreadsModal";
import { useThreadsStock } from "@/hooks/useThreads";
import { useIsOwner } from "@/stores/useAuthStore";
import type { IThreadsStock } from "@/types";

function StatsBar({ items, isOwner }: { items: IThreadsStock[]; isOwner: boolean }) {
  const totalItems = items.length;
  const outOfStockCount = items.filter((i) => i.closingStock <= 0).length;
  const totalValue = items.reduce((acc, i) => acc + i.totalValue, 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Items</p>
        <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{totalItems}</p>
      </div>
      {isOwner && (
        <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Value</p>
          <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
            ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
        </div>
      )}
      <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Out of Stock</p>
        <p className={`mt-2 text-2xl font-black tabular-nums ${outOfStockCount > 0 ? "text-[#D32F2F]" : "text-emerald-600"}`}>
          {outOfStockCount}
        </p>
      </div>
    </div>
  );
}

export function ThreadsPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading, isError, error } = useThreadsStock();
  const isOwner = useIsOwner();

  const outOfStockItems = items.filter((i) => i.closingStock <= 0);

  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.threadCode.toLowerCase().includes(search.toLowerCase()) ||
          i.threadColour.toLowerCase().includes(search.toLowerCase()) ||
          i.threadCompanyName.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Threads Stock</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage thread inventory by code, colour, and company.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm" className="hidden sm:inline-flex">
          <Plus size={14} className="mr-1" />
          Add Thread
        </Button>
      </div>

      {/* Stats */}
      {!isLoading && !isError && <StatsBar items={items} isOwner={isOwner} />}

      {/* Out of stock alert */}
      {outOfStockItems.length > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D32F2F]/10 mt-0.5">
            <AlertTriangle size={14} className="text-[#D32F2F]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#D32F2F]">
              {outOfStockItems.length} thread{outOfStockItems.length > 1 ? "s" : ""} out of stock
            </p>
            <p className="mt-0.5 text-xs text-rose-600">
              {outOfStockItems.map((i) => `${i.threadCode} (${i.threadColour})`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, colour, or company…"
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F] placeholder:text-slate-400"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <ThreadsTable
        items={filtered}
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        onAddNew={() => setModalOpen(true)}
      />

      <AddThreadsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* FAB (mobile) */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-20 right-4 flex items-center justify-center rounded-2xl bg-[#D32F2F] text-white shadow-xl shadow-red-700/30 transition-all hover:bg-[#B71C1C] active:scale-95 sm:hidden"
        aria-label="Add thread stock"
        style={{ width: 52, height: 52 }}
      >
        <Plus size={22} />
      </button>
    </div>
  );
}
