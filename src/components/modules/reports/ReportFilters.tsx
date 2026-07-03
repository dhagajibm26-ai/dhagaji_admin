"use client";
import { useState, useCallback } from "react";
import type { ReportType } from "@/types/reports";
import { REPORT_LABELS } from "@/types/reports";
import type { ReportFilters } from "@/hooks/useReports";
import { useWorkers } from "@/hooks/useWorkers";

type QuickRange = "today" | "week" | "month" | "custom";

interface ReportFiltersProps {
  onGenerate: (filters: ReportFilters) => void;
  isLoading?: boolean;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function monthStartStr() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}
function weekStartStr() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

const ALL_TYPES = Object.entries(REPORT_LABELS) as [ReportType, string][];

const QUICK_RANGES: { label: string; value: QuickRange }[] = [
  { label: "Today",      value: "today"  },
  { label: "This Week",  value: "week"   },
  { label: "This Month", value: "month"  },
  { label: "Custom",     value: "custom" },
];

export function ReportFilters({ onGenerate, isLoading }: ReportFiltersProps) {
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [quick,      setQuick]      = useState<QuickRange>("month");
  const [customFrom, setCustomFrom] = useState(daysAgoStr(30));
  const [customTo,   setCustomTo]   = useState(todayStr());
  const [workerId,   setWorkerId]   = useState<string>("all");

  const { data: workers = [] } = useWorkers();

  const getRange = useCallback((): { from: string; to: string } => {
    switch (quick) {
      case "today":  return { from: todayStr(),    to: todayStr() };
      case "week":   return { from: weekStartStr(), to: todayStr() };
      case "month":  return { from: monthStartStr(), to: todayStr() };
      case "custom": return { from: customFrom,    to: customTo };
    }
  }, [quick, customFrom, customTo]);

  const handleGenerate = () => {
    const { from, to } = getRange();
    onGenerate({
      type: reportType,
      from,
      to,
      workerId: reportType === "worker-payment" ? workerId : undefined,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <h2 className="text-base font-semibold text-[#1A1A1A]">Report Filters</h2>

      {/* Report type */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Report Type</label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportType)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
        >
          {ALL_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Worker selection */}
      {reportType === "worker-payment" && (
        <div className="animate-fade-in">
          <label className="block text-xs font-medium text-gray-600 mb-1">Select Worker</label>
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
          >
            <option value="all">All Workers</option>
            {workers.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quick range */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Date Range</label>
        <div className="flex gap-2 flex-wrap">
          {QUICK_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setQuick(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                quick === r.value
                  ? "bg-[#D32F2F] text-white border-[#D32F2F]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-[#D32F2F] hover:text-[#D32F2F]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date pickers */}
      {quick === "custom" && (
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-36">
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]"
            />
          </div>
          <div className="flex-1 min-w-36">
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayStr()}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]"
            />
          </div>
        </div>
      )}

      {/* Generate */}
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full bg-[#D32F2F] hover:bg-[#B71C1C] disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
      >
        {isLoading ? "Generating…" : "Generate Report"}
      </button>
    </div>
  );
}
