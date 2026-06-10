import type { Metadata } from "next";
import { MaterialCategoriesPageClient } from "@/components/modules/raw-material/MaterialCategoriesPageClient";

export const metadata: Metadata = { title: "Material Categories" };

export default function MaterialCategoriesPage() {
  return <MaterialCategoriesPageClient />;
}
