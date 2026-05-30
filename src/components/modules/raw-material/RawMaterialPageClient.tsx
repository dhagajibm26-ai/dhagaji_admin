"use client";

import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RawMaterialTable } from "./RawMaterialTable";
import { AddRawMaterialModal } from "./AddRawMaterialModal";
import { useRawMaterials } from "@/hooks/useRawMaterial";
import type { IRawMaterial } from "@/types";

function getLowStockItems(items: IRawMaterial[]) {
  return items.filter((item) => item.closingStock < item.lowStockThreshold);
}

export function RawMaterialPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: items = [] } = useRawMaterials();

  const lowItems = getLowStockItems(items);

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Raw Material</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Beads, wire, glue, packaging, and other production inputs.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus size={14} className="mr-1" />
          Add Material
        </Button>
      </div>

      {/* Low-stock alert banner */}
      {lowItems.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3.5"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D32F2F]/10 mt-0.5">
            <AlertTriangle size={14} className="text-[#D32F2F]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#D32F2F]">
              {lowItems.length} item{lowItems.length > 1 ? "s" : ""} below low-stock threshold
            </p>
            <p className="mt-0.5 text-xs text-rose-600">
              {lowItems.map((i) => i.itemName).join(", ")}
            </p>
          </div>
        </div>
      )}

      <RawMaterialTable onAddNew={() => setModalOpen(true)} />

      <AddRawMaterialModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
