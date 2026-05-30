import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type { IWorker, WorkerInput, ApiResponse } from "@/types";

export const WORKERS_KEYS = {
  all: () => ["workers"] as const,
  lists: () => [...WORKERS_KEYS.all(), "list"] as const,
  detail: (id: string) => [...WORKERS_KEYS.all(), "detail", id] as const,
};

async function fetchWorkers(): Promise<IWorker[]> {
  const res = await fetch("/api/workers");
  const json: ApiResponse<IWorker[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch workers");
  return json.data ?? [];
}

async function createWorker(data: WorkerInput): Promise<IWorker> {
  const res = await fetch("/api/workers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IWorker> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create worker");
  return json.data!;
}

async function updateWorker(id: string, data: Partial<WorkerInput>): Promise<IWorker> {
  const res = await fetch(`/api/workers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IWorker> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update worker");
  return json.data!;
}

async function deleteWorker(id: string): Promise<void> {
  const res = await fetch(`/api/workers/${id}`, { method: "DELETE" });
  const json: ApiResponse = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete worker");
}

export function useWorkers() {
  return useQuery({
    queryKey: WORKERS_KEYS.lists(),
    queryFn: fetchWorkers,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createWorker,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORKERS_KEYS.lists() });
      addToast({ type: "success", message: "Worker added successfully" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useUpdateWorker() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkerInput> }) =>
      updateWorker(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORKERS_KEYS.lists() });
      addToast({ type: "success", message: "Worker updated" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useDeleteWorker() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: deleteWorker,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORKERS_KEYS.lists() });
      addToast({ type: "success", message: "Worker removed" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}
