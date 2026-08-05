"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Shapes,
  Circle,
  Layers,
  HardHat,
  Clock3,
  Gem,
  Receipt,
  BarChart3,
  Ruler,
  LogOut,
  X,
  ChevronRight,
  ChevronDown,
  Users,
  Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { useState } from "react";

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
  { href: "/work-orders", label: "Work Flow", Icon: Clock3, section: "Operations" },
  { href: "/billing", label: "Billing", Icon: Receipt, highlight: true, section: "Operations" },
  { href: "/customers", label: "Customers", Icon: Users, section: "Operations" },
  { href: "/coupons", label: "Coupon Codes", Icon: Ticket, section: "Operations" },
  { href: "/reports", label: "Reports", Icon: BarChart3, ownerOnly: true, section: "Analytics" },
  { href: "/material-categories", label: "Material Categories", Icon: Shapes, ownerOnly: true, section: "Setup" },
  { href: "/bangle-sizes", label: "Bangle Sizes", Icon: Ruler, ownerOnly: true, section: "Setup" },
  { href: "/sku-categories", label: "SKU Categories", Icon: Shapes, ownerOnly: true, section: "Setup" },
];

export function Sidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const userName = useAuthStore((s) => s.userName);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const [workMenuOpen, setWorkMenuOpen] = useState(true);

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
          "bg-[#1e3a2a] text-white",
          "transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
        style={{ borderRight: "1px solid rgba(210, 158, 113, 0.12)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex flex-col gap-1.5 min-w-0">
            <img
              src="/logo.png"
              alt="Dhagaji Creation"
              className="h-14 w-auto object-contain select-none"
            />
            <p className="text-[9px] text-[#d29e71]/80 leading-tight tracking-wide pl-0.5">
              Factory Management
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#d29e71]/70 hover:bg-[#1b4332]/20 hover:text-[#d29e71] transition-colors lg:hidden"
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
                    style={{ borderTop: "1px solid rgba(210, 158, 113, 0.12)" }}
                  />
                )}
                <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#d29e71]/75">
                  {section}
                </p>
                <ul className="space-y-0.5">
                  {section === "Operations" && (
                    <li className="mb-1">
                      <button
                        type="button"
                        onClick={() => setWorkMenuOpen((v) => !v)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium min-h-11",
                          pathname.startsWith("/workers") || pathname.startsWith("/work-orders")
                            ? "bg-[#1b4332]/30 text-[#d29e71]"
                            : "text-[#d29e71]/90 hover:bg-[#1b4332]/20 hover:text-[#d29e71]"
                        )}
                      >
                        <HardHat size={16} className="shrink-0" />
                        <span className="flex-1 text-left">Work Center</span>
                        {workMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      {workMenuOpen && (
                        <div className="mt-1 ml-4 space-y-0.5 border-l border-white/10 pl-2">
                          {["/workers", "/work-orders"].map((href) => {
                            const item = sectionItems.find((i) => i.href === href);
                            if (!item) return null;
                            const isActive = pathname.startsWith(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium min-h-11 transition-all duration-150",
                                  isActive
                                    ? "bg-[#1b4332] text-white shadow-lg shadow-green-950/40 border-l-2 border-[#d29e71]"
                                    : "text-[#d29e71]/80 hover:bg-[#1b4332]/20 hover:text-[#d29e71]"
                                )}
                              >
                                <item.Icon size={15} className="shrink-0" />
                                <span className="leading-none">{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  )}

                  {sectionItems.map((item) => {
                    if (section === "Operations" && (item.href === "/workers" || item.href === "/work-orders")) {
                      return null;
                    }
                    const isActive =
                      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium min-h-11",
                            "transition-all duration-150",
                            isActive
                              ? "bg-[#1b4332] text-white shadow-lg shadow-green-950/40 border-l-2 border-[#d29e71]"
                              : item.highlight
                                ? "border border-[#d29e71]/40 text-[#f3e5ab] hover:bg-[#1b4332] hover:text-white hover:border-transparent"
                                : "text-[#d29e71]/85 hover:bg-[#1b4332]/20 hover:text-[#d29e71]"
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
                            <span className="rounded-md bg-[#d29e71] px-1.5 py-0.5 text-[9px] font-black text-black leading-none tracking-wider">
                              POS
                            </span>
                          )}
                          {isActive && (
                            <ChevronRight size={12} className="text-[#d29e71] font-bold" />
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
          style={{ borderTop: "1px solid rgba(210, 158, 113, 0.12)" }}
        >
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-1">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white text-xs font-black select-none"
              style={{ background: "linear-gradient(135deg, #1b4332 0%, #0d1e0e 100%)", border: "1px solid rgba(210, 158, 113, 0.3)" }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#d29e71] leading-tight">
                {userName ?? "—"}
              </p>
              <p className="text-[10px] capitalize text-[#d29e71]/70 leading-tight">
                {role ?? ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="cursor-pointer flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-[#1b4332]/20 text-[#d29e71]/90 min-h-11 transition-all"
          >
            <LogOut size={15} className="shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
