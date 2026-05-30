import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FinishedStockPageClient } from "@/components/modules/finished-stock";

export const metadata: Metadata = { title: "Finished Stock — Dhagaji Creation" };

export default async function FinishedStockPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <FinishedStockPageClient />;
}
