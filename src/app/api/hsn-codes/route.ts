import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { HsnCode } from "@/models/HsnCode";
import { hsnCodeSchema } from "@/types";
import type { ApiResponse } from "@/types";

const DEFAULT_HSN_CODES = [
  { code: "TEST-HSN", gstPercentage: 10, isActive: true },
];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let docs = await HsnCode.find({ isDeleted: { $ne: true } }).sort({ code: 1 });

    if (docs.length === 0) {
      await HsnCode.insertMany(DEFAULT_HSN_CODES);
      docs = await HsnCode.find({ isDeleted: { $ne: true } }).sort({ code: 1 });
    }

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
    const parsed = hsnCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await HsnCode.findOne({
      code: new RegExp(`^${parsed.data.code.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      isDeleted: { $ne: true },
    });

    if (existing) {
      existing.gstPercentage = parsed.data.gstPercentage;
      existing.isActive = parsed.data.isActive;
      await existing.save();
      return NextResponse.json<ApiResponse>({ success: true, data: existing.toJSON() }, { status: 200 });
    }

    const doc = await HsnCode.create({
      code: parsed.data.code.trim(),
      gstPercentage: parsed.data.gstPercentage,
      isActive: parsed.data.isActive,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: doc.toJSON() }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
