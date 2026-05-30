import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { FinishedProduct } from "@/models/FinishedProduct";
import type { ApiResponse } from "@/types";

const OWNER_ONLY_FIELDS = [
  "makingCostPerPc",
  "otherCostPerPc",
  "MRP",
  "wholesalePrice",
  "totalCost",
  "profitPerPc",
  "totalRevenue",
] as const;

function stripCostFields(product: Record<string, unknown>) {
  const result = { ...product };
  for (const f of OWNER_ONLY_FIELDS) delete result[f];
  return result;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ barcodeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { barcodeId } = await params;
    await connectDB();
    const product = await FinishedProduct.findOne({ barcodeId });
    if (!product) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Product not found" }, { status: 404 });
    }
    const isOwner = session.user.role === "owner";
    const json = product.toJSON() as unknown as Record<string, unknown>;
    return NextResponse.json<ApiResponse>({
      success: true,
      data: isOwner ? json : stripCostFields(json),
    });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
