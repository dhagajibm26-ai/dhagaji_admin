"use client";
import { RefreshCw, TrendingDown, Receipt, Package, Layers, HardHat } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { StatCard } from "./StatCard";
import { SalesSourceChart } from "./SalesSourceChart";
import { LowStockAlert } from "./LowStockAlert";

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="skeleton h-3 w-24 rounded-lg mb-3" />
      <div className="skeleton h-8 w-32 rounded-lg mb-2" />
      <div className="skeleton h-3 w-20 rounded-lg" />
    </div>
  );
}

export function DashboardPageClient() {
  const { data, isLoading, isError, refetch, isFetching } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-7 w-48 rounded-xl mb-2" />
            <div className="skeleton h-4 w-32 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <TrendingDown size={48} className="text-slate-300" />
        <p className="text-slate-500 font-medium">Failed to load dashboard data.</p>
        <button
          onClick={() => void refetch()}
          className="px-5 py-2 text-sm font-semibold bg-[#D32F2F] text-white rounded-xl hover:bg-[#B71C1C] transition-colors shadow-md shadow-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    todaySales,
    rawMaterialValue,
    finishedStockValue,
    readyStockCount,
    pendingWorkerPayments,
    lowStockItems,
    todayProfit,
    salesBySource,
  } = data;

  const profitPositive = todayProfit.profit >= 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Business Overview</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-xs font-semibold text-[#D32F2F] border border-[#D32F2F]/30 rounded-xl px-3.5 py-2 hover:bg-rose-50 transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          value={fmt(todaySales.amount)}
          icon={<Receipt size={18} />}
          variant="default"
          subtext={`${todaySales.billCount} bill${todaySales.billCount !== 1 ? "s" : ""} today`}
        />
        <StatCard
          label="Finished Stock"
          value={fmt(finishedStockValue)}
          icon={<Package size={18} />}
          subtext={`${readyStockCount} pieces ready`}
          variant="blue"
        />
        <StatCard
          label="Raw Material"
          value={fmt(rawMaterialValue)}
          icon={<Layers size={18} />}
          variant="warning"
        />
        <StatCard
          label="Pending Wages"
          value={fmt(pendingWorkerPayments)}
          icon={<HardHat size={18} />}
          variant={pendingWorkerPayments > 0 ? "danger" : "success"}
          subtext={pendingWorkerPayments > 0 ? "Needs attention" : "All paid up"}
        />
      </div>

      {/* Chart + Low Stock Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesSourceChart salesBySource={salesBySource} />
        </div>
        <div>
          <LowStockAlert items={lowStockItems} />
        </div>
      </div>

      {/* Profit Summary */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Today&apos;s Profit Summary</h2>
            <p className="text-xs text-slate-400 mt-0.5">Revenue, costs, and net margin</p>
          </div>
          <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${profitPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {profitPositive ? "▲" : "▼"} {todayProfit.margin.toFixed(1)}% margin
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-50">
          {[
            { label: "Revenue", value: fmt(todayProfit.revenue), color: "text-slate-900" },
            { label: "Cost", value: fmt(todayProfit.cost), color: "text-slate-900" },
            { label: "Net Profit", value: fmt(todayProfit.profit), color: profitPositive ? "text-emerald-600" : "text-rose-600" },
            { label: "Margin %", value: `${todayProfit.margin.toFixed(1)}%`, color: profitPositive ? "text-emerald-600" : "text-rose-600" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center justify-center px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{item.label}</p>
              <p className={`text-xl font-black tabular-nums ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
