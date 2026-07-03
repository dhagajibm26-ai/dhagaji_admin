import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type { IRawMaterial, RawMaterialInput, ApiResponse } from "@/types";

export const RAW_MATERIAL_PAGE_SIZES = [10, 20, 50, 100, 500] as const;
export type RawMaterialPageSize = (typeof RAW_MATERIAL_PAGE_SIZES)[number];

export interface RawMaterialPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RawMaterialsPaginatedResult {
  items: IRawMaterial[];
  pagination: RawMaterialPagination;
}

// ─── Query key factory ────────────────────────────────────────────────────────

export const RAW_MATERIAL_KEYS = {
  all: ["raw-material"] as const,
  lists: () => [...RAW_MATERIAL_KEYS.all, "list"] as const,
  listAll: () => [...RAW_MATERIAL_KEYS.lists(), "all"] as const,
  listPaginated: (page: number, limit: number) =>
    [...RAW_MATERIAL_KEYS.lists(), "page", page, limit] as const,
  detail: (id: string) => [...RAW_MATERIAL_KEYS.all, "detail", id] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchAllRawMaterials(): Promise<IRawMaterial[]> {
  const res = await fetch("/api/raw-material?all=true");
  const json: ApiResponse<IRawMaterial[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch raw materials");
  return json.data ?? [];
}

async function fetchRawMaterialsPaginated(
  page: number,
  limit: RawMaterialPageSize
): Promise<RawMaterialsPaginatedResult> {
  const res = await fetch(`/api/raw-material?page=${page}&limit=${limit}`);
  const json: ApiResponse<IRawMaterial[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch raw materials");
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

async function createRawMaterial(data: RawMaterialInput): Promise<IRawMaterial> {
  const res = await fetch("/api/raw-material", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IRawMaterial> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to add material");
  return json.data!;
}

export interface PatchRawMaterialPayload {
  id: string;
  itemName?: string;
  category?: string;
  colorType?: string;
  unit?: "gram" | "pcs" | "tube" | "box" | "meter";
  unitsPerPack?: number;
  openingStock?: number;
  purchasedQty?: number;
  usedQty?: number;
  addPurchasedQty?: number;
  totalPurchaseAmount?: number;
  ratePerUnit?: number;
  lowStockThreshold?: number;
  supplier?: string;
  hsnCodes?: string[];
  lastPurchaseDate?: string;
}

async function patchRawMaterial({
  id,
  ...data
}: PatchRawMaterialPayload): Promise<IRawMaterial> {
  const res = await fetch(`/api/raw-material/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IRawMaterial> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update material");
  return json.data!;
}

async function deleteRawMaterial(id: string): Promise<void> {
  const res = await fetch(`/api/raw-material/${id}`, { method: "DELETE" });
  const json: ApiResponse = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete material");
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Full list — for dropdowns, low-stock banners, etc. */
export function useRawMaterials() {
  return useQuery({
    queryKey: RAW_MATERIAL_KEYS.listAll(),
    queryFn: fetchAllRawMaterials,
    staleTime: 1000 * 60 * 2,
  });
}

/** Paginated list — for the raw material table */
export function useRawMaterialsPaginated(page: number, limit: RawMaterialPageSize) {
  return useQuery({
    queryKey: RAW_MATERIAL_KEYS.listPaginated(page, limit),
    queryFn: () => fetchRawMaterialsPaginated(page, limit),
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev,
  });
}

export function useAddRawMaterial() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createRawMaterial,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RAW_MATERIAL_KEYS.all });
      addToast({ type: "success", message: "Material added successfully" });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}

export function usePatchRawMaterial() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: patchRawMaterial,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RAW_MATERIAL_KEYS.all });
      addToast({ type: "success", message: "Material updated successfully" });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}

export function useDeleteRawMaterial() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: deleteRawMaterial,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RAW_MATERIAL_KEYS.all });
      addToast({ type: "success", message: "Material deleted" });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}
