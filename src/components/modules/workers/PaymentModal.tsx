"use client";

import { useState } from "react";
import { useRecordPayment } from "@/hooks/useWorkOrders";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { IWorkOrder } from "@/types";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: IWorkOrder | null;
}

export function PaymentModal({ isOpen, onClose, workOrder }: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI" | "Card">("Cash");
  const payMutation = useRecordPayment();

  const balance = workOrder
    ? (workOrder.balance ?? (workOrder.netAmountDue ?? workOrder.amountDue) - workOrder.amountPaid)
    : 0;

  if (!workOrder) return null;

  function handleClose() {
    setAmount("");
    setPaymentMethod("Cash");
    onClose();
  }

  function handlePay() {
    if (!workOrder) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    payMutation.mutate(
      { id: workOrder._id, data: { amount: amt, paymentMethod } },
      { onSuccess: handleClose }
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Record Payment"
      size="sm"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={payMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={payMutation.isPending}
            disabled={!amount || parseFloat(amount) <= 0}
            onClick={handlePay}
          >
            Pay Now
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Balance summary */}
        <div className="rounded-xl bg-slate-50 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Work Type</span>
            <span className="font-medium">{workOrder.workType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount Due</span>
            <span className="font-medium">₹{workOrder.amountDue.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Already Paid</span>
            <span className="font-medium">₹{workOrder.amountPaid.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="font-semibold">Outstanding Balance</span>
            <span className="font-bold text-[#D32F2F]">₹{balance.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <Input
          label="Amount to Pay (₹)"
          type="number"
          required
          min={0.01}
          max={balance}
          step={1}
          placeholder={`Max ₹${balance}`}
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
                  name="paymentMethod"
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
