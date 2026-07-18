import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { softDeleteById } from "@/lib/softDelete";
import { BanglesStock } from "@/models/BanglesStock";
import { buildDbPurchaseEntry, weightedRate } from "@/lib/purchaseHistory";
import { z } from "zod";
import type { ApiResponse } from "@/types";

const PETA_MAP = { C1: 12, C2: 24, C4: 48, C6: 72 } as const;

const patchSchema = z
  .object({
    size: z.string().min(1).optional(),
    cutType: z.enum(["C1", "C2", "C4", "C6"]).optional(),
    quantityAdd: z.number().min(0).optional(),
    netUsed: z.number().min(0).optional(),
    addNetUsed: z.number().min(0).optional(),
    addQuantity: z.number().min(0).optional(),
    totalPurchaseAmount: z.number().min(0).optional(),
    pricePerPiece: z.number().min(0).optional(),
    hsnCodes: z.array(z.string()).optional(),
  })
  .refine(
    (d) =>
      d.size !== undefined ||
      d.cutType !== undefined ||
      d.quantityAdd !== undefined ||
      d.netUsed !== undefined ||
      d.addNetUsed !== undefined ||
      d.addQuantity !== undefined ||
      d.totalPurchaseAmount !== undefined ||
      d.pricePerPiece !== undefined ||
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

    const existing = await BanglesStock.findById(id);
    if (!existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Bangles entry not found" },
        { status: 404 }
      );
    }

    const {
      size,
      cutType,
      quantityAdd,
      netUsed,
      addNetUsed,
      addQuantity,
      totalPurchaseAmount,
      pricePerPiece,
      hsnCodes,
    } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { $set: {} };

    if (size !== undefined) update.$set.size = size;
    if (cutType !== undefined) update.$set.cutType = cutType;
    if (quantityAdd !== undefined) update.$set.quantityAdd = quantityAdd;
    if (netUsed !== undefined) update.$set.netUsed = netUsed;
    if (totalPurchaseAmount !== undefined) update.$set.totalPurchaseAmount = totalPurchaseAmount;
    if (hsnCodes !== undefined) update.$set.hsnCodes = hsnCodes;

    if (addNetUsed !== undefined && addNetUsed > 0) {
      update.$inc = { ...(update.$inc ?? {}), netUsed: addNetUsed };
    }

    if (addQuantity !== undefined && addQuantity > 0) {
      const effectiveCut = cutType ?? existing.cutType;
      const peta = PETA_MAP[effectiveCut];
      const addPieces = addQuantity * peta;
      const amount =
        totalPurchaseAmount !== undefined
          ? totalPurchaseAmount
          : pricePerPiece !== undefined
            ? addPieces * pricePerPiece
            : addPieces * existing.pricePerPiece;

      const entry = buildDbPurchaseEntry(addPieces, amount);
      const existingPieces = existing.quantityAdd * PETA_MAP[existing.cutType];
      const newRate = weightedRate(
        existingPieces,
        existing.pricePerPiece,
        addPieces,
        entry.ratePerUnit
      );

      update.$inc = { ...(update.$inc ?? {}), quantityAdd: addQuantity };
      update.$push = { purchaseHistory: entry };
      update.$set.pricePerPiece = newRate;
    } else if (quantityAdd !== undefined) {
      const oldQty = existing.quantityAdd || 0;
      const effectiveCut = cutType ?? existing.cutType;
      const peta = PETA_MAP[effectiveCut];
      
      const newPieces = quantityAdd * peta;
      const oldPieces = oldQty * PETA_MAP[existing.cutType];
      const diffPieces = newPieces - oldPieces;

      if (diffPieces > 0) {
        const newTotalAmount = totalPurchaseAmount !== undefined
          ? totalPurchaseAmount
          : Number((newPieces * (pricePerPiece ?? existing.pricePerPiece)).toFixed(2));
        const oldTotalAmount = oldPieces * existing.pricePerPiece;
        const diffAmount = Math.max(0, newTotalAmount - oldTotalAmount);

        const entry = buildDbPurchaseEntry(diffPieces, diffAmount);
        update.$push = { purchaseHistory: entry };

        const newRate = newPieces > 0 ? Number((newTotalAmount / newPieces).toFixed(4)) : 0;
        update.$set.pricePerPiece = newRate;
        update.$set.totalPurchaseAmount = newTotalAmount;
      } else if (diffPieces < 0) {
        const amount = totalPurchaseAmount !== undefined
          ? totalPurchaseAmount
          : Number((newPieces * (pricePerPiece ?? existing.pricePerPiece)).toFixed(2));
        const entry = buildDbPurchaseEntry(newPieces, amount);
        update.$set.purchaseHistory = [entry];
        update.$set.totalPurchaseAmount = amount;

        if (pricePerPiece !== undefined) {
          update.$set.pricePerPiece = pricePerPiece;
        } else {
          const newRate = newPieces > 0 ? Number((amount / newPieces).toFixed(4)) : 0;
          update.$set.pricePerPiece = newRate;
        }
      } else {
        if (pricePerPiece !== undefined || totalPurchaseAmount !== undefined) {
          const amount = totalPurchaseAmount !== undefined
            ? totalPurchaseAmount
            : Number((newPieces * (pricePerPiece ?? existing.pricePerPiece)).toFixed(2));
          update.$set.totalPurchaseAmount = amount;
          const newRate = newPieces > 0 ? Number((amount / newPieces).toFixed(4)) : 0;
          update.$set.pricePerPiece = newRate;
        }
      }
    } else if (pricePerPiece !== undefined && addQuantity === undefined) {
      update.$set.pricePerPiece = pricePerPiece;
      if (totalPurchaseAmount === undefined) {
        const effectiveCut = cutType ?? existing.cutType;
        const peta = PETA_MAP[effectiveCut];
        const pieces = existing.quantityAdd * peta;
        update.$set.totalPurchaseAmount = Number((pieces * pricePerPiece).toFixed(2));
      }
    }

    if (Object.keys(update.$set).length === 0) delete update.$set;

    if (Object.keys(update).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No valid update fields" },
        { status: 400 }
      );
    }

    const doc = await BanglesStock.findByIdAndUpdate(id, update, {
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

    const doc = await softDeleteById(BanglesStock, id);
    if (!doc) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Bangles entry not found" },
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
