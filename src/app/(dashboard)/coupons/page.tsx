import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CouponsPageClient } from "@/components/modules/coupons";

export const metadata: Metadata = { title: "Coupons — Dhagaji Creation" };

export default async function CouponsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <CouponsPageClient />;
}
