import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { RawMaterialCategory } from "@/models/RawMaterialCategory";
import { rawMaterialCategorySchema } from "@/types";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const docs = await RawMaterialCategory.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
    return NextResponse.json<ApiResponse>({ success: true, data: docs.map((d) => d.toJSON()) });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = rawMaterialCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await RawMaterialCategory.findOne({
      name: new RegExp(`^${parsed.data.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      isDeleted: { $ne: true },
    });

    if (existing) {
      return NextResponse.json<ApiResponse>({ success: true, data: existing.toJSON() }, { status: 200 });
    }

    const doc = await RawMaterialCategory.create({
      name: parsed.data.name.trim(),
      isActive: parsed.data.isActive,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: doc.toJSON() }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
