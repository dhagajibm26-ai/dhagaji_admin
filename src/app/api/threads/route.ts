import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ThreadsStock } from "@/models/ThreadsStock";
import { threadsStockSchema } from "@/types";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const docs = await ThreadsStock.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    return NextResponse.json<ApiResponse>({ success: true, data: docs.map((d) => d.toJSON()) });
  } catch (err) {
    console.error("[GET /api/threads]", err);
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
    const parsed = threadsStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    // Drop old unique index if it exists (one-time migration safe to call repeatedly)
    try {
      await ThreadsStock.collection.dropIndex("threadCode_1");
    } catch {
      // Index doesn't exist or already dropped — ignore
    }
    const item = await ThreadsStock.create(parsed.data);
    return NextResponse.json<ApiResponse>({ success: true, data: item.toJSON() }, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/threads]", err);
    // MongoDB duplicate key
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "This Thread Code already exists. Please use a different code." },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
