import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type { IBill, BillInput, ApiResponse } from "@/types";

// ─── Key factory (TanStack Query v5) ─────────────────────────────────────────

export interface BillFilters {
  dateFrom?: string;
  dateTo?: string;
  source?: string;
  customerName?: string;
  customerPhone?: string;
}

export const BILLING_KEYS = {
  all: () => ["billing"] as const,
  lists: () => [...BILLING_KEYS.all(), "list"] as const,
  list: (filters: BillFilters) => [...BILLING_KEYS.lists(), filters] as const,
  detail: (id: string) => [...BILLING_KEYS.all(), "detail", id] as const,
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchBills(filters: BillFilters = {}): Promise<IBill[]> {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.source) params.set("source", filters.source);
  if (filters.customerName) params.set("customerName", filters.customerName);
  if (filters.customerPhone) params.set("customerPhone", filters.customerPhone);
  const qs = params.toString();
  const res = await fetch(`/api/billing${qs ? `?${qs}` : ""}`);
  const json: ApiResponse<IBill[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch bills");
  return json.data ?? [];
}

async function fetchBillById(id: string): Promise<IBill> {
  const res = await fetch(`/api/billing/${id}`);
  const json: ApiResponse<IBill> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch bill");
  return json.data!;
}

async function postBill(data: BillInput): Promise<IBill> {
  const res = await fetch("/api/billing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IBill> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create bill");
  return json.data!;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useBills(filters: BillFilters = {}) {
  return useQuery({
    queryKey: BILLING_KEYS.list(filters),
    queryFn: () => fetchBills(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function useBill(id: string) {
  return useQuery({
    queryKey: BILLING_KEYS.detail(id),
    queryFn: () => fetchBillById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateBill() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: postBill,
    onSuccess: (bill) => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.lists() });
      // Stock was deducted — refresh finished-stock cache
      qc.invalidateQueries({ queryKey: ["finished-stock"] });
      addToast({ type: "success", message: `Bill ${bill.billNumber} saved!` });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}
