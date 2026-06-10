import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Worker } from "@/models/Worker";
import { workerSchema } from "@/types";
import type { ApiResponse } from "@/types";

function normalizeWorkerPayload(input: Record<string, unknown>) {
  const mobile = (input.mobile as string | undefined)?.trim();
  const phone = (input.phone as string | undefined)?.trim();
  const address = (input.address as string | undefined)?.trim();
  return {
    ...input,
    mobile,
    phone: mobile || phone || undefined,
    address,
    aadhaarNumber: (input.aadhaarNumber as string | undefined)?.trim() || undefined,
    dateOfBirth: input.dateOfBirth ? new Date(String(input.dateOfBirth)) : undefined,
    joiningDate: input.joiningDate ? new Date(String(input.joiningDate)) : undefined,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const items = await Worker.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
    return NextResponse.json<ApiResponse>({ success: true, data: items.map((w) => w.toJSON()) });
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
    const parsed = workerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    const item = await Worker.create(normalizeWorkerPayload(parsed.data));
    return NextResponse.json<ApiResponse>({ success: true, data: item.toJSON() }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
