import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { softDeleteById, ACTIVE_FILTER } from "@/lib/softDelete";
import { BangleSize } from "@/models/BangleSize";
import { bangleSizeSchema } from "@/types";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = bangleSizeSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();

    const setData: Record<string, unknown> = {
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    };

    if (parsed.data.name !== undefined) {
      const trimmedName = parsed.data.name.trim();
      setData.name = trimmedName;
      setData.normalizedName = normalizeName(trimmedName);
    }

    const doc = await BangleSize.findOneAndUpdate(
      { _id: id, ...ACTIVE_FILTER },
      { $set: setData },
      { new: true, runValidators: true }
    );

    if (!doc) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Bangle size not found" }, { status: 404 });
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

    const doc = await softDeleteById(BangleSize, id);

    if (!doc) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Bangle size not found" }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: null });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
