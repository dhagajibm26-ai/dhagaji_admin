import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Coupon } from "@/models/Coupon";
import { couponSchema } from "@/types";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const items = await Coupon.find({ isDeleted: { $ne: true } })
      .populate("customerIds", "name mobileNumbers")
      .sort({ createdAt: -1 });
    return NextResponse.json<ApiResponse>({ success: true, data: items.map((c) => c.toJSON()) });
  } catch (err) {
    console.error("Coupons GET error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    
    // Normalize customerIds and dates
    const data = {
      ...parsed.data,
      customerIds: parsed.data.assignedType === "general" ? [] : parsed.data.customerIds || [],
      startDate: parsed.data.neverExpires ? null : parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.neverExpires ? null : parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    };

    const item = await Coupon.create(data);
    const populated = await item.populate("customerIds", "name mobileNumbers");
    
    return NextResponse.json<ApiResponse>({ success: true, data: populated.toJSON() }, { status: 201 });
  } catch (err: any) {
    console.error("Coupons POST error:", err);
    if (err.code === 11000) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Coupon code already exists" }, { status: 409 });
    }
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
