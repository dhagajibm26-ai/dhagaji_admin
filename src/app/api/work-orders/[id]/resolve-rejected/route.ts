import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { WorkOrder } from "@/models/WorkOrder";
import { Worker } from "@/models/Worker";
import { FinishedProduct } from "@/models/FinishedProduct";
import { z } from "zod";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const resolveRejectedSchema = z.object({
  /**
   * How many of the remaining rejected pieces are now OK.
   * Must equal ALL remaining rejected pieces — partial resolution is not allowed.
   */
  nowOK: z.number().min(1, "At least 1 piece must be resolved"),
  /** Existing finished product to add all pieces to */
  finishedProductId: z.string().optional(),
  /** Create a brand-new finished product from this resolution */
  newFinishedProduct: z
    .object({
      category: z.string().min(1).default("Bangle"),
      designName: z.string().min(1, "Design name required"),
      designCode: z.string().optional(),
      size: z.string().min(1, "Size required"),
      makingCostPerPc: z.number().min(0).optional(),
      otherCostPerPc: z.number().min(0).optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = resolveRejectedSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = await (WorkOrder as any).findById(id).populate("workerId", "name");
    if (!order) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Work order not found" }, { status: 404 });
    }
    if (order.status !== "Rejected") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Work order is not in Rejected status" },
        { status: 400 }
      );
    }

    const { nowOK, finishedProductId, newFinishedProduct, notes } = parsed.data;

    // ── Validate: ALL remaining rejected pieces must be resolved at once ──────
    const totalRejected = Math.max(0, order.finishedPieces - order.qualityOK);
    const alreadyResolved = order.rejectedResolved ?? 0;
    const remainingRejected = totalRejected - alreadyResolved;

    if (nowOK !== remainingRejected) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Must resolve ALL ${remainingRejected} remaining rejected piece(s) at once. You entered ${nowOK}.`,
        },
        { status: 400 }
      );
    }

    // ── Update order state ────────────────────────────────────────────────────
    order.rejectedResolved = totalRejected; // all resolved
    order.status = "Completed";
    if (notes) {
      order.damageNotes = [order.damageNotes, `[Rework note]: ${notes}`]
        .filter(Boolean)
        .join(" | ");
    }

    // ── Add ALL pieces (qualityOK + nowOK) to finished stock ─────────────────
    // NOTE: during "Move to Rejected" save, NO stock was added.
    // So now we add everything at once.
    const totalToStock = order.qualityOK + nowOK; // e.g. 8 + 2 = 10

    if (totalToStock > 0 && newFinishedProduct) {
      let makingCost: number = newFinishedProduct.makingCostPerPc ?? 0;
      if (newFinishedProduct.makingCostPerPc === undefined) {
        let sumRates = order.perPieceRate;
        if (order.assignmentType === "half" && order.parentWorkOrderId) {
          let currentParentId = order.parentWorkOrderId;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          while (currentParentId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parent = await (WorkOrder as any).findById(currentParentId);
            if (!parent) break;
            sumRates += parent.perPieceRate;
            currentParentId = parent.parentWorkOrderId ?? undefined;
          }
        }
        makingCost = sumRates;
      }
      const otherCost = newFinishedProduct.otherCostPerPc ?? 0;
      const totalCost = makingCost + otherCost;
      const created = await FinishedProduct.create({
        designName: newFinishedProduct.designName,
        designCode:
          newFinishedProduct.designCode?.trim() ||
          `WO-${String(order._id).slice(-6).toUpperCase()}`,
        category: newFinishedProduct.category,
        size: newFinishedProduct.size,
        makingCostPerPc: makingCost,
        otherCostPerPc: otherCost,
        MRP: Math.round(totalCost * 4),
        wholesalePrice: Math.round(totalCost * 2.5),
        sellingPrice: Math.round(totalCost * 3),
        readyStock: totalToStock,
      });
      order.finishedProductId = created._id;
    } else if (finishedProductId && totalToStock > 0) {
      await FinishedProduct.findByIdAndUpdate(finishedProductId, {
        $inc: { readyStock: totalToStock },
      });
      order.finishedProductId = finishedProductId;
    }

    await order.save();

    // ── Credit full earnings (all pieces resolved, no deduction) ─────────────
    const totalEarnings = totalToStock * order.perPieceRate;
    if (totalEarnings > 0) {
      await Worker.findByIdAndUpdate(order.workerId, { $inc: { totalEarned: totalEarnings } });
    }

    // ── Also resolve ancestor orders in a half-work chain ────────────────────
    if (order.assignmentType === "half" && order.parentWorkOrderId) {
      let currentParentId = order.parentWorkOrderId;
      while (currentParentId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ancestor = await (WorkOrder as any).findById(currentParentId);
        if (!ancestor) break;

        if (ancestor.status === "Rejected") {
          ancestor.rejectedResolved = totalRejected;
          ancestor.status = "Completed";
          if (order.finishedProductId) ancestor.finishedProductId = order.finishedProductId;
          await ancestor.save();

          // Credit ancestor worker earnings
          const ancestorEarnings = totalToStock * ancestor.perPieceRate;
          if (ancestorEarnings > 0) {
            await Worker.findByIdAndUpdate(ancestor.workerId, { $inc: { totalEarned: ancestorEarnings } });
          }
        }

        currentParentId = ancestor.parentWorkOrderId ?? undefined;
      }
    }

    return NextResponse.json<ApiResponse>({ success: true, data: order.toJSON() });
  } catch (err) {
    console.error("[resolve-rejected]", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
