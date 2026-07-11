// ─── Shared report types (used by API, hook, and components) ─────────────────

export type ReportType =
  | "sales"
  | "raw-material"
  | "finished-stock"
  | "worker-payment"
  | "work-orders"
  | "profit-loss"
  | "expenses"
  | "customers"
  | "inventory"
  | "bangles-stock"
  | "threads-stock";

export interface ReportColumn {
  key: string;
  label: string;
  /** Controls display formatting in table + export */
  type?: "text" | "number" | "currency" | "date" | "badge" | "percent";
  align?: "left" | "right" | "center";
  /** Include in the summary totals row */
  isSummable?: boolean;
}

export type ReportRow = Record<string, string | number | null>;

export interface ReportSummary {
  [key: string]: number | string;
}

export interface ReportData {
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  summary?: ReportSummary;
  generatedAt: string;
  dateRange: { from: string; to: string };
}

export const REPORT_LABELS: Record<ReportType, string> = {
  "sales":          "Sales Report",
  "raw-material":   "Raw Material Stock Report",
  "finished-stock": "Finished Stock Report",
  "worker-payment": "Worker Payment Report",
  "work-orders":    "Work Orders Report",
  "profit-loss":    "Profit / Loss Report",
  "expenses":       "Expense Report",
  "customers":      "Customer Billing History",
  "inventory":      "Inventory Value Report",
  "bangles-stock":  "Bangles Stock Report",
  "threads-stock":  "Threads Stock Report",
};
