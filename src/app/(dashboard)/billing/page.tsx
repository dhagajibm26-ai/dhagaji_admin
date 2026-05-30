import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BillingPageClient } from "@/components/modules/billing";

export const metadata: Metadata = { title: "Billing — Dhagaji Creation" };

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <BillingPageClient />;
}
