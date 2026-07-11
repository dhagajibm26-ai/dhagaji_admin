"use client";
import { useState } from "react";
import { BarChart3, AlertCircle } from "lucide-react";
import { useReport } from "@/hooks/useReports";
import { ReportFilters } from "./ReportFilters";
import { ReportTable } from "./ReportTable";
import { ExportButtons } from "./ExportButtons";
import { REPORT_LABELS } from "@/types/reports";
import type { ReportFilters as FilterState } from "@/hooks/useReports";

function TableSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="h-10 skeleton" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`h-9 ${i % 2 === 0 ? "bg-slate-50" : "bg-white"}`} />
      ))}
    </div>
  );
}

export function ReportsPageClient() {
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(null);
  const { data, isLoading, isError, error } = useReport(activeFilters);

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-black text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Generate, filter, and export business reports for Dhagaji Creation.
        </p>
      </div>

      {/* Filters */}
      <ReportFilters onGenerate={setActiveFilters} isLoading={isLoading} />

      {/* Results */}
      {isLoading && <TableSkeleton />}

      {isError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3.5">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
          <p className="text-sm font-medium text-rose-700">
            {(error as Error)?.message ?? "Failed to load report. Please try again."}
          </p>
        </div>
      )}

      {data && !isLoading && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {REPORT_LABELS[activeFilters!.type]}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeFilters!.from} → {activeFilters!.to}
                &nbsp;·&nbsp;
                <span className="font-semibold text-slate-600">{data.rows.length} records</span>
                &nbsp;·&nbsp; Generated {data.generatedAt}
              </p>
            </div>
            <ExportButtons data={data} />
          </div>
          <ReportTable data={data} />
        </div>
      )}

      {/* Empty initial state */}
      {!activeFilters && !isLoading && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <BarChart3 size={40} className="text-slate-300 mb-3" />
          <p className="font-bold text-slate-600">Select a report type and click &ldquo;Generate Report&rdquo;</p>
          <p className="text-sm text-slate-400 mt-1">11 report types — Sales, Stock, Workers, P&amp;L, and more</p>
        </div>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
