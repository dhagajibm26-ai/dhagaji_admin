"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Circle,
  Layers,
  HardHat,
  Gem,
  Receipt,
  BarChart3,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";

interface NavItem {
  href: string;
  label: string;
  Icon: React.ElementType;
  ownerOnly?: boolean;
  highlight?: boolean;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard, ownerOnly: true, section: "Overview" },
  { href: "/raw-material", label: "Raw Material", Icon: Package, section: "Inventory" },
  { href: "/bangles", label: "Bangles", Icon: Circle, section: "Inventory" },
  { href: "/threads", label: "Threads", Icon: Layers, section: "Inventory" },
  { href: "/finished-stock", label: "Finished Stock", Icon: Gem, section: "Inventory" },
  { href: "/workers", label: "Workers", Icon: HardHat, section: "Operations" },
  { href: "/billing", label: "Billing", Icon: Receipt, highlight: true, section: "Operations" },
  { href: "/reports", label: "Reports", Icon: BarChart3, ownerOnly: true, section: "Analytics" },
];

export function Sidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const userName = useAuthStore((s) => s.userName);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  const isOwner = role === "owner";
  const visibleItems = NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);

  // Group items by section
  const sections = Array.from(new Set(visibleItems.map((i) => i.section)));

  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-30 flex h-full w-[256px] flex-col",
          "bg-[#0f0f0f] text-white",
          "transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
        style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs tracking-wider text-white select-none"
              style={{ background: "linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)" }}
            >
              DC
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black leading-tight tracking-[0.15em] text-white truncate">
                DHAGAJI CREATION
              </p>
              <p className="text-[9px] text-white/30 leading-tight tracking-wide">
                Factory Management
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:bg-white/10 hover:text-white transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {sections.map((section, idx) => {
            const sectionItems = visibleItems.filter((i) => i.section === section);
            return (
              <div key={section} className="mb-3">
                {idx > 0 && (
                  <div
                    className="mx-3 mb-3"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
                  />
                )}
                <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                  {section}
                </p>
                <ul className="space-y-0.5">
                  {sectionItems.map((item) => {
                    const isActive =
                      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium min-h-[44px]",
                            "transition-all duration-150",
                            isActive
                              ? "bg-[#D32F2F] text-white shadow-lg shadow-red-900/30"
                              : item.highlight
                              ? "border border-[#D32F2F]/30 text-[#EF9A9A] hover:bg-[#D32F2F] hover:text-white hover:border-transparent"
                              : "text-white/50 hover:bg-white/8 hover:text-white/90"
                          )}
                        >
                          <item.Icon
                            size={16}
                            className={cn(
                              "shrink-0 transition-transform duration-150",
                              isActive ? "scale-110" : "group-hover:scale-105"
                            )}
                          />
                          <span className="flex-1 leading-none">{item.label}</span>
                          {item.highlight && !isActive && (
                            <span className="rounded-md bg-[#D32F2F] px-1.5 py-0.5 text-[9px] font-black text-white leading-none tracking-wider">
                              POS
                            </span>
                          )}
                          {isActive && (
                            <ChevronRight size={12} className="opacity-60" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-3 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-1">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white text-xs font-black select-none"
              style={{ background: "linear-gradient(135deg, #D32F2F 0%, #7f1d1d 100%)" }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white/90 leading-tight">
                {userName ?? "—"}
              </p>
              <p className="text-[10px] capitalize text-white/30 leading-tight">
                {role ?? ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/30 hover:bg-white/8 hover:text-white/70 min-h-[44px] transition-all"
          >
            <LogOut size={15} className="shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
