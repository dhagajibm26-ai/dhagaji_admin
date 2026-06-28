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
      rawMaterialsReturned,
      threadsReturned,
      glueReturned,
      cutterReturned,
      otherReturned,
      finishedPieces,
      qualityOK,
      finishedProductId,
      newFinishedProduct,
      perPieceRate,
      damageNotes,
      chainReturns,
    } = parsed.data;

    order.banglesReturned = banglesReturned as typeof order.banglesReturned;
    order.rawMaterialsReturned = rawMaterialsReturned as typeof order.rawMaterialsReturned;
    order.threadsReturned = threadsReturned;
    order.glueReturned = glueReturned;
    order.cutterReturned = cutterReturned;
    order.otherReturned = otherReturned as typeof order.otherReturned;
    order.finishedPieces = finishedPieces;
    order.qualityOK = qualityOK;
    if (perPieceRate !== undefined) order.perPieceRate = perPieceRate;
    if (damageNotes !== undefined) order.damageNotes = damageNotes;
    order.status = "Returned";

    // ── Restore returned stock back to inventory ──────────────────────────────

    // Bangles returned → reduce netUsed on the exact stock issued.
    // Prefer the explicit stock id; fall back to matching by cutType.
    if (banglesReturned.length > 0) {
      const banglesOps = banglesReturned
        .map((ret) => {
          const stockId =
            ret.banglesStockId ??
            order.banglesGiven.find((g) => g.cutType === ret.cutType)
              ?.banglesStockId;
          if (!stockId) return null;
          return {
            updateOne: {
              filter: { _id: stockId },
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

    // Raw materials returned.
    // Preferred path: per-line returns mapped to the exact RawMaterial issued.
    if (rawMaterialsReturned.length > 0) {
      const givenById = new Map(
        order.rawMaterialsGiven.map((r) => [String(r.rawMaterialId), r.qty])
      );
      const rawOps = rawMaterialsReturned
        .filter((r) => r.qty > 0)
        .map((r) => {
          const maxQty = givenById.get(String(r.rawMaterialId)) ?? r.qty;
          const qty = Math.min(r.qty, maxQty);
          return {
            updateOne: {
              filter: { _id: r.rawMaterialId },
              update: { $inc: { usedQty: -qty } },
            },
          };
        });
      if (rawOps.length > 0) await RawMaterial.bulkWrite(rawOps);
    } else {
      // Legacy fallback: aggregate glue / cutter totals split proportionally.
      const restockByKind = async (kind: string, returnedQty: number) => {
        if (returnedQty <= 0 || !order.rawMaterialsGiven?.length) return;
        const items = order.rawMaterialsGiven.filter((r) => r.kind === kind);
        const totalGiven = items.reduce((s, r) => s + r.qty, 0);
        if (items.length === 0 || totalGiven <= 0) return;
        const ops = items.map((r) => {
          const share = Math.min(
            r.qty,
            Math.round((r.qty / totalGiven) * returnedQty * 100) / 100
          );
          return {
            updateOne: {
              filter: { _id: r.rawMaterialId },
              update: { $inc: { usedQty: -share } },
            },
          };
        });
        await RawMaterial.bulkWrite(ops);
      };
      await restockByKind("glue", glueReturned);
      await restockByKind("cutter", cutterReturned);
    }

    // ── Update Worker.totalEarned ─────────────────────────────────────────────
    const okEarnings = order.qualityOK * order.perPieceRate;
    const rejected = Math.max(0, order.finishedPieces - order.qualityOK);
    const rejectionDeduction = rejected * order.perPieceRate * 0.5;
    const netAmountDue = Math.max(0, okEarnings - rejectionDeduction);
    if (netAmountDue > 0) {
      await Worker.findByIdAndUpdate(order.workerId, { $inc: { totalEarned: netAmountDue } });
    }

    // ── Finished stock integration ────────────────────────────────────────────
    // Either create a brand-new finished product from this return, or add the
    // OK pieces to an existing one. The link is persisted on the work order.
    let resolvedFinishedProductId: typeof order.finishedProductId | undefined;

    if (qualityOK > 0 && newFinishedProduct) {
      let makingCost = newFinishedProduct.makingCostPerPc;
      if (makingCost === undefined) {
        let sumRates = order.perPieceRate;
        if (order.assignmentType === "half" && order.parentWorkOrderId) {
          let currentParentId = order.parentWorkOrderId;
          while (currentParentId) {
            const parent = await WorkOrder.findById(currentParentId);
            if (!parent) break;
            sumRates += parent.perPieceRate;
            currentParentId = parent.parentWorkOrderId as any;
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
        readyStock: qualityOK,
      });
      resolvedFinishedProductId = created._id as typeof order.finishedProductId;
      order.finishedProductId = resolvedFinishedProductId;
    } else if (finishedProductId && qualityOK > 0) {
      await FinishedProduct.findByIdAndUpdate(finishedProductId, {
        $inc: { readyStock: qualityOK },
      });
      resolvedFinishedProductId = finishedProductId as unknown as typeof order.finishedProductId;
      order.finishedProductId = resolvedFinishedProductId;
    }

    await order.save();

    // ── Process ancestor legs in the half-work chain ──────────────────────────
    // Walk up the parentWorkOrderId chain, closing each order as "Completed",
    // copying finished/quality OK counts, crediting worker earnings, and restoring
    // stock for any returned materials specified in chainReturns.
    if (order.assignmentType === "half" && order.allowReturn === true && order.parentWorkOrderId) {
      let currentParentId: typeof order.parentWorkOrderId | undefined = order.parentWorkOrderId;
      const chainReturnsMap = new Map((chainReturns ?? []).map((cr) => [String(cr.orderId), cr]));

      while (currentParentId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ancestorOrder = await WorkOrder.findById(currentParentId) as any;
        if (!ancestorOrder) break;

        // 1. Copy finished pieces and quality counts
        ancestorOrder.finishedPieces = finishedPieces;
        ancestorOrder.qualityOK = qualityOK;
        ancestorOrder.status = "Completed";

        if (resolvedFinishedProductId) {
          ancestorOrder.finishedProductId = resolvedFinishedProductId;
        }

        // 2. Process stock returns for this ancestor if provided in chainReturns
        const cr = chainReturnsMap.get(String(ancestorOrder._id));
        if (cr) {
          if (cr.banglesReturned && cr.banglesReturned.length > 0) {
            ancestorOrder.banglesReturned = cr.banglesReturned;
            const banglesOps = cr.banglesReturned
              .map((ret: { banglesStockId?: string; cutType: string; pieces: number }) => {
                const stockId =
                  ret.banglesStockId ??
                  ancestorOrder.banglesGiven?.find((g: { cutType: string; banglesStockId: string }) => g.cutType === ret.cutType)?.banglesStockId;
                if (!stockId || !ret.pieces) return null;
                return { updateOne: { filter: { _id: stockId }, update: { $inc: { netUsed: -ret.pieces } } } };
              })
              .filter((op): op is NonNullable<typeof op> => op !== null);
            if (banglesOps.length > 0) await BanglesStock.bulkWrite(banglesOps);
          }

          if (cr.threadsReturned > 0 && ancestorOrder.threadItemsGiven?.length > 0) {
            ancestorOrder.threadsReturned = cr.threadsReturned;
            const totalGiven = ancestorOrder.threadItemsGiven.reduce((s: number, t: { grams: number }) => s + t.grams, 0);
            const threadOps = ancestorOrder.threadItemsGiven
              .filter((t: { grams: number }) => t.grams > 0 && totalGiven > 0)
              .map((t: { threadStockId: string; grams: number }) => {
                const share = Math.min(t.grams, Math.round((t.grams / totalGiven) * cr.threadsReturned * 100) / 100);
                return { updateOne: { filter: { _id: t.threadStockId }, update: { $inc: { netUsed: -share } } } };
              });
            if (threadOps.length > 0) await ThreadsStock.bulkWrite(threadOps);
          }

          if (cr.rawMaterialsReturned && cr.rawMaterialsReturned.length > 0) {
            ancestorOrder.rawMaterialsReturned = cr.rawMaterialsReturned;
            const rawOps = cr.rawMaterialsReturned
              .filter((r: { qty: number }) => r.qty > 0)
              .map((r: { rawMaterialId: string; qty: number }) => ({
                updateOne: { filter: { _id: r.rawMaterialId }, update: { $inc: { usedQty: -r.qty } } },
              }));
            if (rawOps.length > 0) await RawMaterial.bulkWrite(rawOps);
          }
        }

        // 3. Update ancestor worker's totalEarned
        const ancestorOkEarnings = qualityOK * ancestorOrder.perPieceRate;
        const ancestorRejected = Math.max(0, finishedPieces - qualityOK);
        const ancestorRejectionDeduction = ancestorRejected * ancestorOrder.perPieceRate * 0.5;
        const ancestorNetAmountDue = Math.max(0, ancestorOkEarnings - ancestorRejectionDeduction);
        if (ancestorNetAmountDue > 0) {
          await Worker.findByIdAndUpdate(ancestorOrder.workerId, { $inc: { totalEarned: ancestorNetAmountDue } });
        }

        await ancestorOrder.save();

        // Move to the next parent in the chain
        currentParentId = ancestorOrder.parentWorkOrderId ?? undefined;
      }
    }



    return NextResponse.json<ApiResponse>({ success: true, data: order.toJSON() });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
