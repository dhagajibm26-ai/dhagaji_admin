import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BanglesStock } from "@/models/BanglesStock";
import { z } from "zod";
import type { ApiResponse } from "@/types";

// ─── Validation ──────────────────────────────────────────────────────────────

const patchSchema = z
  .object({
    /** Add to netUsed (pieces given to worker) */
    addNetUsed: z.number().min(0).optional(),
    /** Add more stock (increment quantityAdd) */
    addQuantity: z.number().min(0).optional(),
    /** Override price per piece */
    pricePerPiece: z.number().min(0).optional(),
  })
  .refine(
    (d) =>
      d.addNetUsed !== undefined ||
      d.addQuantity !== undefined ||
      d.pricePerPiece !== undefined,
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

    const { addNetUsed, addQuantity, pricePerPiece } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {};

    if (addNetUsed !== undefined && addNetUsed > 0) {
      update.$inc = { ...(update.$inc ?? {}), netUsed: addNetUsed };
    }
    if (addQuantity !== undefined && addQuantity > 0) {
      update.$inc = { ...(update.$inc ?? {}), quantityAdd: addQuantity };
    }
    if (pricePerPiece !== undefined) {
      update.$set = { ...(update.$set ?? {}), pricePerPiece };
    }

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

    if (!doc) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Bangles entry not found" },
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

    const doc = await BanglesStock.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true } },
      { new: true }
    );

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
