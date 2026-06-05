import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkOrderFlowPageClient } from "@/components/modules/workers/WorkOrderFlowPageClient";

export const metadata: Metadata = { title: "Work Order Flow — Dhagaji Creation" };

export default async function WorkOrderFlowPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <WorkOrderFlowPageClient />;
}
