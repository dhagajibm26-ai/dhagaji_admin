import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type { IRawMaterial, RawMaterialInput, ApiResponse } from "@/types";

// ─── Query key factory ────────────────────────────────────────────────────────

export const RAW_MATERIAL_KEYS = {
  all: ["raw-material"] as const,
  lists: () => [...RAW_MATERIAL_KEYS.all, "list"] as const,
  detail: (id: string) => [...RAW_MATERIAL_KEYS.all, "detail", id] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchRawMaterials(): Promise<IRawMaterial[]> {
  const res = await fetch("/api/raw-material");
  const json: ApiResponse<IRawMaterial[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch raw materials");
  return json.data ?? [];
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
  addPurchasedQty?: number;
  ratePerUnit?: number;
  lowStockThreshold?: number;
  supplier?: string;
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

export function useRawMaterials() {
  return useQuery({
    queryKey: RAW_MATERIAL_KEYS.lists(),
    queryFn: fetchRawMaterials,
    staleTime: 1000 * 60 * 2, // 2 min fresh
  });
}

export function useAddRawMaterial() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createRawMaterial,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RAW_MATERIAL_KEYS.lists() });
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
      qc.invalidateQueries({ queryKey: RAW_MATERIAL_KEYS.lists() });
      addToast({ type: "success", message: "Stock updated successfully" });
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
      qc.invalidateQueries({ queryKey: RAW_MATERIAL_KEYS.lists() });
      addToast({ type: "success", message: "Material deleted" });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: err.message });
    },
  });
}
