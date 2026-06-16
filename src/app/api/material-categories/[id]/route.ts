import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { softDeleteById, ACTIVE_FILTER } from "@/lib/softDelete";
import { RawMaterialCategory } from "@/models/RawMaterialCategory";
import { rawMaterialCategorySchema } from "@/types";
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
    const parsed = rawMaterialCategorySchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();

    const doc = await RawMaterialCategory.findOneAndUpdate(
      { _id: id, ...ACTIVE_FILTER },
      {
        $set: {
          ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        },
      },
      { new: true, runValidators: true }
    );

    if (!doc) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: doc.toJSON() });
  } catch {
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

    const doc = await softDeleteById(RawMaterialCategory, id);

    if (!doc) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: null });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
