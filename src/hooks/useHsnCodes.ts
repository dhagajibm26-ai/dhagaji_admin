import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type {
  ApiResponse,
  IHsnCode,
  HsnCodeInput,
} from "@/types";

export const HSN_CODE_KEYS = {
  all: () => ["hsn-codes"] as const,
  lists: (scope?: string) => [...HSN_CODE_KEYS.all(), "list", scope ?? "all"] as const,
};

async function fetchHsnCodes(scope?: string): Promise<IHsnCode[]> {
  const url = scope ? `/api/hsn-codes?scope=${encodeURIComponent(scope)}` : "/api/hsn-codes";
  const res = await fetch(url);
  const json: ApiResponse<IHsnCode[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch HSN codes");
  return json.data ?? [];
}

async function createHsnCode(data: HsnCodeInput): Promise<IHsnCode> {
  const res = await fetch("/api/hsn-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IHsnCode> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create HSN code");
  return json.data!;
}

async function patchHsnCode(
  id: string,
  data: Partial<HsnCodeInput>
): Promise<IHsnCode> {
  const res = await fetch(`/api/hsn-codes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<IHsnCode> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update HSN code");
  return json.data!;
}

async function deleteHsnCode(id: string): Promise<void> {
  const res = await fetch(`/api/hsn-codes/${id}`, { method: "DELETE" });
  const json: ApiResponse = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete HSN code");
}

export function useHsnCodes(scope?: string) {
  return useQuery({
    queryKey: HSN_CODE_KEYS.lists(scope),
    queryFn: () => fetchHsnCodes(scope),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateHsnCode(scope?: string) {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: (data: HsnCodeInput) => createHsnCode({ ...data, scope: scope ?? data.scope }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HSN_CODE_KEYS.lists(scope) });
      addToast({ type: "success", message: "HSN Code saved" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useUpdateHsnCode() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HsnCodeInput> }) =>
      patchHsnCode(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HSN_CODE_KEYS.lists() });
      addToast({ type: "success", message: "HSN Code updated" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useDeleteHsnCode(scope?: string) {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: deleteHsnCode,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HSN_CODE_KEYS.lists(scope) });
      addToast({ type: "success", message: "HSN Code deleted" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}
