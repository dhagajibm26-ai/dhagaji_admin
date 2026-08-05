import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { softDeleteById, ACTIVE_FILTER } from "@/lib/softDelete";
import { HsnCode } from "@/models/HsnCode";
import { hsnCodeSchema } from "@/types";
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
    const parsed = hsnCodeSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();

    const updateFields: Record<string, any> = {};
    if (parsed.data.code !== undefined) updateFields.code = parsed.data.code.trim();
    if (parsed.data.label !== undefined) updateFields.label = parsed.data.label.trim() || undefined;
    if (parsed.data.scope !== undefined) updateFields.scope = parsed.data.scope || undefined;
    if (parsed.data.gstPercentage !== undefined) updateFields.gstPercentage = parsed.data.gstPercentage;
    if (parsed.data.isActive !== undefined) updateFields.isActive = parsed.data.isActive;

    const doc = await HsnCode.findOneAndUpdate(
      { _id: id, ...ACTIVE_FILTER },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!doc) {
      return NextResponse.json<ApiResponse>({ success: false, error: "HSN Code not found" }, { status: 404 });
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

    const doc = await softDeleteById(HsnCode, id);

    if (!doc) {
      return NextResponse.json<ApiResponse>({ success: false, error: "HSN Code not found" }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: null });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
