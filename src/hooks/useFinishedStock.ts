import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type {
  IFinishedProduct,
  FinishedProductInput,
  ApiResponse,
} from "@/types";

// ─── Key factory (TanStack Query v5 pattern) ──────────────────────────────────

export const FINISHED_STOCK_KEYS = {
  all: () => ["finished-stock"] as const,
  lists: () => [...FINISHED_STOCK_KEYS.all(), "list"] as const,
  detail: (id: string) => [...FINISHED_STOCK_KEYS.all(), "detail", id] as const,
  barcode: (barcodeId: string) =>
    [...FINISHED_STOCK_KEYS.all(), "barcode", barcodeId] as const,
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchFinishedStock(): Promise<IFinishedProduct[]> {
  const res = await fetch("/api/finished-stock");
  const json: ApiResponse<IFinishedProduct[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch finished stock");
  return json.data ?? [];
}

async function createFinishedProduct(
  data: FinishedProductInput
): Promise<IFinishedProduct> {
  const res = await fetch("/api/finished-stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IFinishedProduct> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create product");
  return json.data!;
}

async function updateFinishedProduct(
  id: string,
  data: Partial<FinishedProductInput>
): Promise<IFinishedProduct> {
  const res = await fetch(`/api/finished-stock/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IFinishedProduct> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update product");
  return json.data!;
}

/** Imperative lookup — call from scanner onScan callback or billing module. */
export async function lookupBarcode(barcodeId: string): Promise<IFinishedProduct> {
  const res = await fetch(
    `/api/finished-stock/barcode/${encodeURIComponent(barcodeId)}`
  );
  const json: ApiResponse<IFinishedProduct> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Product not found");
  return json.data!;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useFinishedStock() {
  return useQuery({
    queryKey: FINISHED_STOCK_KEYS.lists(),
    queryFn: fetchFinishedStock,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateFinishedProduct() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createFinishedProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FINISHED_STOCK_KEYS.lists() });
      addToast({ type: "success", message: "Product added to finished stock" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useUpdateFinishedProduct() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<FinishedProductInput>;
    }) => updateFinishedProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FINISHED_STOCK_KEYS.lists() });
      addToast({ type: "success", message: "Product updated" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

