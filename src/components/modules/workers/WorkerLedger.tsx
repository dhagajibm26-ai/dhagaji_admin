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

  function statusVariant(o: IWorkOrder): "success" | "warning" | "danger" | "neutral" | "info" {
    if (o.status === "Open") return "info";
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
      <p className="text-sm text-slate-500 text-center py-8">
        No work orders found for {workerName}.
      </p>
    );
  }

  const totalNetPayable = orders.reduce((s, o) => s + (o.netAmountDue ?? o.amountDue ?? 0), 0);
  const totalPaid = orders.reduce((s, o) => s + (o.amountPaid ?? 0), 0);
  const totalBalance = totalNetPayable - totalPaid;

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-3 text-center">
          <p className="text-xs text-slate-500">Total Orders</p>
          <p className="text-xl font-black text-slate-800 mt-0.5">{orders.length}</p>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-center">
          <p className="text-xs text-green-600">Net Payable</p>
          <p className="text-lg font-black text-green-700 mt-0.5">₹{totalNetPayable.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
          <p className="text-xs text-blue-600">Total Paid</p>
          <p className="text-lg font-black text-blue-700 mt-0.5">₹{totalPaid.toLocaleString("en-IN")}</p>
        </div>
        <div className={`rounded-xl border p-3 text-center ${totalBalance > 0 ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"}`}>
          <p className={`text-xs ${totalBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>Outstanding</p>
          <p className={`text-lg font-black mt-0.5 ${totalBalance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
            ₹{totalBalance.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Work Type</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">OK Pcs</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Rejected</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Gross</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Kat (50%)</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-green-600">Net Pay</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Paid</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map((o) => {
              const rejected = Math.max(0, o.finishedPieces - o.qualityOK);
              const rejectionDeduction = o.rejectionDeduction ?? (rejected * o.perPieceRate * 0.5);
              const netPay = o.netAmountDue ?? Math.max(0, (o.amountDue ?? 0) - rejectionDeduction);
              const balance = netPay - (o.amountPaid ?? 0);

              return (
                <tr key={o._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {new Date(o.date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{o.workType}</td>
                  <td className="px-4 py-3 text-center font-semibold text-green-700">
                    {o.status === "Open" ? <span className="text-slate-400">—</span> : o.qualityOK}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {o.status === "Open" ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className={`font-semibold ${rejected > 0 ? "text-rose-600" : "text-slate-400"}`}>
                        {rejected}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {o.status === "Open" ? "—" : `₹${(o.amountDue ?? 0).toLocaleString("en-IN")}`}
                  </td>
                  <td className="px-4 py-3 text-right text-rose-600">
                    {o.status === "Open" || rejectionDeduction === 0
                      ? <span className="text-slate-400">—</span>
                      : `−₹${rejectionDeduction.toLocaleString("en-IN")}`}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">
                    {o.status === "Open" ? (
                      <Badge variant="info">Open</Badge>
                    ) : (
                      `₹${netPay.toLocaleString("en-IN")}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    ₹{(o.amountPaid ?? 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={statusVariant(o)}>
                      {o.status === "Open" ? "Pending" : (o.paymentStatus ?? o.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {o.status !== "Open" && o.paymentStatus !== "Paid" && (
                      <Button size="sm" variant="outline" onClick={() => setPayOrder(o)}>
                        Pay Now
                      </Button>
                    )}
                    {o.status === "Open" && (
                      <span className="text-xs text-amber-600 font-semibold">In Progress</span>
                    )}
                    {o.status !== "Open" && o.paymentStatus === "Paid" && (
                      <span className="text-xs text-green-600 font-semibold">✓ Done</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
              <td className="px-4 py-3 text-slate-500 text-xs uppercase" colSpan={2}>
                Total ({orders.length} orders)
              </td>
              <td className="px-4 py-3 text-center font-black text-green-700">
                {orders.filter(o => o.status !== "Open").reduce((s, o) => s + o.qualityOK, 0)}
              </td>
              <td className="px-4 py-3 text-center font-black text-rose-600">
                {orders.filter(o => o.status !== "Open").reduce((s, o) => s + Math.max(0, o.finishedPieces - o.qualityOK), 0)}
              </td>
              <td className="px-4 py-3 text-right font-black text-slate-700">
                ₹{orders.filter(o => o.status !== "Open").reduce((s, o) => s + (o.amountDue ?? 0), 0).toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3 text-right font-black text-rose-600">
                −₹{orders.filter(o => o.status !== "Open").reduce((s, o) => s + (o.rejectionDeduction ?? 0), 0).toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3 text-right font-black text-green-700">
                ₹{totalNetPayable.toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3 text-right font-black text-slate-700">
                ₹{totalPaid.toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3 text-center" colSpan={2}>
                <span className={`font-black text-sm ${totalBalance > 0 ? "text-rose-600" : "text-green-700"}`}>
                  Outstanding: ₹{Math.abs(totalBalance).toLocaleString("en-IN")}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <PaymentModal isOpen={!!payOrder} onClose={() => setPayOrder(null)} workOrder={payOrder} />
    </>
  );
}
