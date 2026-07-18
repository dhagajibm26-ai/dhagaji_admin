import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import type { ICustomer, CustomerInput, ApiResponse } from "@/types";

export const CUSTOMERS_KEYS = {
  all: () => ["customers"] as const,
  lists: () => [...CUSTOMERS_KEYS.all(), "list"] as const,
  detail: (id: string) => [...CUSTOMERS_KEYS.all(), "detail", id] as const,
};

async function fetchCustomers(): Promise<ICustomer[]> {
  const res = await fetch("/api/customers");
  const json: ApiResponse<ICustomer[]> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch customers");
  return json.data ?? [];
}

async function createCustomer(data: CustomerInput): Promise<ICustomer> {
  const res = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<ICustomer> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create customer");
  return json.data!;
}

async function updateCustomer(id: string, data: Partial<CustomerInput>): Promise<ICustomer> {
  const res = await fetch(`/api/customers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<ICustomer> = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update customer");
  return json.data!;
}

async function deleteCustomer(id: string): Promise<void> {
  const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
  const json: ApiResponse = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete customer");
}

export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMERS_KEYS.lists(),
    queryFn: fetchCustomers,
    staleTime: 1000 * 60 * 5, // 5 mins
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOMERS_KEYS.lists() });
      addToast({ type: "success", message: "Customer added successfully" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerInput> }) =>
      updateCustomer(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOMERS_KEYS.lists() });
      addToast({ type: "success", message: "Customer updated" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOMERS_KEYS.lists() });
      addToast({ type: "success", message: "Customer removed" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });
}
