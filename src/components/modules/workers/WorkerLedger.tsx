"use client";

import { useState, useMemo } from "react";
import { useWorkOrders, useToggleHoldWorkOrder } from "@/hooks/useWorkOrders";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PaymentModal } from "./PaymentModal";
import { BulkPaymentModal } from "./BulkPaymentModal";
import { formatDateDMY } from "@/lib/utils";
import type { IWorkOrder } from "@/types";

interface WorkerLedgerProps {
  workerId: string;
  workerName: string;
}

export function WorkerLedger({ workerId, workerName }: WorkerLedgerProps) {
  const { data: orders = [], isLoading } = useWorkOrders({ workerId });
  const toggleHoldMutation = useToggleHoldWorkOrder();
  const [payOrder, setPayOrder] = useState<IWorkOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPayOpen, setIsBulkPayOpen] = useState(false);

  function statusVariant(o: IWorkOrder): "success" | "warning" | "danger" | "neutral" | "info" {
    if (o.isHold) return "warning";
    if (o.status === "Open") return "info";
    if (o.paymentStatus === "Paid") return "success";
    if (o.paymentStatus === "Partial") return "warning";
    return "danger";
  }

  // Filter payable orders that are not on hold and not open and not fully paid
  const payableOrders = useMemo(() => {
    return orders.filter((o) => !o.isHold && o.status !== "Open" && o.paymentStatus !== "Paid");
  }, [orders]);

  const selectedOrders = useMemo(() => {
    return orders.filter((o) => selectedIds.has(o._id));
  }, [orders, selectedIds]);

  const selectedPayableTotal = useMemo(() => {
    return selectedOrders
      .filter((o) => !o.isHold && o.status !== "Open" && o.paymentStatus !== "Paid")
      .reduce((sum, o) => {
        const gross = o.qualityOK * o.perPieceRate;
        const rejected = Math.max(0, o.finishedPieces - o.qualityOK);
        const deduction = rejected * o.perPieceRate * 0.5;
        const net = Math.max(0, gross - deduction);
        const due = o.netAmountDue ?? net;
        const bal = due - (o.amountPaid ?? 0);
        return sum + Math.max(0, bal);
      }, 0);
  }, [selectedOrders]);

  const isAllPayableSelected = payableOrders.length > 0 && payableOrders.every((o) => selectedIds.has(o._id));

  function toggleSelectAll() {
    if (isAllPayableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payableOrders.map((o) => o._id)));
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
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
      {/* Summary Cards & Common Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto flex-1">
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
      </div>

      {/* Bulk Action Bar */}
      <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span>Selected: {selectedIds.size} orders</span>
          {selectedPayableTotal > 0 && (
            <span className="text-emerald-700 font-bold ml-2">
              (Payable: ₹{selectedPayableTotal.toLocaleString("en-IN")})
            </span>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          disabled={selectedIds.size === 0 || selectedPayableTotal <= 0}
          onClick={() => setIsBulkPayOpen(true)}
        >
          💳 Pay Selected ({selectedIds.size})
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#D32F2F] border-b border-slate-100 text-white">
              <th className="w-10 px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={isAllPayableSelected}
                  onChange={toggleSelectAll}
                  disabled={payableOrders.length === 0}
                  className="rounded accent-white cursor-pointer"
                  title="Select all payable orders"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">Date</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">Work Type</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">OK Pcs</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">Rejected</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white">Gross</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white">Kat (50%)</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white">Net Pay</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white">Paid</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">Status</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map((o) => {
              const rejected = Math.max(0, o.finishedPieces - o.qualityOK);
              const rejectionDeduction = o.rejectionDeduction ?? (rejected * o.perPieceRate * 0.5);
              const netPay = o.netAmountDue ?? Math.max(0, (o.amountDue ?? 0) - rejectionDeduction);
              const isPayable = !o.isHold && o.status !== "Open" && o.paymentStatus !== "Paid";

              return (
                <tr key={o._id} className={`hover:bg-slate-50/60 transition-colors ${o.isHold ? "bg-amber-50/40" : ""}`}>
                  <td className="w-10 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(o._id)}
                      onChange={() => toggleSelect(o._id)}
                      disabled={!isPayable}
                      className="rounded accent-[#D32F2F] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 tabular-nums">
                    {formatDateDMY(o.date)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex items-center gap-2">
                      <span>{o.workType}</span>
                      {o.isHold && (
                        <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
                          ⏸ On Hold
                        </Badge>
                      )}
                    </div>
                  </td>
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
                    {o.isHold ? (
                      <Badge variant="warning">On Hold</Badge>
                    ) : (
                      <Badge variant={statusVariant(o)}>
                        {o.status === "Open" ? "Pending" : (o.paymentStatus ?? o.status)}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Hold / Unhold Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleHoldMutation.mutate({ id: o._id, isHold: !o.isHold })}
                        disabled={toggleHoldMutation.isPending}
                        className={`text-xs px-2 py-1 rounded font-semibold transition-colors ${
                          o.isHold
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title={o.isHold ? "Release payment from hold" : "Put payment on hold"}
                      >
                        {o.isHold ? "Unhold" : "Hold"}
                      </button>

                      {/* Pay Now Button */}
                      {o.status !== "Open" && o.paymentStatus !== "Paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={o.isHold}
                          title={o.isHold ? "Payment is on hold" : undefined}
                          onClick={() => setPayOrder(o)}
                        >
                          Pay Now
                        </Button>
                      )}
                      {o.status === "Open" && (
                        <span className="text-xs text-amber-600 font-semibold">In Progress</span>
                      )}
                      {o.status !== "Open" && o.paymentStatus === "Paid" && (
                        <span className="text-xs text-green-600 font-semibold">✓ Done</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
              <td className="px-4 py-3 text-slate-500 text-xs uppercase" colSpan={3}>
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
      <BulkPaymentModal
        isOpen={isBulkPayOpen}
        onClose={() => setIsBulkPayOpen(false)}
        selectedOrders={selectedOrders}
        onSuccess={() => setSelectedIds(new Set())}
      />
    </>
  );
}
