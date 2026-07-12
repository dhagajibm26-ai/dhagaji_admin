import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type {
  ApiResponse,
  ISkuCategory,
  SkuCategoryInput,
} from "@/types";

export const SKU_CATEGORY_KEYS = {
  all: () => ["sku-categories"] as const,
  lists: () => [...SKU_CATEGORY_KEYS.all(), "list"] as const,
};

async function fetchSkuCategories(): Promise<ISkuCategory[]> {
  const res = await fetch("/api/sku-categories");
  const json: ApiResponse<ISkuCategory[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch categories");
  return json.data ?? [];
}

async function createSkuCategory(data: SkuCategoryInput): Promise<ISkuCategory> {
  const res = await fetch("/api/sku-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<ISkuCategory> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create category");
  return json.data!;
}

async function patchSkuCategory(
  id: string,
  data: Partial<SkuCategoryInput>
): Promise<ISkuCategory> {
  const res = await fetch(`/api/sku-categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<ISkuCategory> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update category");
  return json.data!;
}

async function deleteSkuCategory(id: string): Promise<void> {
  const res = await fetch(`/api/sku-categories/${id}`, { method: "DELETE" });
  const json: ApiResponse = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete category");
}

export function useSkuCategories() {
  return useQuery({
    queryKey: SKU_CATEGORY_KEYS.lists(),
    queryFn: fetchSkuCategories,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateSkuCategory() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createSkuCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SKU_CATEGORY_KEYS.lists() });
      addToast({ type: "success", message: "Category saved successfully" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useUpdateSkuCategory() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SkuCategoryInput> }) =>
      patchSkuCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SKU_CATEGORY_KEYS.lists() });
      addToast({ type: "success", message: "Category updated successfully" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useDeleteSkuCategory() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: deleteSkuCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SKU_CATEGORY_KEYS.lists() });
      addToast({ type: "success", message: "Category deleted successfully" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}
