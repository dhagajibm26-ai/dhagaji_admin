import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { FinishedProduct } from "@/models/FinishedProduct";
import { finishedProductSchema } from "@/types";
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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const isOwner = session.user.role === "owner";
    await connectDB();
    const items = await FinishedProduct.find().sort({ createdAt: -1 });
    const data = items.map((p) => {
      const json = p.toJSON() as unknown as Record<string, unknown>;
      return isOwner ? json : stripCostFields(json);
    });
    return NextResponse.json<ApiResponse>({ success: true, data });
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
    const parsed = finishedProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    const item = await FinishedProduct.create(parsed.data);
    return NextResponse.json<ApiResponse>({ success: true, data: item.toJSON() }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
