import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type {
  ApiResponse,
  IBangleSize,
  BangleSizeInput,
} from "@/types";

export const BANGLE_SIZE_KEYS = {
  all: () => ["bangle-sizes"] as const,
  lists: () => [...BANGLE_SIZE_KEYS.all(), "list"] as const,
};

async function fetchBangleSizes(): Promise<IBangleSize[]> {
  const res = await fetch("/api/bangle-sizes");
  const json: ApiResponse<IBangleSize[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch bangle sizes");
  return json.data ?? [];
}

async function createBangleSize(data: BangleSizeInput): Promise<IBangleSize> {
  const res = await fetch("/api/bangle-sizes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IBangleSize> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create bangle size");
  return json.data!;
}

async function createBangleSizesBulk(names: string[]): Promise<IBangleSize[]> {
  const res = await fetch("/api/bangle-sizes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names }),
  });
  const json: ApiResponse<IBangleSize[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create bangle sizes");
  return json.data ?? [];
}

async function patchBangleSize(
  id: string,
  data: Partial<BangleSizeInput>
): Promise<IBangleSize> {
  const res = await fetch(`/api/bangle-sizes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IBangleSize> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update bangle size");
  return json.data!;
}

async function deleteBangleSize(id: string): Promise<void> {
  const res = await fetch(`/api/bangle-sizes/${id}`, { method: "DELETE" });
  const json: ApiResponse = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete bangle size");
}

export function useBangleSizes() {
  return useQuery({
    queryKey: BANGLE_SIZE_KEYS.lists(),
    queryFn: fetchBangleSizes,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateBangleSize() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createBangleSize,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANGLE_SIZE_KEYS.lists() });
      addToast({ type: "success", message: "Bangle size saved" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useCreateBangleSizesBulk() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createBangleSizesBulk,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: BANGLE_SIZE_KEYS.lists() });
      addToast({
        type: "success",
        message: `${data.length} bangle size${data.length === 1 ? "" : "s"} saved`,
      });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useUpdateBangleSize() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BangleSizeInput> }) =>
      patchBangleSize(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANGLE_SIZE_KEYS.lists() });
      addToast({ type: "success", message: "Bangle size updated" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useDeleteBangleSize() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: deleteBangleSize,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANGLE_SIZE_KEYS.lists() });
      addToast({ type: "success", message: "Bangle size deleted" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}
