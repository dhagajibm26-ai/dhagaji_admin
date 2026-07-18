import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { customerSchema } from "@/types";
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
    const { id } = await params;
    const body = await request.json();
    const parsed = customerSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    const updated = await Customer.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: parsed.data },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json<ApiResponse>({ success: true, data: updated.toJSON() });
  } catch (err) {
    console.error("Customer PATCH error:", err);
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
    const { id } = await params;
    await connectDB();
    const deleted = await Customer.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!deleted) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json<ApiResponse>({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    console.error("Customer DELETE error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
