import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { RawMaterialUnit } from "@/models/RawMaterialUnit";
import { rawMaterialUnitSchema } from "@/types";
import type { ApiResponse } from "@/types";

const DEFAULT_UNITS = ["gram", "pcs", "tube", "box", "meter"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    let docs = await RawMaterialUnit.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
    
    if (docs.length === 0) {
      const toInsert = DEFAULT_UNITS.map(name => ({ name, isActive: true }));
      await RawMaterialUnit.insertMany(toInsert);
      docs = await RawMaterialUnit.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
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
    const parsed = rawMaterialUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await RawMaterialUnit.findOne({
      name: new RegExp(`^${parsed.data.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      isDeleted: { $ne: true },
    });

    if (existing) {
      return NextResponse.json<ApiResponse>({ success: true, data: existing.toJSON() }, { status: 200 });
    }

    const doc = await RawMaterialUnit.create({
      name: parsed.data.name.trim(),
      isActive: parsed.data.isActive,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: doc.toJSON() }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
