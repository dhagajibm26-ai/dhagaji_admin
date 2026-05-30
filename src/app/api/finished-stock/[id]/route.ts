import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { FinishedProduct } from "@/models/FinishedProduct";
import { finishedProductSchema } from "@/types";
import type { ApiResponse } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = finishedProductSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    const item = await FinishedProduct.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true }
    );
    if (!item) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json<ApiResponse>({ success: true, data: item.toJSON() });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
