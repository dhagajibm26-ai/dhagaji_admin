import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { softDeleteById, ACTIVE_FILTER } from "@/lib/softDelete";
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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    const worker = await Worker.findOne({ _id: id, ...ACTIVE_FILTER });
    if (!worker) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Worker not found" }, { status: 404 });
    }
    return NextResponse.json<ApiResponse>({ success: true, data: worker.toJSON() });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = workerSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    const worker = await Worker.findOneAndUpdate(
      { _id: id, ...ACTIVE_FILTER },
      { $set: normalizeWorkerPayload(parsed.data) },
      { new: true, runValidators: true }
    );
    if (!worker) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Worker not found" }, { status: 404 });
    }
    return NextResponse.json<ApiResponse>({ success: true, data: worker.toJSON() });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await connectDB();
    const worker = await softDeleteById(Worker, id);
    if (!worker) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Worker not found" }, { status: 404 });
    }
    return NextResponse.json<ApiResponse>({ success: true, data: null });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
