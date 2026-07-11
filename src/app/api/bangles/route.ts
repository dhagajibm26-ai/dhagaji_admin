import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BanglesStock } from "@/models/BanglesStock";
import { buildDbPurchaseEntry } from "@/lib/purchaseHistory";
import { banglesStockSchema } from "@/types";
import type { ApiResponse } from "@/types";

const PETA_MAP = { C1: 12, C2: 24, C4: 48, C6: 72 } as const;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const docs = await BanglesStock.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    return NextResponse.json<ApiResponse>({ success: true, data: docs.map((d) => d.toJSON()) });
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
    const parsed = banglesStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    const { quantityAdd, cutType, pricePerPiece, totalPurchaseAmount, ...rest } = parsed.data;
    const pieces = quantityAdd * PETA_MAP[cutType];
    const finalAmount = totalPurchaseAmount ?? Number((pieces * pricePerPiece).toFixed(2));
    const item = await BanglesStock.create({
      ...rest,
      cutType,
      quantityAdd,
      pricePerPiece,
      totalPurchaseAmount: finalAmount,
      purchaseHistory: pieces > 0 ? [buildDbPurchaseEntry(pieces, finalAmount)] : [],
    });
    return NextResponse.json<ApiResponse>({ success: true, data: item.toJSON() }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
