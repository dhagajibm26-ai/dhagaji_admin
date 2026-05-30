"use client";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import type { DashboardData } from "@/hooks/useDashboard";

interface LowStockAlertProps {
  items: DashboardData["lowStockItems"];
}

export function LowStockAlert({ items }: LowStockAlertProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <h2 className="text-sm font-bold text-emerald-800">Stock Levels Good</h2>
        </div>
        <p className="text-xs text-emerald-600 pl-10">All raw materials are adequately stocked.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-rose-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 bg-rose-50 border-b border-rose-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D32F2F]/10">
          <AlertTriangle size={15} className="text-[#D32F2F]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#D32F2F]">Low Stock Alert</h2>
          <p className="text-[10px] text-rose-400">{items.length} item{items.length > 1 ? "s" : ""} need attention</p>
        </div>
      </div>

      {/* Items */}
      <ul className="divide-y divide-slate-50 max-h-52 overflow-y-auto">
        {items.map((item) => (
          <li key={item.name} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors">
            <Link
              href="/raw-material"
              className="text-sm text-slate-700 hover:text-[#D32F2F] truncate max-w-[65%] transition-colors font-medium"
            >
              {item.name}
            </Link>
            <span className="shrink-0 rounded-lg bg-rose-50 px-2 py-0.5 text-xs font-bold text-[#D32F2F] ring-1 ring-rose-100">
              {item.closingStock} left
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/raw-material"
        className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-[#D32F2F] hover:bg-rose-50 transition-colors border-t border-slate-50"
      >
        Manage Materials <ArrowRight size={12} />
      </Link>
    </div>
  );
}
