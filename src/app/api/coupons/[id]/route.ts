import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Coupon } from "@/models/Coupon";
import { couponBaseSchema } from "@/types";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = couponBaseSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();

    const updateData = { ...parsed.data };
    if (updateData.assignedType === "general") {
      updateData.customerIds = [];
    }
    if (updateData.neverExpires !== undefined) {
      if (updateData.neverExpires) {
        updateData.startDate = null;
        updateData.endDate = null;
      } else {
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate) as any;
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate) as any;
      }
    }

    const updated = await Coupon.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true }
    ).populate("customerIds", "name mobileNumbers");

    if (!updated) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Coupon not found" }, { status: 404 });
    }
    return NextResponse.json<ApiResponse>({ success: true, data: updated.toJSON() });
  } catch (err: any) {
    console.error("Coupon PATCH error:", err);
    if (err.code === 11000) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Coupon code already exists" }, { status: 409 });
    }
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await connectDB();
    const deleted = await Coupon.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!deleted) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Coupon not found" }, { status: 404 });
    }
    return NextResponse.json<ApiResponse>({ success: true, message: "Coupon deleted successfully" });
  } catch (err) {
    console.error("Coupon DELETE error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
