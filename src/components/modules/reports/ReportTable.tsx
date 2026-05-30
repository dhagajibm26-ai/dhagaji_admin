"use client";
import { useState, useMemo } from "react";
import type { ReportData, ReportColumn, ReportRow } from "@/types/reports";

const PAGE_SIZE = 50;

// ─── Cell formatters ──────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  "OK":            "bg-green-100 text-green-700",
  "Low Stock":     "bg-red-100 text-red-700",
  "Active":        "bg-green-100 text-green-700",
  "Inactive":      "bg-gray-100 text-gray-500",
  "Paid":          "bg-green-100 text-green-700",
  "Partial":       "bg-yellow-100 text-yellow-700",
  "Unpaid":        "bg-red-100 text-red-700",
  "Offline":       "bg-gray-100 text-gray-700",
  "Instagram":     "bg-purple-100 text-purple-700",
  "WhatsApp":      "bg-green-100 text-green-700",
  "Exhibition":    "bg-blue-100 text-blue-700",
  "Raw Material":  "bg-orange-100 text-orange-700",
  "Finished Stock":"bg-indigo-100 text-indigo-700",
  "Cash":          "bg-gray-100 text-gray-700",
  "UPI":           "bg-blue-100 text-blue-700",
  "Card":          "bg-indigo-100 text-indigo-700",
  "Open":          "bg-yellow-100 text-yellow-700",
  "Returned":      "bg-blue-100 text-blue-700",
  "Completed":     "bg-green-100 text-green-700",
};

function formatCell(value: string | number | null, col: ReportColumn): React.ReactNode {
  if (value === null || value === undefined) return "—";
  const type = col.type ?? "text";

  if (type === "currency" && typeof value === "number") {
    return `Rs.${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  if (type === "number" && typeof value === "number") {
    return value.toLocaleString("en-IN");
  }
  if (type === "percent" && typeof value === "number") {
    return `${value.toFixed(1)}%`;
  }
  if (type === "badge" && typeof value === "string") {
    const cls = BADGE_COLORS[value] ?? "bg-gray-100 text-gray-700";
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{value}</span>;
  }
  return String(value);
}

function sortRows(rows: ReportRow[], key: string, dir: "asc" | "desc"): ReportRow[] {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? "";
    const bv = b[key] ?? "";
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ReportTableProps {
  data: ReportData;
}

export function ReportTable({ data }: ReportTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage]       = useState(1);

  const sorted = useMemo(
    () => (sortKey ? sortRows(data.rows, sortKey, sortDir) : data.rows),
    [data.rows, sortKey, sortDir]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  if (data.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
        No data found for the selected filters.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" id="dc-report-print">
      {/* Print-only header */}
      <div className="hidden print:block p-6 border-b text-center">
        <p className="text-xl font-bold">DHAGAJI CREATION</p>
        <p className="text-base font-semibold mt-1">{data.title}</p>
        <p className="text-sm text-gray-500 mt-1">
          Period: {data.dateRange.from} to {data.dateRange.to}
        </p>
        <p className="text-xs text-gray-400">Generated: {data.generatedAt}</p>
      </div>

      {/* Row count + pagination info */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 print:hidden">
        <span className="text-xs text-gray-500">
          {sorted.length} row{sorted.length !== 1 ? "s" : ""}
          {totalPages > 1 && ` — page ${page} of ${totalPages}`}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-1">
            <PaginationBtn onClick={() => setPage(1)}          disabled={page === 1}>«</PaginationBtn>
            <PaginationBtn onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</PaginationBtn>
            <PaginationBtn onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</PaginationBtn>
            <PaginationBtn onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</PaginationBtn>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#D32F2F] text-white">
              {data.columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-3 text-left text-xs font-semibold whitespace-nowrap cursor-pointer hover:bg-[#B71C1C] transition-colors select-none ${
                    col.align === "right"  ? "text-right"  :
                    col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 opacity-80">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                {data.columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2.5 whitespace-nowrap text-[#1A1A1A] ${
                      col.align === "right"  ? "text-right"  :
                      col.align === "center" ? "text-center" : "text-left"
                    } ${col.type === "currency" || col.type === "number" || col.type === "percent" ? "font-mono text-xs" : "text-xs"}`}
                  >
                    {formatCell(row[col.key] ?? null, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* Summary row */}
          {data.summary && Object.keys(data.summary).length > 0 && (
            <tfoot>
              <tr className="bg-[#1A1A1A] text-white font-semibold">
                {data.columns.map((col, i) => (
                  <td key={col.key} className="px-3 py-2.5 text-xs whitespace-nowrap">
                    {i === 0
                      ? "TOTAL"
                      : col.isSummable && data.summary![col.key] !== undefined
                        ? formatCell(data.summary![col.key] as number, col)
                        : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t print:hidden">
          <PaginationBtn onClick={() => setPage(1)}            disabled={page === 1}>« First</PaginationBtn>
          <PaginationBtn onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹ Prev</PaginationBtn>
          <span className="text-xs text-gray-500 px-2">Page {page} / {totalPages}</span>
          <PaginationBtn onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>Next ›</PaginationBtn>
          <PaginationBtn onClick={() => setPage(totalPages)}   disabled={page === totalPages}>Last »</PaginationBtn>
        </div>
      )}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function PaginationBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 text-xs border border-gray-300 rounded hover:border-[#D32F2F] hover:text-[#D32F2F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
