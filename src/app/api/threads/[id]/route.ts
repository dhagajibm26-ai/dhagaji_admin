import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { softDeleteById } from "@/lib/softDelete";
import { ThreadsStock } from "@/models/ThreadsStock";
import { buildDbPurchaseEntry, weightedRate } from "@/lib/purchaseHistory";
import { z } from "zod";
import type { ApiResponse } from "@/types";

const patchSchema = z
  .object({
    threadCode: z.string().min(1).optional(),
    threadColour: z.string().min(1).optional(),
    threadColourHex: z.string().optional(),
    threadCompanyName: z.string().min(1).optional(),
    weightPerUnit: z.number().min(0).optional(),
    openingStock: z.number().min(0).optional(),
    stockAdd: z.number().min(0).optional(),
    netUsed: z.number().min(0).optional(),
    addNetUsed: z.number().min(0).optional(),
    addStockQty: z.number().min(0).optional(),
    totalPurchaseAmount: z.number().min(0).optional(),
    costPerUnit: z.number().min(0).optional(),
    hsnCode: z.string().optional().nullable(),
    gstPercentage: z.number().optional().nullable(),
    hsnCodes: z.array(z.string()).optional(),
  })
  .refine(
    (d) =>
      d.threadCode !== undefined ||
      d.threadColour !== undefined ||
      d.threadColourHex !== undefined ||
      d.threadCompanyName !== undefined ||
      d.weightPerUnit !== undefined ||
      d.openingStock !== undefined ||
      d.stockAdd !== undefined ||
      d.netUsed !== undefined ||
      d.addNetUsed !== undefined ||
      d.addStockQty !== undefined ||
      d.totalPurchaseAmount !== undefined ||
      d.costPerUnit !== undefined ||
      d.hsnCode !== undefined ||
      d.gstPercentage !== undefined ||
      d.hsnCodes !== undefined,
    { message: "At least one field must be provided" }
  );

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await ThreadsStock.findById(id);
    if (!existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Thread entry not found" },
        { status: 404 }
      );
    }

    const {
      threadCode,
      threadColour,
      threadColourHex,
      threadCompanyName,
      weightPerUnit,
      openingStock,
      stockAdd,
      netUsed,
      addNetUsed,
      addStockQty,
      totalPurchaseAmount,
      costPerUnit,
      hsnCode,
      gstPercentage,
      hsnCodes,
    } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { $set: {} };

    if (threadCode !== undefined) update.$set.threadCode = threadCode;
    if (threadColour !== undefined) update.$set.threadColour = threadColour;
    if (threadColourHex !== undefined) update.$set.threadColourHex = threadColourHex;
    if (threadCompanyName !== undefined) update.$set.threadCompanyName = threadCompanyName;
    if (weightPerUnit !== undefined) update.$set.weightPerUnit = weightPerUnit;
    if (openingStock !== undefined) update.$set.openingStock = openingStock;
    if (stockAdd !== undefined) update.$set.stockAdd = stockAdd;
    if (netUsed !== undefined) update.$set.netUsed = netUsed;
    
    if (hsnCode !== undefined) {
      update.$set.hsnCode = hsnCode ?? "";
      update.$set.hsnCodes = hsnCode ? [hsnCode] : [];
    } else if (hsnCodes !== undefined) {
      update.$set.hsnCodes = hsnCodes;
      update.$set.hsnCode = hsnCodes.length > 0 ? hsnCodes[0] : "";
    }
    if (gstPercentage !== undefined) {
      update.$set.gstPercentage = gstPercentage ?? 0;
    }

    if (addNetUsed !== undefined && addNetUsed > 0) {
      update.$inc = { ...(update.$inc ?? {}), netUsed: addNetUsed };
    }

    if (addStockQty !== undefined && addStockQty > 0) {
      const amount =
        totalPurchaseAmount !== undefined
          ? totalPurchaseAmount
          : costPerUnit !== undefined
            ? addStockQty * costPerUnit
            : addStockQty * existing.costPerUnit;

      const entry = buildDbPurchaseEntry(addStockQty, amount);
      const newRate = weightedRate(
        existing.stockAdd,
        existing.costPerUnit,
        addStockQty,
        entry.ratePerUnit
      );

      update.$inc = { ...(update.$inc ?? {}), stockAdd: addStockQty };
      update.$push = { purchaseHistory: entry };
      update.$set.costPerUnit = newRate;
    } else if (stockAdd !== undefined) {
      const oldQty = existing.stockAdd || 0;
      const diffGrams = stockAdd - oldQty;

      if (diffGrams > 0) {
        const newTotalAmount = totalPurchaseAmount !== undefined
          ? totalPurchaseAmount
          : Number((stockAdd * (costPerUnit ?? existing.costPerUnit)).toFixed(2));
        const oldTotalAmount = oldQty * existing.costPerUnit;
        const diffAmount = Math.max(0, newTotalAmount - oldTotalAmount);

        const entry = buildDbPurchaseEntry(diffGrams, diffAmount);
        update.$push = { purchaseHistory: entry };

        const newRate = stockAdd > 0 ? Number((newTotalAmount / stockAdd).toFixed(4)) : 0;
        update.$set.costPerUnit = newRate;
      } else if (diffGrams < 0) {
        const amount = totalPurchaseAmount !== undefined
          ? totalPurchaseAmount
          : Number((stockAdd * (costPerUnit ?? existing.costPerUnit)).toFixed(2));
        const entry = buildDbPurchaseEntry(stockAdd, amount);
        update.$set.purchaseHistory = [entry];

        if (costPerUnit !== undefined) {
          update.$set.costPerUnit = costPerUnit;
        } else {
          const newRate = stockAdd > 0 ? Number((amount / stockAdd).toFixed(4)) : 0;
          update.$set.costPerUnit = newRate;
        }
      } else {
        if (costPerUnit !== undefined || totalPurchaseAmount !== undefined) {
          const amount = totalPurchaseAmount !== undefined
            ? totalPurchaseAmount
            : Number((stockAdd * (costPerUnit ?? existing.costPerUnit)).toFixed(2));
          const newRate = stockAdd > 0 ? Number((amount / stockAdd).toFixed(4)) : 0;
          update.$set.costPerUnit = newRate;
        }
      }
    } else if (costPerUnit !== undefined && addStockQty === undefined) {
      update.$set.costPerUnit = costPerUnit;
    }

    if (Object.keys(update.$set).length === 0) delete update.$set;

    if (Object.keys(update).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No valid update fields" },
        { status: 400 }
      );
    }

    const doc = await ThreadsStock.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: doc!.toJSON() });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectDB();

    const doc = await softDeleteById(ThreadsStock, id);
    if (!doc) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Thread entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: "Deleted successfully" },
    });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
