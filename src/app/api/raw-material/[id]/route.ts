import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { softDeleteById } from "@/lib/softDelete";
import { RawMaterial } from "@/models/RawMaterial";
import { buildPurchaseEntry, buildDbPurchaseEntry, weightedRate } from "@/lib/purchaseHistory";
import { z } from "zod";
import type { ApiResponse } from "@/types";

const patchSchema = z
  .object({
    itemName: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    colorType: z.string().optional(),
    unit: z.enum(["gram", "pcs", "tube", "box", "meter"]).optional(),
    unitsPerPack: z.number().min(1).optional(),
    openingStock: z.number().min(0).optional(),
    purchasedQty: z.number().min(0).optional(),
    usedQty: z.number().min(0).optional(),
    addPurchasedQty: z.number().min(0).optional(),
    totalPurchaseAmount: z.number().min(0).optional(),
    ratePerUnit: z.number().min(0).optional(),
    lowStockThreshold: z.number().min(0).optional(),
    supplier: z.string().optional(),
    lastPurchaseDate: z.string().optional(),
  })
  .refine(
    (d) =>
      d.itemName !== undefined ||
      d.category !== undefined ||
      d.colorType !== undefined ||
      d.unit !== undefined ||
      d.unitsPerPack !== undefined ||
      d.openingStock !== undefined ||
      d.purchasedQty !== undefined ||
      d.usedQty !== undefined ||
      d.addPurchasedQty !== undefined ||
      d.totalPurchaseAmount !== undefined ||
      d.ratePerUnit !== undefined ||
      d.lowStockThreshold !== undefined ||
      d.supplier !== undefined ||
      d.lastPurchaseDate !== undefined,
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
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Validation error",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await RawMaterial.findById(id);
    if (!existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    const { addPurchasedQty, totalPurchaseAmount, ratePerUnit, ...directFields } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { $set: {} };

    if (directFields.itemName !== undefined) update.$set.itemName = directFields.itemName;
    if (directFields.category !== undefined) update.$set.category = directFields.category;
    if (directFields.colorType !== undefined) update.$set.colorType = directFields.colorType;
    if (directFields.unit !== undefined) update.$set.unit = directFields.unit;
    if (directFields.unitsPerPack !== undefined) update.$set.unitsPerPack = directFields.unitsPerPack;
    if (directFields.openingStock !== undefined) update.$set.openingStock = directFields.openingStock;
    if (directFields.purchasedQty !== undefined) update.$set.purchasedQty = directFields.purchasedQty;
    if (directFields.usedQty !== undefined) update.$set.usedQty = directFields.usedQty;
    if (directFields.lowStockThreshold !== undefined)
      update.$set.lowStockThreshold = directFields.lowStockThreshold;
    if (directFields.supplier !== undefined) update.$set.supplier = directFields.supplier;

    if (addPurchasedQty !== undefined && addPurchasedQty > 0) {
      const amount =
        totalPurchaseAmount !== undefined
          ? totalPurchaseAmount
          : ratePerUnit !== undefined
            ? addPurchasedQty * ratePerUnit
            : addPurchasedQty * existing.ratePerUnit;

      const entry = buildDbPurchaseEntry(addPurchasedQty, amount);
      const newRate = weightedRate(
        existing.purchasedQty,
        existing.ratePerUnit,
        addPurchasedQty,
        entry.ratePerUnit
      );

      update.$inc = { purchasedQty: addPurchasedQty };
      update.$push = { purchaseHistory: entry };
      update.$set.ratePerUnit = newRate;
      update.$set.lastPurchaseDate = directFields.lastPurchaseDate
        ? new Date(directFields.lastPurchaseDate)
        : new Date();
    } else if (directFields.purchasedQty !== undefined) {
      const amount = totalPurchaseAmount !== undefined 
        ? totalPurchaseAmount 
        : directFields.purchasedQty * (ratePerUnit ?? existing.ratePerUnit);
      const entry = buildDbPurchaseEntry(directFields.purchasedQty, amount);
      update.$set.purchaseHistory = [entry];
      
      if (ratePerUnit !== undefined) {
        update.$set.ratePerUnit = ratePerUnit;
      }
    } else if (ratePerUnit !== undefined && addPurchasedQty === undefined) {
      update.$set.ratePerUnit = ratePerUnit;
    }

    if (directFields.lastPurchaseDate !== undefined && !update.$set.lastPurchaseDate) {
      update.$set.lastPurchaseDate = new Date(directFields.lastPurchaseDate);
    }

    if (Object.keys(update.$set).length === 0) delete update.$set;

    const doc = await RawMaterial.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: doc!.toJSON(),
    });
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

    const doc = await softDeleteById(RawMaterial, id);
    if (!doc) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Material not found" },
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
