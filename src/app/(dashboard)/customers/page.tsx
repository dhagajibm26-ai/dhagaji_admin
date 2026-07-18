import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CustomersPageClient } from "@/components/modules/customers";

export const metadata: Metadata = { title: "Customers — Dhagaji Creation" };

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <CustomersPageClient />;
}
