"use client";
import { useQuery } from "@tanstack/react-query";
import type { ReportType, ReportData } from "@/types/reports";
import type { ApiResponse } from "@/types";

export interface ReportFilters {
  type: ReportType;
  from: string;  // YYYY-MM-DD
  to:   string;  // YYYY-MM-DD
  workerId?: string;
}

async function fetchReport(filters: ReportFilters): Promise<ReportData> {
  const params: Record<string, string> = { from: filters.from, to: filters.to };
  if (filters.workerId) {
    params.workerId = filters.workerId;
  }
  const sp = new URLSearchParams(params);
  const res = await fetch(`/api/reports/${filters.type}?${sp.toString()}`);
  const json = (await res.json()) as ApiResponse<ReportData>;
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to load report");
  }
  return json.data!;
}

export function useReport(filters: ReportFilters | null) {
  return useQuery<ReportData>({
    queryKey: ["reports", filters],
    queryFn:  () => fetchReport(filters!),
    enabled:  filters !== null,
    staleTime: 1000 * 60 * 2,
  });
}
