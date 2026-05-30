"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "danger" | "success" | "warning" | "blue";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  subtext?: string;
  variant?: Variant;
  trend?: { value: number; label: string };
}

const variantConfig: Record<Variant, { bg: string; iconBg: string; iconText: string; accent: string }> = {
  default: {
    bg: "bg-white",
    iconBg: "bg-rose-50",
    iconText: "text-[#D32F2F]",
    accent: "border-l-4 border-l-[#D32F2F]",
  },
  danger: {
    bg: "bg-rose-50",
    iconBg: "bg-rose-100",
    iconText: "text-rose-700",
    accent: "border-l-4 border-l-rose-500",
  },
  success: {
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-700",
    accent: "border-l-4 border-l-emerald-500",
  },
  warning: {
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconText: "text-amber-700",
    accent: "border-l-4 border-l-amber-500",
  },
  blue: {
    bg: "bg-sky-50",
    iconBg: "bg-sky-100",
    iconText: "text-sky-700",
    accent: "border-l-4 border-l-sky-500",
  },
};

export function StatCard({ label, value, icon, subtext, trend, variant = "default" }: StatCardProps) {
  const cfg = variantConfig[variant];
  const trendUp = trend ? trend.value >= 0 : null;

  return (
    <div className={cn(
      "rounded-2xl border border-slate-100 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
      cfg.bg,
      cfg.accent,
    )}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums leading-none">{value}</p>
          {subtext && (
            <p className="mt-1.5 text-xs text-slate-400">{subtext}</p>
          )}
          {trend && (
            <p className={cn("mt-1.5 text-xs font-semibold", trendUp ? "text-emerald-600" : "text-rose-600")}>
              {trendUp ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
              <span className="font-normal text-slate-400">{trend.label}</span>
            </p>
          )}
        </div>
        {icon && (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ml-3", cfg.iconBg, cfg.iconText)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
