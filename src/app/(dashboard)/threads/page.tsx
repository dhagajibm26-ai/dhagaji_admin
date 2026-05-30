import type { Metadata } from "next";
import { ThreadsPageClient } from "@/components/modules/threads";

export const metadata: Metadata = { title: "Threads Stock — Dhagaji Creation" };

export default function ThreadsPage() {
  return <ThreadsPageClient />;
}

