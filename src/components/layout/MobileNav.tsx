"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Package,
  Shapes,
  HardHat,
  Clock3,
  Receipt,
  BarChart3,
  MoreHorizontal,
  X,
  LayoutDashboard,
  Circle,
  Layers,
  Gem,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

const PRIMARY_TABS = [
  { href: "/finished-stock", label: "Stock", Icon: Gem },
  { href: "/workers", label: "Workers", Icon: HardHat },
  { href: "/reports", label: "Reports", Icon: BarChart3, ownerOnly: true },
];

const MORE_ITEMS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard, ownerOnly: true },
  { href: "/raw-material", label: "Raw Material", Icon: Package },
  { href: "/work-orders", label: "Work Flow", Icon: Clock3 },
  { href: "/bangles", label: "Bangles", Icon: Circle },
  { href: "/threads", label: "Threads", Icon: Layers },
  { href: "/material-categories", label: "Material Categories", Icon: Shapes, ownerOnly: true },
  { href: "/bangle-sizes", label: "Bangle Sizes", Icon: Ruler, ownerOnly: true },
];

export function MobileNav() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isOwner = role === "owner";

  const visibleTabs = PRIMARY_TABS.filter((t) => !t.ownerOnly || isOwner);
  const visibleMore = MORE_ITEMS.filter((t) => !t.ownerOnly || isOwner);

  const leftTabs = visibleTabs.slice(0, 2);
  const rightTabs = visibleTabs.slice(2);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-end border-t border-slate-100 bg-white/95 backdrop-blur-md pb-safe lg:hidden shadow-lg shadow-black/5">
        {/* Left tabs */}
        {leftTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 pt-2 pb-3 text-[10px] font-semibold min-h-14 justify-center transition-all",
              isActive(tab.href) ? "text-[#D32F2F]" : "text-slate-400 hover:text-slate-700"
            )}
          >
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-xl transition-all",
              isActive(tab.href) ? "bg-[#D32F2F]/10 scale-110" : ""
            )}>
              <tab.Icon size={18} />
            </div>
            {tab.label}
          </Link>
        ))}

        {/* Billing FAB */}
        <div className="flex flex-col items-center px-3 pb-2">
          <Link
            href="/billing"
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl w-14 h-14 -mt-6",
              "bg-[#D32F2F] text-white transition-all hover:bg-[#B71C1C] active:scale-95",
              "shadow-xl shadow-red-700/40",
              pathname.startsWith("/billing") && "ring-2 ring-[#D32F2F] ring-offset-2 ring-offset-white"
            )}
            aria-label="Billing"
          >
            <Receipt size={20} />
            <span className="text-[9px] font-black leading-none mt-0.5 tracking-wider">BILL</span>
          </Link>
        </div>

        {/* Right tabs */}
        {rightTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 pt-2 pb-3 text-[10px] font-semibold min-h-14 justify-center transition-all",
              isActive(tab.href) ? "text-[#D32F2F]" : "text-slate-400 hover:text-slate-700"
            )}
          >
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-xl transition-all",
              isActive(tab.href) ? "bg-[#D32F2F]/10 scale-110" : ""
            )}>
              <tab.Icon size={18} />
            </div>
            {tab.label}
          </Link>
        ))}

        {/* More */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 pt-2 pb-3 text-[10px] font-semibold min-h-14 justify-center text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="More"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-xl">
            <MoreHorizontal size={18} />
          </div>
          More
        </button>
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* More drawer */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl lg:hidden",
          "transition-transform duration-300 ease-out",
          drawerOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle + title */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900">More Pages</span>
            <span className="text-xs text-slate-400">Navigate to other sections</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <ul className="grid grid-cols-2 gap-2 px-4 pb-10">
          {visibleMore.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold min-h-14 transition-all",
                  isActive(item.href)
                    ? "bg-[#D32F2F]/10 text-[#D32F2F]"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                  isActive(item.href) ? "bg-[#D32F2F]/20" : "bg-white shadow-sm"
                )}>
                  <item.Icon size={16} className={isActive(item.href) ? "text-[#D32F2F]" : "text-slate-500"} />
                </div>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}


