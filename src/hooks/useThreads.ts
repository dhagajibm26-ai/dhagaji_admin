import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type { IThreadsStock, ThreadsStockInput, ApiResponse } from "@/types";

export const THREADS_PAGE_SIZES = [10, 20, 50, 100, 500] as const;
export type ThreadsPageSize = (typeof THREADS_PAGE_SIZES)[number];

export interface ThreadsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ThreadsPaginatedResult {
  items: IThreadsStock[];
  pagination: ThreadsPagination;
}

// ─── Query key factory ────────────────────────────────────────────────────────

export const THREADS_KEYS = {
  all: ["threads"] as const,
  lists: () => [...THREADS_KEYS.all, "list"] as const,
  listAll: () => [...THREADS_KEYS.lists(), "all"] as const,
  listPaginated: (page: number, limit: number, search: string) =>
    [...THREADS_KEYS.lists(), "page", page, limit, search] as const,
  detail: (id: string) => [...THREADS_KEYS.all, "detail", id] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchAllThreads(): Promise<IThreadsStock[]> {
  const res = await fetch("/api/threads?all=true");
  const json: ApiResponse<IThreadsStock[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch threads");
  return json.data ?? [];
}

async function fetchThreadsPaginated(
  page: number,
  limit: ThreadsPageSize,
  search: string
): Promise<ThreadsPaginatedResult> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search.trim()) params.set("search", search.trim());

  const res = await fetch(`/api/threads?${params.toString()}`);
  const json: ApiResponse<IThreadsStock[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch threads");
  return {
    items: json.data ?? [],
    pagination: json.pagination ?? {
      page,
      limit,
      total: json.data?.length ?? 0,
      totalPages: 1,
    },
  };
}

async function createThread(data: ThreadsStockInput): Promise<IThreadsStock> {
  const res = await fetch("/api/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IThreadsStock> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to add thread");
  return json.data!;
}

export interface PatchThreadsPayload {
  id: string;
  threadCode?: string;
  threadColour?: string;
  threadColourHex?: string;
  threadCompanyName?: string;
  weightPerUnit?: number;
  openingStock?: number;
  stockAdd?: number;
  netUsed?: number;
  addNetUsed?: number;
  addStockQty?: number;
  totalPurchaseAmount?: number;
  costPerUnit?: number;
}

async function patchThread({ id, ...data }: PatchThreadsPayload): Promise<IThreadsStock> {
  const res = await fetch(`/api/threads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IThreadsStock> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update thread");
  return json.data!;
}

async function deleteThread(id: string): Promise<void> {
  const res = await fetch(`/api/threads/${id}`, { method: "DELETE" });
  const json: ApiResponse = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete thread");
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Full list — for dropdowns, stats, alerts */
export function useThreadsStock() {
  return useQuery({
    queryKey: THREADS_KEYS.listAll(),
    queryFn: fetchAllThreads,
    staleTime: 1000 * 60 * 2,
  });
}

/** Paginated list — for the threads table */
export function useThreadsPaginated(page: number, limit: ThreadsPageSize, search = "") {
  return useQuery({
    queryKey: THREADS_KEYS.listPaginated(page, limit, search),
    queryFn: () => fetchThreadsPaginated(page, limit, search),
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev,
  });
}

export function useAddThread() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createThread,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: THREADS_KEYS.all });
      addToast({ type: "success", message: "Thread added successfully" });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}

export function usePatchThread() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: patchThread,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: THREADS_KEYS.all });
      addToast({ type: "success", message: "Thread updated successfully" });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: deleteThread,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: THREADS_KEYS.all });
      addToast({ type: "success", message: "Thread entry deleted" });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}
