"use client";

import { useState, useMemo } from "react";
import { useRecordBulkPayment } from "@/hooks/useWorkOrders";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { IWorkOrder } from "@/types";

interface BulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrders: IWorkOrder[];
  onSuccess?: () => void;
}

export function BulkPaymentModal({ isOpen, onClose, selectedOrders, onSuccess }: BulkPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI" | "Card">("Cash");
  const bulkPayMutation = useRecordBulkPayment();

  // Filter out any held or open orders
  const payableOrders = useMemo(() => {
    return selectedOrders.filter((o) => !o.isHold && o.status !== "Open" && o.paymentStatus !== "Paid");
  }, [selectedOrders]);

  const totalOutstanding = useMemo(() => {
    return payableOrders.reduce((sum, o) => {
      const gross = o.qualityOK * o.perPieceRate;
      const rejected = Math.max(0, o.finishedPieces - o.qualityOK);
      const deduction = rejected * o.perPieceRate * 0.5;
      const netPayable = Math.max(0, gross - deduction);
      const due = o.netAmountDue ?? netPayable;
      const balance = due - (o.amountPaid ?? 0);
      return sum + Math.max(0, balance);
    }, 0);
  }, [payableOrders]);

  const effectiveAmount = amount ? parseFloat(amount) : totalOutstanding;

  if (!isOpen) return null;

  function handleClose() {
    setAmount("");
    setPaymentMethod("Cash");
    onClose();
  }

  function handlePay() {
    const amt = amount ? parseFloat(amount) : totalOutstanding;
    if (!amt || amt <= 0 || payableOrders.length === 0) return;

    const orderIds = payableOrders.map((o) => o._id);
    bulkPayMutation.mutate(
      { orderIds, totalAmount: amt, paymentMethod },
      {
        onSuccess: () => {
          handleClose();
          onSuccess?.();
        },
      }
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Record Payment"
      size="md"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={bulkPayMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={bulkPayMutation.isPending}
            disabled={payableOrders.length === 0 || effectiveAmount <= 0}
            onClick={handlePay}
          >
            Pay ₹{effectiveAmount.toLocaleString("en-IN")} Now
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Selected Orders List */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Selected Work Orders ({payableOrders.length})
          </p>
          {payableOrders.map((o) => {
            const gross = o.qualityOK * o.perPieceRate;
            const rejected = Math.max(0, o.finishedPieces - o.qualityOK);
            const deduction = rejected * o.perPieceRate * 0.5;
            const netPayable = Math.max(0, gross - deduction);
            const due = o.netAmountDue ?? netPayable;
            const balance = Math.max(0, due - (o.amountPaid ?? 0));
            return (
              <div key={o._id} className="flex justify-between items-center text-xs py-1 border-b border-slate-200/60 last:border-0">
                <span className="font-medium text-slate-700">{o.workType}</span>
                <span className="font-bold text-green-700">Due: ₹{balance.toLocaleString("en-IN")}</span>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="flex justify-between items-center rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm">
          <span className="font-semibold text-emerald-800">Total Outstanding for Selected</span>
          <span className="text-lg font-black text-emerald-700">₹{totalOutstanding.toLocaleString("en-IN")}</span>
        </div>

        {/* Custom Amount override */}
        <Input
          label="Amount to Pay (₹)"
          type="number"
          min={0.01}
          max={totalOutstanding}
          step={1}
          placeholder={`Defaults to total ₹${totalOutstanding.toLocaleString("en-IN")}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {/* Payment method */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Payment Method</p>
          <div className="flex gap-3">
            {(["Cash", "UPI", "Card"] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="bulkPaymentMethod"
                  value={m}
                  checked={paymentMethod === m}
                  onChange={() => setPaymentMethod(m)}
                  className="accent-[#D32F2F]"
                />
                {m}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
