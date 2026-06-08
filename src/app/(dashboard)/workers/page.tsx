import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkersPageClient } from "@/components/modules/workers";

export const metadata: Metadata = { title: "Workers — Dhagaji Creation" };

export default async function WorkersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <WorkersPageClient />;
}
