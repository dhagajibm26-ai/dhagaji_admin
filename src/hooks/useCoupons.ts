import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type { ICoupon, CouponInput, ApiResponse } from "@/types";

export const COUPONS_KEYS = {
  all: () => ["coupons"] as const,
  lists: () => [...COUPONS_KEYS.all(), "list"] as const,
  detail: (id: string) => [...COUPONS_KEYS.all(), "detail", id] as const,
};

async function fetchCoupons(): Promise<ICoupon[]> {
  const res = await fetch("/api/coupons");
  const json: ApiResponse<ICoupon[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch coupons");
  return json.data ?? [];
}

async function createCoupon(data: CouponInput): Promise<ICoupon> {
  const res = await fetch("/api/coupons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<ICoupon> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create coupon");
  return json.data!;
}

async function updateCoupon(id: string, data: Partial<CouponInput>): Promise<ICoupon> {
  const res = await fetch(`/api/coupons/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<ICoupon> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update coupon");
  return json.data!;
}

async function deleteCoupon(id: string): Promise<void> {
  const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
  const json: ApiResponse = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete coupon");
}

export function useCoupons() {
  return useQuery({
    queryKey: COUPONS_KEYS.lists(),
    queryFn: fetchCoupons,
    staleTime: 1000 * 60 * 2, // 2 mins
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COUPONS_KEYS.lists() });
      addToast({ type: "success", message: "Coupon added successfully" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CouponInput> }) =>
      updateCoupon(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COUPONS_KEYS.lists() });
      addToast({ type: "success", message: "Coupon updated" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COUPONS_KEYS.lists() });
      addToast({ type: "success", message: "Coupon removed" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}
