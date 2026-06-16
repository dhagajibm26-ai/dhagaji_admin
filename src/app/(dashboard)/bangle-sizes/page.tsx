import type { Metadata } from "next";
import { BangleSizesPageClient } from "@/components/modules/bangles/BangleSizesPageClient";

export const metadata: Metadata = { title: "Manage Bangle Sizes" };

export default function BangleSizesPage() {
  return <BangleSizesPageClient />;
}
