import type { Metadata } from "next";
import { BanglesPageClient } from "@/components/modules/bangles";

export const metadata: Metadata = { title: "Bangles Stock — Dhagaji Creation" };

export default function BanglesPage() {
  return <BanglesPageClient />;
}

