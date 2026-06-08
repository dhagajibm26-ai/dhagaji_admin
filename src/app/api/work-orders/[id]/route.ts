import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { WorkOrder } from "@/models/WorkOrder";
import { Worker } from "@/models/Worker";
import { BanglesStock } from "@/models/BanglesStock";
import { ThreadsStock } from "@/models/ThreadsStock";
import { RawMaterial } from "@/models/RawMaterial";
import { FinishedProduct } from "@/models/FinishedProduct";
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
      cutterReturned,
      otherReturned,
      finishedPieces,
      qualityOK,
      finishedProductId,
      perPieceRate,
      damageNotes,
    } = parsed.data;

    order.banglesReturned = banglesReturned as typeof order.banglesReturned;
    order.threadsReturned = threadsReturned;
    order.glueReturned = glueReturned;
    order.cutterReturned = cutterReturned;
    order.otherReturned = otherReturned as typeof order.otherReturned;
    order.finishedPieces = finishedPieces;
    order.qualityOK = qualityOK;
    if (perPieceRate !== undefined) order.perPieceRate = perPieceRate;
    if (damageNotes !== undefined) order.damageNotes = damageNotes;
    order.status = "Returned";

    await order.save();

    // ── Restore returned stock back to inventory ──────────────────────────────

    // Bangles returned → reduce netUsed per cutType
    if (banglesReturned.length > 0) {
      const banglesOps = banglesReturned
        .map((ret) => {
          const original = order.banglesGiven.find(
            (g) => g.cutType === ret.cutType
          );
          if (!original) return null;
          return {
            updateOne: {
              filter: { _id: original.banglesStockId },
              update: { $inc: { netUsed: -ret.pieces } },
            },
          };
        })
        .filter((op): op is NonNullable<typeof op> => op !== null);
      if (banglesOps.length > 0) await BanglesStock.bulkWrite(banglesOps);
    }

    // Threads returned → reduce netUsed proportionally across threadItemsGiven
    if (threadsReturned > 0 && order.threadItemsGiven?.length > 0) {
      const totalGiven = order.threadItemsGiven.reduce((s, t) => s + t.grams, 0);
      const threadOps = order.threadItemsGiven
        .filter((t) => t.grams > 0 && totalGiven > 0)
        .map((t) => {
          const share = Math.min(
            t.grams,
            Math.round((t.grams / totalGiven) * threadsReturned * 100) / 100
          );
          return {
            updateOne: {
              filter: { _id: t.threadStockId },
              update: { $inc: { netUsed: -share } },
            },
          };
        });
      if (threadOps.length > 0) await ThreadsStock.bulkWrite(threadOps);
    }

    // Glue returned → reduce usedQty for glue raw materials
    if (glueReturned > 0 && order.rawMaterialsGiven?.length > 0) {
      const glueItems = order.rawMaterialsGiven.filter((r) => r.kind === "glue");
      const totalGlueGiven = glueItems.reduce((s, r) => s + r.qty, 0);
      if (glueItems.length > 0 && totalGlueGiven > 0) {
        const glueOps = glueItems.map((r) => {
          const share = Math.min(
            r.qty,
            Math.round((r.qty / totalGlueGiven) * glueReturned * 100) / 100
          );
          return {
            updateOne: {
              filter: { _id: r.rawMaterialId },
              update: { $inc: { usedQty: -share } },
            },
          };
        });
        await RawMaterial.bulkWrite(glueOps);
      }
    }

    // Cutter returned → reduce usedQty for cutter raw materials
    if (cutterReturned > 0 && order.rawMaterialsGiven?.length > 0) {
      const cutterItems = order.rawMaterialsGiven.filter((r) => r.kind === "cutter");
      const totalCutterGiven = cutterItems.reduce((s, r) => s + r.qty, 0);
      if (cutterItems.length > 0 && totalCutterGiven > 0) {
        const cutterOps = cutterItems.map((r) => {
          const share = Math.min(
            r.qty,
            Math.round((r.qty / totalCutterGiven) * cutterReturned * 100) / 100
          );
          return {
            updateOne: {
              filter: { _id: r.rawMaterialId },
              update: { $inc: { usedQty: -share } },
            },
          };
        });
        await RawMaterial.bulkWrite(cutterOps);
      }
    }

    // ── Update Worker.totalEarned ─────────────────────────────────────────────
    const okEarnings = order.qualityOK * order.perPieceRate;
    const rejected = Math.max(0, order.finishedPieces - order.qualityOK);
    const rejectionDeduction = rejected * order.perPieceRate * 0.5;
    const netAmountDue = Math.max(0, okEarnings - rejectionDeduction);
    if (netAmountDue > 0) {
      await Worker.findByIdAndUpdate(order.workerId, { $inc: { totalEarned: netAmountDue } });
    }

    if (finishedProductId && qualityOK > 0) {
      await FinishedProduct.findByIdAndUpdate(finishedProductId, {
        $inc: { readyStock: qualityOK },
      });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: order.toJSON() });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
