import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type { IThreadsStock, ThreadsStockInput, ApiResponse } from "@/types";

// ─── Query key factory ────────────────────────────────────────────────────────

export const THREADS_KEYS = {
  all: ["threads"] as const,
  lists: () => [...THREADS_KEYS.all, "list"] as const,
  detail: (id: string) => [...THREADS_KEYS.all, "detail", id] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchThreads(): Promise<IThreadsStock[]> {
  const res = await fetch("/api/threads");
  const json: ApiResponse<IThreadsStock[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch threads");
  return json.data ?? [];
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
  addNetUsed?: number;
  addStockQty?: number;
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

export function useThreadsStock() {
  return useQuery({
    queryKey: THREADS_KEYS.lists(),
    queryFn: fetchThreads,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAddThread() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createThread,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: THREADS_KEYS.lists() });
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
      qc.invalidateQueries({ queryKey: THREADS_KEYS.lists() });
      addToast({ type: "success", message: "Thread stock updated" });
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
      qc.invalidateQueries({ queryKey: THREADS_KEYS.lists() });
      addToast({ type: "success", message: "Thread entry deleted" });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}
