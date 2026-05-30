import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { RawMaterial } from "@/models/RawMaterial";
import { z } from "zod";
import type { ApiResponse } from "@/types";

// ─── Validation ──────────────────────────────────────────────────────────────

const patchSchema = z
  .object({
    /** Add stock to purchasedQty (e.g. received new delivery) */
    addPurchasedQty: z.number().min(0).optional(),
    /** Override rate per unit */
    ratePerUnit: z.number().min(0).optional(),
    /** Override low-stock threshold */
    lowStockThreshold: z.number().min(0).optional(),
    /** Override supplier name */
    supplier: z.string().optional(),
    /** Record date of this stock addition */
    lastPurchaseDate: z.string().optional(),
  })
  .refine(
    (d) =>
      d.addPurchasedQty !== undefined ||
      d.ratePerUnit !== undefined ||
      d.lowStockThreshold !== undefined ||
      d.supplier !== undefined ||
      d.lastPurchaseDate !== undefined,
    { message: "At least one field must be provided" }
  );

// ─── PATCH — update stock / rate ─────────────────────────────────────────────

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

    const { addPurchasedQty, ...directFields } = parsed.data;

    // Build update object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { $set: {} };
    if (directFields.ratePerUnit !== undefined)
      update.$set.ratePerUnit = directFields.ratePerUnit;
    if (directFields.lowStockThreshold !== undefined)
      update.$set.lowStockThreshold = directFields.lowStockThreshold;
    if (directFields.supplier !== undefined)
      update.$set.supplier = directFields.supplier;
    if (directFields.lastPurchaseDate !== undefined)
      update.$set.lastPurchaseDate = new Date(directFields.lastPurchaseDate);

    if (addPurchasedQty !== undefined && addPurchasedQty > 0) {
      update.$inc = { purchasedQty: addPurchasedQty };
      update.$set.lastPurchaseDate =
        directFields.lastPurchaseDate
          ? new Date(directFields.lastPurchaseDate)
          : new Date();
    }

    const doc = await RawMaterial.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: doc.toJSON(),
    });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE — soft delete ─────────────────────────────────────────────────────

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

    // Only owner can delete
    if (session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    await connectDB();

    const doc = await RawMaterial.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true } },
      { new: true }
    );

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
