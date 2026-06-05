import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ThreadsStock } from "@/models/ThreadsStock";
import { z } from "zod";
import type { ApiResponse } from "@/types";

// ─── Validation ──────────────────────────────────────────────────────────────

const patchSchema = z
  .object({
    threadCode: z.string().min(1).optional(),
    threadColour: z.string().min(1).optional(),
    threadCompanyName: z.string().min(1).optional(),
    weightPerUnit: z.number().min(0).optional(),
    openingStock: z.number().min(0).optional(),
    stockAdd: z.number().min(0).optional(),
    netUsed: z.number().min(0).optional(),
    /** Deduct from stock (given to worker) */
    addNetUsed: z.number().min(0).optional(),
    /** Add new stock (grams) */
    addStockQty: z.number().min(0).optional(),
    /** Override cost per unit */
    costPerUnit: z.number().min(0).optional(),
  })
  .refine(
    (d) =>
      d.threadCode !== undefined ||
      d.threadColour !== undefined ||
      d.threadCompanyName !== undefined ||
      d.weightPerUnit !== undefined ||
      d.openingStock !== undefined ||
      d.stockAdd !== undefined ||
      d.netUsed !== undefined ||
      d.addNetUsed !== undefined ||
      d.addStockQty !== undefined ||
      d.costPerUnit !== undefined,
    { message: "At least one field must be provided" }
  );

// ─── PATCH ───────────────────────────────────────────────────────────────────

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

    const {
      threadCode,
      threadColour,
      threadCompanyName,
      weightPerUnit,
      openingStock,
      stockAdd,
      netUsed,
      addNetUsed,
      addStockQty,
      costPerUnit,
    } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {};

    if (addNetUsed !== undefined && addNetUsed > 0) {
      update.$inc = { ...(update.$inc ?? {}), netUsed: addNetUsed };
    }
    if (addStockQty !== undefined && addStockQty > 0) {
      update.$inc = { ...(update.$inc ?? {}), stockAdd: addStockQty };
    }

    if (threadCode !== undefined) {
      update.$set = { ...(update.$set ?? {}), threadCode };
    }
    if (threadColour !== undefined) {
      update.$set = { ...(update.$set ?? {}), threadColour };
    }
    if (threadCompanyName !== undefined) {
      update.$set = { ...(update.$set ?? {}), threadCompanyName };
    }
    if (weightPerUnit !== undefined) {
      update.$set = { ...(update.$set ?? {}), weightPerUnit };
    }
    if (openingStock !== undefined) {
      update.$set = { ...(update.$set ?? {}), openingStock };
    }
    if (stockAdd !== undefined) {
      update.$set = { ...(update.$set ?? {}), stockAdd };
    }
    if (netUsed !== undefined) {
      update.$set = { ...(update.$set ?? {}), netUsed };
    }
    if (costPerUnit !== undefined) {
      update.$set = { ...(update.$set ?? {}), costPerUnit };
    }

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

    if (!doc) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Thread entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({ success: true, data: doc.toJSON() });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE (soft) ───────────────────────────────────────────────────────────

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

    const doc = await ThreadsStock.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true } },
      { new: true }
    );

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
