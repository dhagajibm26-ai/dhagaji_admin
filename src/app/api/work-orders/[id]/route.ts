import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { WorkOrder } from "@/models/WorkOrder";
import { Worker } from "@/models/Worker";
import { workOrderReturnSchema } from "@/types";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    const order = await WorkOrder.findById(id).populate("workerId", "name phone");
    if (!order) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Work order not found" }, { status: 404 });
    }
    return NextResponse.json<ApiResponse>({ success: true, data: order.toJSON() });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH — record LENA (return material) and output (finished pieces / quality) */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = workOrderReturnSchema.safeParse(body);
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
    if (order.status !== "Open") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Work order is already closed" },
        { status: 400 }
      );
    }

    const {
      banglesReturned,
      threadsReturned,
      glueReturned,
      otherReturned,
      finishedPieces,
      qualityOK,
      perPieceRate,
    } = parsed.data;

    order.banglesReturned = banglesReturned as typeof order.banglesReturned;
    order.threadsReturned = threadsReturned;
    order.glueReturned = glueReturned;
    order.otherReturned = otherReturned as typeof order.otherReturned;
    order.finishedPieces = finishedPieces;
    order.qualityOK = qualityOK;
    if (perPieceRate !== undefined) order.perPieceRate = perPieceRate;
    order.status = "Returned";

    await order.save();

    // Update Worker.totalEarned with the amountDue (qualityOK * perPieceRate)
    const amountDue = order.qualityOK * order.perPieceRate;
    if (amountDue > 0) {
      await Worker.findByIdAndUpdate(order.workerId, { $inc: { totalEarned: amountDue } });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: order.toJSON() });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
