"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Search, Plus, Ruler } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BanglesTable } from "./BanglesTable";
import { AddBanglesModal } from "./AddBanglesModal";
import { useBanglesStock } from "@/hooks/useBangles";
import { useIsOwner } from "@/stores/useAuthStore";
import type { IBanglesStock } from "@/types";

function StatsBar({ items, isOwner }: { items: IBanglesStock[]; isOwner: boolean }) {
  const totalItems = items.length;
  const lowStockCount = items.filter((i) => i.status !== "OK").length;
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
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Low / Out</p>
        <p className={`mt-2 text-2xl font-black tabular-nums ${lowStockCount > 0 ? "text-[#D32F2F]" : "text-emerald-600"}`}>
          {lowStockCount}
        </p>
      </div>
    </div>
  );
}

export function BanglesPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<IBanglesStock | null>(null);
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading, isError, error } = useBanglesStock();
  const isOwner = useIsOwner();

  const openCreateModal = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const openEditModal = (item: IBanglesStock) => {
    setEditItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
  };

  const lowStockItems = items.filter((i) => i.status !== "OK");

  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.size.toLowerCase().includes(search.toLowerCase()) ||
          i.cutType.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Bangles Stock</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Track bangle sizes, cut types, and closing stock by pieces.
          </p>
        </div>
        <div className="hidden sm:flex sm:items-center sm:gap-2">
          {isOwner && (
            <Link href="/bangle-sizes" className="inline-flex">
              <Button variant="outline" size="sm">
                <Ruler size={14} className="mr-1" />
                Manage Sizes
              </Button>
            </Link>
          )}
          <Button onClick={openCreateModal} size="sm" className="hidden sm:inline-flex">
            <Plus size={14} className="mr-1" />
            Add Bangles
          </Button>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && !isError && <StatsBar items={items} isOwner={isOwner} />}

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D32F2F]/10 mt-0.5">
            <AlertTriangle size={14} className="text-[#D32F2F]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#D32F2F]">
              {lowStockItems.length} size{lowStockItems.length > 1 ? "s" : ""} low or out of stock
            </p>
            <p className="mt-0.5 text-xs text-rose-600">
              {lowStockItems.map((i) => `${i.size} (${i.cutType})`).join(", ")}
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
            placeholder="Search by size or cut type…"
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

      <BanglesTable
        items={filtered}
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        onAddNew={openCreateModal}
        onEdit={openEditModal}
      />

      <AddBanglesModal isOpen={modalOpen} onClose={closeModal} item={editItem} />

      {/* FAB (mobile) */}
      <button
        onClick={openCreateModal}
        className="fixed bottom-20 right-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-[#D32F2F] text-white shadow-xl shadow-red-700/30 transition-all hover:bg-[#B71C1C] active:scale-95 sm:hidden"
        aria-label="Add bangles stock"
        style={{ width: 52, height: 52 }}
      >
        <Plus size={22} />
      </button>
    </div>
  );
}
