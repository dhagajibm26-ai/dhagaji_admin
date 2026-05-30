import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardPageClient } from "@/components/modules/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Staff should use the billing page
  if (session.user.role !== "owner") redirect("/billing");

  return <DashboardPageClient />;
}

