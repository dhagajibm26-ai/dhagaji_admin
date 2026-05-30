"use client";

import { IWorker } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useIsOwner } from "@/stores/useAuthStore";

interface WorkerCardProps {
  worker: IWorker;
  onAddOrder: (worker: IWorker) => void;
  onViewLedger: (worker: IWorker) => void;
  onEdit?: (worker: IWorker) => void;
}

export function WorkerCard({ worker, onAddOrder, onViewLedger, onEdit }: WorkerCardProps) {
  const isOwner = useIsOwner();
  const hasBalance = worker.balance > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#1A1A1A] text-sm">{worker.name}</p>
          {worker.phone && (
            <p className="text-xs text-gray-500 mt-0.5">{worker.phone}</p>
          )}
        </div>
        <Badge variant={worker.isActive ? "success" : "neutral"}>
          {worker.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Financial summary (owner only) */}
      {isOwner && (
        <div className="rounded-lg bg-gray-50 p-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-500">Total Earned</p>
            <p className="font-semibold text-[#1A1A1A]">
              ₹{worker.totalEarned.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total Paid</p>
            <p className="font-semibold text-[#1A1A1A]">
              ₹{worker.totalPaid.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="col-span-2 border-t pt-2 mt-1">
            <p className="text-gray-500">Balance Due</p>
            <p className={`font-bold text-sm ${hasBalance ? "text-[#D32F2F]" : "text-green-700"}`}>
              ₹{worker.balance.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="primary" onClick={() => onAddOrder(worker)}>
          + Work Order
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onViewLedger(worker)}>
          Ledger
        </Button>
        {isOwner && onEdit && (
          <Button size="sm" variant="outline" onClick={() => onEdit(worker)}>
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
