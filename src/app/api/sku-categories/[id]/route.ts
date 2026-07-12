import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { softDeleteById, ACTIVE_FILTER } from "@/lib/softDelete";
import { SkuCategory } from "@/models/SkuCategory";
import { skuCategorySchema } from "@/types";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = skuCategorySchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();

    const updateSet: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) {
      updateSet.name = parsed.data.name.trim();
    }
    if (parsed.data.parentId !== undefined) {
      updateSet.parentId = parsed.data.parentId ? parsed.data.parentId : null;
    }
    if (parsed.data.isSizeFieldEnabled !== undefined) {
      updateSet.isSizeFieldEnabled = parsed.data.isSizeFieldEnabled;
    }
    if (parsed.data.isActive !== undefined) {
      updateSet.isActive = parsed.data.isActive;
    }

    // Check duplicate if name/parent is changing
    if (parsed.data.name !== undefined || parsed.data.parentId !== undefined) {
      const existingDoc = await SkuCategory.findById(id);
      if (!existingDoc) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Category not found" }, { status: 404 });
      }

      const targetName = parsed.data.name !== undefined ? parsed.data.name.trim() : existingDoc.name;
      const targetParent = parsed.data.parentId !== undefined ? (parsed.data.parentId ? parsed.data.parentId : null) : existingDoc.parentId;

      const duplicate = await SkuCategory.findOne({
        _id: { $ne: id },
        name: new RegExp(`^${targetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        parentId: targetParent,
        isDeleted: { $ne: true },
      });

      if (duplicate) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: `Category "${targetName}" already exists under this parent.` },
          { status: 409 }
        );
      }
    }

    const doc = await SkuCategory.findOneAndUpdate(
      { _id: id, ...ACTIVE_FILTER },
      { $set: updateSet },
      { new: true, runValidators: true }
    ).populate("parentId", "name");

    if (!doc) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: doc.toJSON() });
  } catch (err) {
    console.error("[PATCH /api/sku-categories/[id]]", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const doc = await softDeleteById(SkuCategory, id);
    if (!doc) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Category not found" }, { status: 404 });
    }

    // If it's a parent category, delete all its subcategories
    if (!doc.parentId) {
      await SkuCategory.updateMany(
        { parentId: doc._id, isDeleted: { $ne: true } },
        { $set: { isDeleted: true } }
      );
    }

    return NextResponse.json<ApiResponse>({ success: true, data: { message: "Deleted successfully" } });
  } catch (err) {
    console.error("[DELETE /api/sku-categories/[id]]", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
