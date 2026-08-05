import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { HsnCode } from "@/models/HsnCode";
import { hsnCodeSchema } from "@/types";
import type { ApiResponse } from "@/types";

const DEFAULT_HSN_CODES = [
  { code: "TEST-HSN", gstPercentage: 10, isActive: true },
];

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    await connectDB();

    const filter: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (scope) filter.scope = scope;

    const docs = await HsnCode.find(filter).sort({ code: 1 });

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
      scope: parsed.data.scope ?? null,
      isDeleted: { $ne: true },
    });

    if (existing) {
      existing.gstPercentage = parsed.data.gstPercentage;
      existing.isActive = parsed.data.isActive;
      if (parsed.data.label !== undefined) existing.label = parsed.data.label;
      await existing.save();
      return NextResponse.json<ApiResponse>({ success: true, data: existing.toJSON() }, { status: 200 });
    }

    const doc = await HsnCode.create({
      code: parsed.data.code.trim(),
      label: parsed.data.label?.trim() || undefined,
      scope: parsed.data.scope || undefined,
      gstPercentage: parsed.data.gstPercentage,
      isActive: parsed.data.isActive,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: doc.toJSON() }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
