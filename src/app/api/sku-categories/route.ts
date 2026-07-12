import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { SkuCategory } from "@/models/SkuCategory";
import { skuCategorySchema } from "@/types";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const docs = await SkuCategory.find({ isDeleted: { $ne: true } })
      .populate("parentId", "name")
      .sort({ name: 1 });
    return NextResponse.json<ApiResponse>({ success: true, data: docs.map((d) => d.toJSON()) });
  } catch (err) {
    console.error("[GET /api/sku-categories]", err);
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
    const parsed = skuCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();

    const parentId = parsed.data.parentId ? parsed.data.parentId : null;

    // Check duplicate under same parent (case-insensitive)
    const existing = await SkuCategory.findOne({
      name: new RegExp(`^${parsed.data.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      parentId,
      isDeleted: { $ne: true },
    });

    if (existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Category "${parsed.data.name}" already exists under this parent.` },
        { status: 409 }
      );
    }

    const doc = await SkuCategory.create({
      name: parsed.data.name.trim(),
      parentId,
      isSizeFieldEnabled: parsed.data.isSizeFieldEnabled,
      isActive: parsed.data.isActive,
    });

    const populated = await SkuCategory.findById(doc._id).populate("parentId", "name");

    return NextResponse.json<ApiResponse>({ success: true, data: populated!.toJSON() }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/sku-categories]", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
