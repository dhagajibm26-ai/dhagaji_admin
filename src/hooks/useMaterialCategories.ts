import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type {
  ApiResponse,
  IRawMaterialCategory,
  RawMaterialCategoryInput,
} from "@/types";

export const MATERIAL_CATEGORY_KEYS = {
  all: () => ["material-categories"] as const,
  lists: () => [...MATERIAL_CATEGORY_KEYS.all(), "list"] as const,
};

async function fetchMaterialCategories(): Promise<IRawMaterialCategory[]> {
  const res = await fetch("/api/material-categories");
  const json: ApiResponse<IRawMaterialCategory[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch categories");
  return json.data ?? [];
}

async function createCategory(data: RawMaterialCategoryInput): Promise<IRawMaterialCategory> {
  const res = await fetch("/api/material-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IRawMaterialCategory> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create category");
  return json.data!;
}

async function patchCategory(
  id: string,
  data: Partial<RawMaterialCategoryInput>
): Promise<IRawMaterialCategory> {
  const res = await fetch(`/api/material-categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IRawMaterialCategory> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update category");
  return json.data!;
}

async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`/api/material-categories/${id}`, { method: "DELETE" });
  const json: ApiResponse = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete category");
}

export function useMaterialCategories() {
  return useQuery({
    queryKey: MATERIAL_CATEGORY_KEYS.lists(),
    queryFn: fetchMaterialCategories,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateMaterialCategory() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MATERIAL_CATEGORY_KEYS.lists() });
      addToast({ type: "success", message: "Category saved" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useUpdateMaterialCategory() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RawMaterialCategoryInput> }) =>
      patchCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MATERIAL_CATEGORY_KEYS.lists() });
      addToast({ type: "success", message: "Category updated" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useDeleteMaterialCategory() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MATERIAL_CATEGORY_KEYS.lists() });
      addToast({ type: "success", message: "Category deleted" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}
