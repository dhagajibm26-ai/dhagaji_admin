"use client";
import { useQuery } from "@tanstack/react-query";
import type { DashboardData } from "@/app/api/dashboard/route";

export type { DashboardData };

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard");
  const json = (await res.json()) as { success: boolean; data?: DashboardData; error?: string };
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to load dashboard");
  }
  return json.data!;
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
}
