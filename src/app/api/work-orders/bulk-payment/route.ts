import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { WorkOrder } from "@/models/WorkOrder";
import { Worker } from "@/models/Worker";
import type { ApiResponse } from "@/types";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { orderIds, totalAmount } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: "No work orders selected" }, { status: 400 });
    }

    const amtToPay = Number(totalAmount);
    if (!amtToPay || amtToPay <= 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Amount must be greater than 0" }, { status: 400 });
    }

    await connectDB();

    let remaining = amtToPay;
    const updatedOrders = [];

    for (const id of orderIds) {
      if (remaining <= 0) break;

      const order = await WorkOrder.findById(id);
      if (!order || order.isHold || order.status === "Open") continue;

      const okEarnings = order.qualityOK * order.perPieceRate;
      const rejected = Math.max(0, order.finishedPieces - order.qualityOK);
      const rejectionDeduction = rejected * order.perPieceRate * 0.5;
      const netAmountDue = Math.max(0, okEarnings - rejectionDeduction);

      const oldPaid = order.amountPaid ?? 0;
      const outstanding = Math.max(0, netAmountDue - oldPaid);
      if (outstanding <= 0) continue;

      const payThisOrder = Math.min(outstanding, remaining);
      const newAmountPaid = oldPaid + payThisOrder;
      const actualPaid = newAmountPaid - oldPaid;

      order.amountPaid = newAmountPaid;
      if (order.status === "Returned" && netAmountDue > 0 && newAmountPaid >= netAmountDue) {
        order.status = "Completed";
      }
      await order.save();

      await Worker.findByIdAndUpdate(order.workerId, { $inc: { totalPaid: actualPaid } });

      remaining -= actualPaid;
      updatedOrders.push(order.toJSON());
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Processed payment for ${updatedOrders.length} work orders`,
      data: updatedOrders,
    });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
