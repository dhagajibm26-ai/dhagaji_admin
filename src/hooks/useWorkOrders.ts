import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import { BANGLES_KEYS } from "@/hooks/useBangles";
import { THREADS_KEYS } from "@/hooks/useThreads";
import { RAW_MATERIAL_KEYS } from "@/hooks/useRawMaterial";
import { FINISHED_STOCK_KEYS } from "@/hooks/useFinishedStock";
import { WORKERS_KEYS } from "@/hooks/useWorkers";
import type { IWorkOrder, WorkOrderCreateInput, WorkOrderReturnInput, PaymentInput, ApiResponse } from "@/types";

export const WORK_ORDER_KEYS = {
  all: () => ["work-orders"] as const,
  lists: () => [...WORK_ORDER_KEYS.all(), "list"] as const,
  byWorker: (workerId: string) => [...WORK_ORDER_KEYS.all(), "worker", workerId] as const,
  detail: (id: string) => [...WORK_ORDER_KEYS.all(), "detail", id] as const,
};

async function fetchWorkOrders(params?: { workerId?: string; status?: string }): Promise<IWorkOrder[]> {
  const qs = new URLSearchParams();
  if (params?.workerId) qs.set("workerId", params.workerId);
  if (params?.status) qs.set("status", params.status);
  const res = await fetch(`/api/work-orders${qs.toString() ? `?${qs}` : ""}`);
  const json: ApiResponse<IWorkOrder[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch work orders");
  return json.data ?? [];
}

async function createWorkOrder(data: WorkOrderCreateInput): Promise<IWorkOrder> {
  const res = await fetch("/api/work-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IWorkOrder> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create work order");
  return json.data!;
}

async function returnWorkOrder(id: string, data: WorkOrderReturnInput): Promise<IWorkOrder> {
  const res = await fetch(`/api/work-orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IWorkOrder> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update work order");
  return json.data!;
}

async function recordPayment(id: string, data: PaymentInput): Promise<IWorkOrder> {
  const res = await fetch(`/api/work-orders/${id}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IWorkOrder> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to record payment");
  return json.data!;
}

export function useWorkOrders(params?: { workerId?: string; status?: string }) {
  return useQuery({
    queryKey: params?.workerId
      ? WORK_ORDER_KEYS.byWorker(params.workerId)
      : WORK_ORDER_KEYS.lists(),
    queryFn: () => fetchWorkOrders(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createWorkOrder,
    onSuccess: () => {
      // Invalidate work orders + all stock caches (bangles, threads, raw material deducted)
      qc.invalidateQueries({ queryKey: WORK_ORDER_KEYS.lists() });
      qc.invalidateQueries({ queryKey: BANGLES_KEYS.lists() });
      qc.invalidateQueries({ queryKey: THREADS_KEYS.lists() });
      qc.invalidateQueries({ queryKey: RAW_MATERIAL_KEYS.lists() });
      addToast({ type: "success", message: "Work order created. Stock deducted." });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useReturnWorkOrder() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkOrderReturnInput }) =>
      returnWorkOrder(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: WORK_ORDER_KEYS.lists() });
      qc.invalidateQueries({ queryKey: WORK_ORDER_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: WORKERS_KEYS.lists() });
      // Returned bangles/threads/raw-materials go back to stock; finished product readyStock incremented
      qc.invalidateQueries({ queryKey: BANGLES_KEYS.lists() });
      qc.invalidateQueries({ queryKey: THREADS_KEYS.lists() });
      qc.invalidateQueries({ queryKey: RAW_MATERIAL_KEYS.lists() });
      qc.invalidateQueries({ queryKey: FINISHED_STOCK_KEYS.lists() });
      addToast({ type: "success", message: "Return recorded. Wages updated." });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentInput }) =>
      recordPayment(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: WORK_ORDER_KEYS.lists() });
      qc.invalidateQueries({ queryKey: WORK_ORDER_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: WORKERS_KEYS.lists() });
      addToast({ type: "success", message: "Payment recorded successfully" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}
