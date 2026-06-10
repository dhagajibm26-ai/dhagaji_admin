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

type StockMap = Record<string, number>;

function aggregateRequestedQty<T extends { id: string; qty: number }>(items: T[]): StockMap {
  return items.reduce<StockMap>((acc, item) => {
    acc[item.id] = (acc[item.id] ?? 0) + item.qty;
    return acc;
  }, {});
}

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
      threadItemsGiven,
      threadsGiven,
      threadStockId,
      rawMaterialsGiven,
      glueGiven,
      cutterGiven,
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
      const requested = aggregateRequestedQty(
        banglesGiven.map((b) => ({ id: String(b.banglesStockId), qty: b.pieces }))
      );

      const banglesDocs = await BanglesStock.find({ _id: { $in: Object.keys(requested) } });
      if (banglesDocs.length !== Object.keys(requested).length) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Some bangle stock entries were not found" },
          { status: 400 }
        );
      }

      for (const doc of banglesDocs) {
        const id = String(doc._id);
        const available = doc.closingStock;
        if ((requested[id] ?? 0) > available) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: `Insufficient bangle stock for size ${doc.size} ${doc.cutType}. Available: ${available}`,
            },
            { status: 400 }
          );
        }
      }

      const banglesOps = banglesGiven.map((b) => ({
        updateOne: {
          filter: { _id: b.banglesStockId },
          update: { $inc: { netUsed: b.pieces } },
        },
      }));
      await BanglesStock.bulkWrite(banglesOps);
    }

    // Deduct threads stock (netUsed)
    if (threadItemsGiven.length > 0) {
      const requested = aggregateRequestedQty(
        threadItemsGiven.map((t) => ({ id: String(t.threadStockId), qty: t.grams }))
      );

      const threadDocs = await ThreadsStock.find({ _id: { $in: Object.keys(requested) } });
      if (threadDocs.length !== Object.keys(requested).length) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Some thread stock entries were not found" },
          { status: 400 }
        );
      }

      for (const doc of threadDocs) {
        const id = String(doc._id);
        const available = doc.closingStock;
        if ((requested[id] ?? 0) > available) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: `Insufficient thread stock for ${doc.threadCode} (${doc.threadColour}). Available: ${available}g`,
            },
            { status: 400 }
          );
        }
      }

      const threadOps = threadItemsGiven
        .filter((t) => t.grams > 0)
        .map((t) => ({
          updateOne: {
            filter: { _id: t.threadStockId },
            update: { $inc: { netUsed: t.grams } },
          },
        }));
      if (threadOps.length > 0) {
        await ThreadsStock.bulkWrite(threadOps);
      }
    } else if (threadsGiven > 0 && threadStockId) {
      const threadDoc = await ThreadsStock.findById(threadStockId);
      if (!threadDoc) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Thread stock not found" },
          { status: 400 }
        );
      }
      if (threadsGiven > threadDoc.closingStock) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: `Insufficient thread stock for ${threadDoc.threadCode}. Available: ${threadDoc.closingStock}g`,
          },
          { status: 400 }
        );
      }
      await ThreadsStock.findByIdAndUpdate(threadStockId, { $inc: { netUsed: threadsGiven } });
    }

    // Deduct glue/cutter raw material (usedQty)
    if (rawMaterialsGiven.length > 0) {
      const requested = aggregateRequestedQty(
        rawMaterialsGiven.map((r) => ({ id: String(r.rawMaterialId), qty: r.qty }))
      );

      const rawDocs = await RawMaterial.find({ _id: { $in: Object.keys(requested) } });
      if (rawDocs.length !== Object.keys(requested).length) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Some raw material entries were not found" },
          { status: 400 }
        );
      }

      for (const doc of rawDocs) {
        const id = String(doc._id);
        const available = doc.closingStock;
        if ((requested[id] ?? 0) > available) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: `Insufficient stock for ${doc.itemName}. Available: ${available} ${doc.unit}`,
            },
            { status: 400 }
          );
        }
      }

      const rawOps = rawMaterialsGiven
        .filter((r) => r.qty > 0)
        .map((r) => ({
          updateOne: {
            filter: { _id: r.rawMaterialId },
            update: { $inc: { usedQty: r.qty } },
          },
        }));
      if (rawOps.length > 0) {
        await RawMaterial.bulkWrite(rawOps);
      }
    } else if (glueGiven > 0 && glueStockId) {
      const glueDoc = await RawMaterial.findById(glueStockId);
      if (!glueDoc) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Raw material stock not found" },
          { status: 400 }
        );
      }
      if (glueGiven > glueDoc.closingStock) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: `Insufficient stock for ${glueDoc.itemName}. Available: ${glueDoc.closingStock} ${glueDoc.unit}`,
          },
          { status: 400 }
        );
      }
      await RawMaterial.findByIdAndUpdate(glueStockId, { $inc: { usedQty: glueGiven } });
    }

    const totalThreads = threadItemsGiven.length > 0
      ? threadItemsGiven.reduce((s, t) => s + t.grams, 0)
      : threadsGiven;

    const totalGlue = rawMaterialsGiven.length > 0
      ? rawMaterialsGiven
          .filter((r) => r.kind === "glue")
          .reduce((s, r) => s + r.qty, 0)
      : glueGiven;

    const totalCutter = rawMaterialsGiven.length > 0
      ? rawMaterialsGiven
          .filter((r) => r.kind === "cutter")
          .reduce((s, r) => s + r.qty, 0)
      : cutterGiven;

    // Create work order
    const order = await WorkOrder.create({
      workerId,
      date: date ? new Date(date) : new Date(),
      workType,
      perPieceRate,
      banglesGiven,
      threadItemsGiven,
      threadsGiven: totalThreads,
      rawMaterialsGiven,
      glueGiven: totalGlue,
      cutterGiven: totalCutter,
      otherMaterialGiven,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: order.toJSON() }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
