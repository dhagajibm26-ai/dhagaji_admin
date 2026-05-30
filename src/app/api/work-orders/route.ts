import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { WorkOrder } from "@/models/WorkOrder";
import { Worker } from "@/models/Worker";
import { BanglesStock } from "@/models/BanglesStock";
import { ThreadsStock } from "@/models/ThreadsStock";
import { RawMaterial } from "@/models/RawMaterial";
import { workOrderCreateSchema } from "@/types";
import type { ApiResponse } from "@/types";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("workerId");
    const statusFilter = searchParams.get("status");

    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (workerId) filter.workerId = workerId;
    if (statusFilter) filter.status = statusFilter;

    const orders = await WorkOrder.find(filter)
      .sort({ date: -1 })
      .populate("workerId", "name phone");
    return NextResponse.json<ApiResponse>({ success: true, data: orders.map((o) => o.toJSON()) });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = workOrderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    const {
      workerId,
      date,
      workType,
      perPieceRate,
      banglesGiven,
      threadsGiven,
      threadStockId,
      glueGiven,
      glueStockId,
      otherMaterialGiven,
    } = parsed.data;

    await connectDB();

    // Verify worker exists
    const worker = await Worker.findOne({ _id: workerId, isDeleted: { $ne: true } });
    if (!worker) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Worker not found" }, { status: 404 });
    }

    // Deduct bangles stock (netUsed)
    if (banglesGiven.length > 0) {
      const banglesOps = banglesGiven.map((b) => ({
        updateOne: {
          filter: { _id: b.banglesStockId },
          update: { $inc: { netUsed: b.pieces } },
        },
      }));
      await BanglesStock.bulkWrite(banglesOps);
    }

    // Deduct threads stock (netUsed)
    if (threadsGiven > 0 && threadStockId) {
      await ThreadsStock.findByIdAndUpdate(threadStockId, { $inc: { netUsed: threadsGiven } });
    }

    // Deduct glue raw material (usedQty)
    if (glueGiven > 0 && glueStockId) {
      await RawMaterial.findByIdAndUpdate(glueStockId, { $inc: { usedQty: glueGiven } });
    }

    // Create work order
    const order = await WorkOrder.create({
      workerId,
      date: date ? new Date(date) : new Date(),
      workType,
      perPieceRate,
      banglesGiven,
      threadsGiven,
      glueGiven,
      otherMaterialGiven,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: order.toJSON() }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
