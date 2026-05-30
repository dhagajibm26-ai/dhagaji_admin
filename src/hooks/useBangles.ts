import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type { IBanglesStock, BanglesStockInput, ApiResponse } from "@/types";

// ─── Query key factory ────────────────────────────────────────────────────────

export const BANGLES_KEYS = {
  all: ["bangles"] as const,
  lists: () => [...BANGLES_KEYS.all, "list"] as const,
  detail: (id: string) => [...BANGLES_KEYS.all, "detail", id] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchBangles(): Promise<IBanglesStock[]> {
  const res = await fetch("/api/bangles");
  const json: ApiResponse<IBanglesStock[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch bangles stock");
  return json.data ?? [];
}

async function createBangles(data: BanglesStockInput): Promise<IBanglesStock> {
  const res = await fetch("/api/bangles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IBanglesStock> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to add bangles");
  return json.data!;
}

export interface PatchBanglesPayload {
  id: string;
  addNetUsed?: number;
  addQuantity?: number;
  pricePerPiece?: number;
}

async function patchBangles({ id, ...data }: PatchBanglesPayload): Promise<IBanglesStock> {
  const res = await fetch(`/api/bangles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IBanglesStock> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update bangles");
  return json.data!;
}

async function deleteBangles(id: string): Promise<void> {
  const res = await fetch(`/api/bangles/${id}`, { method: "DELETE" });
  const json: ApiResponse = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete bangles entry");
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useBanglesStock() {
  return useQuery({
    queryKey: BANGLES_KEYS.lists(),
    queryFn: fetchBangles,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAddBangles() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createBangles,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANGLES_KEYS.lists() });
      addToast({ type: "success", message: "Bangles stock added successfully" });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}

export function usePatchBangles() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: patchBangles,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANGLES_KEYS.lists() });
      addToast({ type: "success", message: "Bangles stock updated" });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}

export function useDeleteBangles() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: deleteBangles,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANGLES_KEYS.lists() });
      addToast({ type: "success", message: "Bangles entry deleted" });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}

