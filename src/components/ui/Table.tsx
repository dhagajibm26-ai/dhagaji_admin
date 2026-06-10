import { type ReactNode } from "react";
import { FileX } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

function getValue<T>(row: T, key: string): unknown {
  return key.split(".").reduce((obj: unknown, k) => {
    if (obj && typeof obj === "object") {
      return (obj as Record<string, unknown>)[k];
    }
    return undefined;
  }, row);
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = "No records found.",
  className,
}: TableProps<T>) {
  return (
    <div className={cn("w-full overflow-auto rounded-2xl border border-slate-100 bg-white shadow-sm", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  "px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 bg-white">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3.5">
                    <div className="skeleton h-4 rounded-lg" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <FileX size={28} className="opacity-30 text-slate-400" />
                  <p className="text-sm text-slate-400">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  "transition-colors hover:bg-slate-50/80",
                  idx % 2 === 1 && "bg-slate-50/40"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cn("px-4 py-3.5 text-slate-700", col.className)}
                  >
                    {col.render
                      ? col.render(getValue(row, String(col.key)), row)
                      : String(getValue(row, String(col.key)) ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
