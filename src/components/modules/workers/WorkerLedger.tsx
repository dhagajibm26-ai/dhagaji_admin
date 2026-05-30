"use client";

import { useState } from "react";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PaymentModal } from "./PaymentModal";
import type { IWorkOrder } from "@/types";

interface WorkerLedgerProps {
  workerId: string;
  workerName: string;
}

export function WorkerLedger({ workerId, workerName }: WorkerLedgerProps) {
  const { data: orders = [], isLoading } = useWorkOrders({ workerId });
  const [payOrder, setPayOrder] = useState<IWorkOrder | null>(null);

  // Running balance calculation
  let runningBalance = 0;

  const rows = orders.map((o) => {
    runningBalance += (o.amountDue ?? 0) - (o.amountPaid ?? 0);
    return { ...o, runningBalance };
  });

  function statusVariant(o: IWorkOrder): "success" | "warning" | "danger" | "neutral" | "info" {
    if (o.paymentStatus === "Paid") return "success";
    if (o.paymentStatus === "Partial") return "warning";
    return "danger";
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-md" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No work orders found for {workerName}.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Work Type</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Amount Due</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Paid</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Balance</th>
              <th className="px-4 py-2 text-center font-medium text-gray-600">Status</th>
              <th className="px-4 py-2 text-center font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((o) => (
              <tr key={o._id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(o.date).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-2">{o.workType}</td>
                <td className="px-4 py-2 text-right">
                  ₹{(o.amountDue ?? 0).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2 text-right">
                  ₹{(o.amountPaid ?? 0).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={
                      o.runningBalance > 0 ? "text-[#D32F2F] font-semibold" : "text-green-700"
                    }
                  >
                    ₹{o.runningBalance.toLocaleString("en-IN")}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <Badge variant={statusVariant(o)}>{o.paymentStatus ?? o.status}</Badge>
                </td>
                <td className="px-4 py-2 text-center">
                  {o.status !== "Open" && o.paymentStatus !== "Paid" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPayOrder(o)}
                    >
                      Pay Now
                    </Button>
                  )}
                  {o.status === "Open" && (
                    <Badge variant="info">Open</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
              <td className="px-4 py-2 text-gray-500" colSpan={2}>
                Total ({orders.length} orders)
              </td>
              <td className="px-4 py-2 text-right">
                ₹{orders.reduce((s, o) => s + (o.amountDue ?? 0), 0).toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-2 text-right">
                ₹{orders.reduce((s, o) => s + (o.amountPaid ?? 0), 0).toLocaleString("en-IN")}
              </td>
              <td
                className={`px-4 py-2 text-right ${runningBalance > 0 ? "text-[#D32F2F]" : "text-green-700"}`}
              >
                ₹{runningBalance.toLocaleString("en-IN")}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      <PaymentModal
        isOpen={!!payOrder}
        onClose={() => setPayOrder(null)}
        workOrder={payOrder}
      />
    </>
  );
}
