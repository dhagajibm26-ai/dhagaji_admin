"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, Menu, Home,
  LayoutDashboard, Package, Shapes, Circle, Layers, HardHat, Gem, Receipt, BarChart3, Ruler,
} from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { useQuery } from "@tanstack/react-query";
import type { IRawMaterial, ApiResponse } from "@/types";

const BREADCRUMBS: Record<string, { label: string; Icon: React.ElementType }> = {
  "/":              { label: "Dashboard",     Icon: LayoutDashboard },
  "/raw-material":  { label: "Raw Material",  Icon: Package },
  "/material-categories": { label: "Material Categories", Icon: Shapes },
  "/bangle-sizes": { label: "Bangle Sizes", Icon: Ruler },
  "/sku-categories": { label: "SKU Categories", Icon: Shapes },
  "/bangles":       { label: "Bangles",       Icon: Circle },
  "/threads":       { label: "Threads",       Icon: Layers },
  "/workers":       { label: "Workers",       Icon: HardHat },
  "/work-orders":   { label: "Work Flow",     Icon: HardHat },
  "/finished-stock":{ label: "Finished Stock", Icon: Gem },
  "/billing":       { label: "Billing",       Icon: Receipt },
  "/reports":       { label: "Reports",       Icon: BarChart3 },
};

function useLowStockCount() {
  return useQuery<IRawMaterial[]>({
    queryKey: ["raw-material", "list", "all"],
    queryFn: async () => {
      const res = await fetch("/api/raw-material?all=true");
      const json: ApiResponse<IRawMaterial[]> = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.data ?? [];
    },
    staleTime: 1000 * 60 * 5,
    select: (items) =>
      items.filter((m) => {
        const closing = m.openingStock + m.purchasedQty - m.usedQty;
        return closing <= (m.lowStockThreshold ?? 10);
      }) as unknown as IRawMaterial[],
  });
}

export function Header() {
  const pathname = usePathname();
  const userName = useAuthStore((s) => s.userName);
  const role = useAuthStore((s) => s.role);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const segment = Object.keys(BREADCRUMBS)
    .filter((k) => (k === "/" ? pathname === "/" : pathname.startsWith(k)))
    .sort((a, b) => b.length - a.length)[0];

  const crumb = segment ? BREADCRUMBS[segment] : null;
  const pageTitle = crumb?.label ?? "Dhagaji Creation";

  const { data: lowStockItems } = useLowStockCount();
  const lowCount = Array.isArray(lowStockItems) ? lowStockItems.length : 0;

  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-[#11271d]/90 backdrop-blur-md border-b border-[#d29e71]/20 px-4 py-2.5 lg:px-6">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#d29e71]/70 hover:bg-[#1b4332]/35 hover:text-[#d29e71] transition-colors lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm min-w-0" aria-label="Breadcrumb">
          <Link
            href="/"
            className="hidden items-center gap-1 text-[#d29e71]/50 hover:text-[#d29e71] transition-colors sm:flex shrink-0"
          >
            <Home size={13} />
          </Link>
          {crumb && (
            <>
              <span className="hidden text-[#d29e71]/30 sm:block text-xs">/</span>
              <span className="flex items-center gap-1.5 font-semibold text-[#d29e71] truncate">
                <crumb.Icon size={13} className="hidden sm:block text-[#d29e71]/50 shrink-0" />
                {pageTitle}
              </span>
            </>
          )}
          <span className="flex items-center gap-1.5 font-semibold text-[#d29e71] sm:hidden">
            {crumb && <crumb.Icon size={13} className="text-[#d29e71]/50 shrink-0" />}
            {pageTitle}
          </span>
        </nav>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Low-stock bell */}
        <Link
          href="/raw-material"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#d29e71]/60 hover:bg-[#1b4332]/35 hover:text-[#d29e71] transition-colors"
          aria-label={lowCount > 0 ? `${lowCount} low-stock alerts` : "Stock alerts"}
          title={lowCount > 0 ? `${lowCount} material(s) low on stock` : "All stock OK"}
        >
          <Bell size={17} className={lowCount > 0 ? "text-[#d29e71]" : ""} />
          {lowCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d29e71] px-1 text-[9px] font-black text-[#11271d] leading-none">
              {lowCount > 9 ? "9+" : lowCount}
            </span>
          )}
        </Link>

        {/* User chip (desktop) */}
        <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-[#d29e71]/20 bg-[#1b4332]/25 px-3 py-1.5">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[#11271d] text-[10px] font-black select-none"
            style={{ background: "linear-gradient(135deg, #d29e71 0%, #b88556 100%)", border: "1px solid rgba(17,39,29,0.2)" }}
          >
            {initials}
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xs font-semibold text-[#d29e71]/90">{userName}</span>
            <span className="text-[10px] capitalize text-[#d29e71]/50">{role}</span>
          </div>
        </div>

        {/* Avatar (mobile) */}
        <div
          className="sm:hidden flex h-8 w-8 items-center justify-center rounded-xl text-[#11271d] text-xs font-black select-none"
          style={{ background: "linear-gradient(135deg, #d29e71 0%, #b88556 100%)", border: "1px solid rgba(17,39,29,0.2)" }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
