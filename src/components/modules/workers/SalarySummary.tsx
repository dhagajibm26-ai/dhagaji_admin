"use client";

import { useState } from "react";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { useRecordPayment } from "@/hooks/useWorkOrders";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PaymentModal } from "./PaymentModal";
import type { IWorker, IWorkOrder } from "@/types";

interface SalarySummaryProps {
  workers: IWorker[];
}

interface WorkerStat {
  worker: IWorker;
  totalOKPieces: number;
  totalRejectedPieces: number;
  totalFinishedPieces: number;
  pendingPieces: number;         // from open orders
  totalOKEarnings: number;
  totalRejectionDeductions: number;
  netPayable: number;            // from closed orders
  amountPaid: number;
  outstandingBalance: number;
}

function WorkerSalaryRow({ worker }: { worker: IWorker }) {
  const { data: orders = [], isLoading } = useWorkOrders({ workerId: worker._id });
  const [payOrder, setPayOrder] = useState<IWorkOrder | null>(null);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={8} className="px-4 py-3">
          <div className="h-4 skeleton rounded w-full" />
        </td>
      </tr>
    );
  }

  const closedOrders = orders.filter((o) => o.status !== "Open");
  const openOrders = orders.filter((o) => o.status === "Open");

  // Stats from closed orders
  const totalOKPieces = closedOrders.reduce((s, o) => s + o.qualityOK, 0);
  const totalFinished = closedOrders.reduce((s, o) => s + o.finishedPieces, 0);
  const totalRejected = closedOrders.reduce((s, o) => s + Math.max(0, o.finishedPieces - o.qualityOK), 0);
  const totalOKEarnings = closedOrders.reduce((s, o) => s + (o.amountDue ?? 0), 0);
  const totalDeductions = closedOrders.reduce((s, o) => s + (o.rejectionDeduction ?? 0), 0);
  const netPayable = closedOrders.reduce((s, o) => s + (o.netAmountDue ?? 0), 0);

  // Pending pieces from open orders
  const pendingPieces = openOrders.reduce(
    (s, o) => s + o.banglesGiven.reduce((ps, b) => ps + b.pieces, 0),
    0
  );

  // Find latest unpaid order for quick payment
  const unpaidOrder = orders.find(
    (o) => o.status === "Returned" && (o.paymentStatus === "Unpaid" || o.paymentStatus === "Partial")
  );

  const balance = worker.balance ?? 0;

  return (
    <>
      <tr className="hover:bg-slate-50/60 transition-colors">
        <td className="px-4 py-3">
          <div>
            <p className="font-semibold text-slate-800">{worker.name}</p>
            {worker.phone && <p className="text-xs text-slate-400">{worker.phone}</p>}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="font-semibold text-green-700">{totalOKPieces}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`font-semibold ${totalRejected > 0 ? "text-rose-600" : "text-slate-400"}`}>
            {totalRejected}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`font-semibold ${pendingPieces > 0 ? "text-amber-600" : "text-slate-400"}`}>
            {pendingPieces}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="font-semibold text-slate-700">₹{totalOKEarnings.toLocaleString("en-IN")}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className={`font-semibold ${totalDeductions > 0 ? "text-rose-600" : "text-slate-400"}`}>
            {totalDeductions > 0 ? `−₹${totalDeductions.toLocaleString("en-IN")}` : "—"}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="font-black text-green-700">₹{netPayable.toLocaleString("en-IN")}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="font-semibold text-slate-600">₹{worker.totalPaid.toLocaleString("en-IN")}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className={`font-black ${balance > 0 ? "text-rose-600" : "text-green-700"}`}>
            ₹{balance.toLocaleString("en-IN")}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <Badge variant={balance > 0 ? "danger" : "success"}>
            {balance > 0 ? "Baaki" : "Clear"}
          </Badge>
        </td>
        <td className="px-4 py-3 text-center">
          {unpaidOrder ? (
            <Button size="sm" variant="primary" onClick={() => setPayOrder(unpaidOrder)}>
              Pay Karo
            </Button>
          ) : balance > 0 ? (
            <span className="text-xs text-slate-400">No returned order</span>
          ) : (
            <span className="text-xs text-green-600 font-semibold">✓ Paid</span>
          )}
        </td>
      </tr>
      <PaymentModal isOpen={!!payOrder} onClose={() => setPayOrder(null)} workOrder={payOrder} />
    </>
  );
}

export function SalarySummary({ workers }: SalarySummaryProps) {
  const activeWorkers = workers.filter((w) => w.isActive);

  if (activeWorkers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-semibold text-slate-500">Koi active worker nahi hai.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-slate-800">Salary Summary / Tanjka</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Har worker ki kamai, rejection, aur baaki payment ka hisaab
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          OK Pieces = sahi bane
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
          Rejected = kharab nikle (50% katega)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          Pending = abhi kaam chal raha hai
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 min-w-[120px]">Worker</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">OK Pieces</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Rejected</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Pending</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Gross Kamai</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Rejection Cut</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400 bg-green-50">Net Payable</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Paid</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Balance</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {activeWorkers.map((w) => (
              <WorkerSalaryRow key={w._id} worker={w} />
            ))}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200">
              <td className="px-4 py-3 font-black text-slate-800 text-xs uppercase">TOTAL</td>
              <td className="px-4 py-3 text-center font-black text-green-700">—</td>
              <td className="px-4 py-3 text-center font-black text-rose-600">—</td>
              <td className="px-4 py-3 text-center font-black text-amber-600">—</td>
              <td className="px-4 py-3 text-right font-black text-slate-800">
                ₹{activeWorkers.reduce((s, w) => s + w.totalEarned, 0).toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3 text-right font-black text-rose-600">—</td>
              <td className="px-4 py-3 text-right font-black text-green-700 bg-green-50">—</td>
              <td className="px-4 py-3 text-right font-black text-slate-700">
                ₹{activeWorkers.reduce((s, w) => s + w.totalPaid, 0).toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3 text-right font-black text-rose-600">
                ₹{activeWorkers.reduce((s, w) => s + (w.balance ?? 0), 0).toLocaleString("en-IN")}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Explanation card */}
      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700 space-y-1.5">
        <p className="font-bold text-blue-800 mb-1">📌 Hisaab kaise hota hai?</p>
        <p>✅ <strong>OK Pieces × Rate</strong> = Gross Kamai</p>
        <p>❌ <strong>Rejected Pieces × Rate × 50%</strong> = Rejection Kat (penalty)</p>
        <p>💰 <strong>Gross Kamai − Rejection Kat</strong> = Net Payable (actual payment)</p>
        <p>🔄 <strong>Net Payable − Already Paid</strong> = Outstanding Balance</p>
      </div>
    </div>
  );
}
