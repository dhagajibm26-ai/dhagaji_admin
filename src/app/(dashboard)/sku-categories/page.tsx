import type { Metadata } from "next";
import { SkuCategoriesPageClient } from "@/components/modules/sku-categories/SkuCategoriesPageClient";

export const metadata: Metadata = { title: "SKU Categories" };

export default function SkuCategoriesPage() {
  return <SkuCategoriesPageClient />;
}
