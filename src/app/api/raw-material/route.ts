import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { RawMaterial } from "@/models/RawMaterial";
import { rawMaterialSchema } from "@/types";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Do NOT use .lean() — virtuals (closingStock, totalValue) are stripped by lean().
    const docs = await RawMaterial.find({ isDeleted: { $ne: true } }).sort({
      createdAt: -1,
    });

    // toJSON({ virtuals: true }) is configured on the schema, so virtuals are included.
    const items = docs.map((d) => d.toJSON());

    return NextResponse.json<ApiResponse>({ success: true, data: items });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = rawMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Validation error",
        },
        { status: 400 }
      );
    }

    await connectDB();
    const doc = await RawMaterial.create(parsed.data);
    return NextResponse.json<ApiResponse>(
      { success: true, data: doc.toJSON() },
      { status: 201 }
    );
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
