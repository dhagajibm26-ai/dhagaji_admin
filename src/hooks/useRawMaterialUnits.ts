import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type {
  ApiResponse,
  IRawMaterialUnit,
  RawMaterialUnitInput,
} from "@/types";

export const RAW_MATERIAL_UNIT_KEYS = {
  all: () => ["raw-material-units"] as const,
  lists: () => [...RAW_MATERIAL_UNIT_KEYS.all(), "list"] as const,
};

async function fetchRawMaterialUnits(): Promise<IRawMaterialUnit[]> {
  const res = await fetch("/api/raw-material-units");
  const json: ApiResponse<IRawMaterialUnit[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch units");
  return json.data ?? [];
}

async function createRawMaterialUnit(data: RawMaterialUnitInput): Promise<IRawMaterialUnit> {
  const res = await fetch("/api/raw-material-units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IRawMaterialUnit> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create unit");
  return json.data!;
}

async function patchRawMaterialUnit(
  id: string,
  data: Partial<RawMaterialUnitInput>
): Promise<IRawMaterialUnit> {
  const res = await fetch(`/api/raw-material-units/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IRawMaterialUnit> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update unit");
  return json.data!;
}

async function deleteRawMaterialUnit(id: string): Promise<void> {
  const res = await fetch(`/api/raw-material-units/${id}`, { method: "DELETE" });
  const json: ApiResponse = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete unit");
}

export function useRawMaterialUnits() {
  return useQuery({
    queryKey: RAW_MATERIAL_UNIT_KEYS.lists(),
    queryFn: fetchRawMaterialUnits,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateRawMaterialUnit() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createRawMaterialUnit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RAW_MATERIAL_UNIT_KEYS.lists() });
      addToast({ type: "success", message: "Unit saved" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useUpdateRawMaterialUnit() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RawMaterialUnitInput> }) =>
      patchRawMaterialUnit(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RAW_MATERIAL_UNIT_KEYS.lists() });
      addToast({ type: "success", message: "Unit updated" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useDeleteRawMaterialUnit() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: deleteRawMaterialUnit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RAW_MATERIAL_UNIT_KEYS.lists() });
      addToast({ type: "success", message: "Unit deleted" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}
