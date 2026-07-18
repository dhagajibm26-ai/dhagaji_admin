import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { customerSchema } from "@/types";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const items = await Customer.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
    return NextResponse.json<ApiResponse>({ success: true, data: items.map((c) => c.toJSON()) });
  } catch (err) {
    console.error("Customers GET error:", err);
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
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    const item = await Customer.create(parsed.data);
    return NextResponse.json<ApiResponse>({ success: true, data: item.toJSON() }, { status: 201 });
  } catch (err) {
    console.error("Customers POST error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
