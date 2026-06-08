import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { WorkOrder } from "@/models/WorkOrder";
import { Worker } from "@/models/Worker";
import { paymentSchema } from "@/types";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();
    const order = await WorkOrder.findById(id);
    if (!order) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Work order not found" }, { status: 404 });
    }

    const { amount } = parsed.data;
    const okEarnings = order.qualityOK * order.perPieceRate;
    const rejected = Math.max(0, order.finishedPieces - order.qualityOK);
    const rejectionDeduction = rejected * order.perPieceRate * 0.5;
    const netAmountDue = Math.max(0, okEarnings - rejectionDeduction);

    const oldAmountPaid = order.amountPaid;
    const newAmountPaid = netAmountDue > 0
      ? Math.min(oldAmountPaid + amount, netAmountDue)
      : oldAmountPaid + amount;
    const actualPaid = newAmountPaid - oldAmountPaid;

    order.amountPaid = newAmountPaid;
    if (order.status === "Returned" && netAmountDue > 0 && newAmountPaid >= netAmountDue) {
      order.status = "Completed";
    }
    await order.save();

    // Increment Worker.totalPaid by what was actually applied
    await Worker.findByIdAndUpdate(order.workerId, { $inc: { totalPaid: actualPaid } });

    return NextResponse.json<ApiResponse>({ success: true, data: order.toJSON() });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
