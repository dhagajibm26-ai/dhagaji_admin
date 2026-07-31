import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { SessionSync } from "@/components/layout/SessionSync";

export const metadata: Metadata = {
  title: {
    template: "%s | Dhagaji Creation",
    default: "Dashboard | Dhagaji Creation",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div id="dashboard-layout" className="flex h-screen bg-slate-50">
      {/* Syncs next-auth session → Zustand store on client */}
      <SessionSync />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-[240px] relative">
        {/* Subtle background watermark logo */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] bg-center bg-no-repeat select-none z-0"
          style={{
            backgroundImage: "url('/logo.png')",
            backgroundSize: "min(380px, 70vw)",
          }}
        />
        <Header />
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6 z-10">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
