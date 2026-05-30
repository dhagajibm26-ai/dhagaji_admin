import type { Metadata } from "next";
import { RawMaterialPageClient } from "@/components/modules/raw-material/RawMaterialPageClient";

export const metadata: Metadata = { title: "Raw Material" };

export default function RawMaterialPage() {
  return <RawMaterialPageClient />;
}
