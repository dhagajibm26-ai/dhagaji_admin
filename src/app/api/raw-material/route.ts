import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { RawMaterial } from "@/models/RawMaterial";
import { buildDbPurchaseEntry } from "@/lib/purchaseHistory";
import { rawMaterialSchema } from "@/types";
import type { ApiResponse } from "@/types";

const ALLOWED_LIMITS = [10, 20, 50, 100, 500] as const;
const DEFAULT_LIMIT = 20;

function parseLimit(raw: string | null): number | null {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return (ALLOWED_LIMITS as readonly number[]).includes(n) ? n : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const fetchAll = searchParams.get("all") === "true";

    await connectDB();

    const filter = { isDeleted: { $ne: true } };

    if (fetchAll) {
      const docs = await RawMaterial.find(filter).sort({ updatedAt: -1 });
      const items = docs.map((d) => d.toJSON());
      return NextResponse.json<ApiResponse>({ success: true, data: items });
    }

    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const limit = parseLimit(searchParams.get("limit"));
    if (limit === null) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid limit. Allowed: 10, 20, 50, 100, 500" },
        { status: 400 }
      );
    }

    const total = await RawMaterial.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);

    const docs = await RawMaterial.find(filter)
      .sort({ updatedAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit);

    const items = docs.map((d) => d.toJSON());

    return NextResponse.json<ApiResponse>({
      success: true,
      data: items,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
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
    const { purchasedQty, ratePerUnit, hsnCode, gstPercentage, ...rest } = parsed.data;

    const totalAmount = Number((purchasedQty * ratePerUnit).toFixed(2));
    const purchaseHistory =
      purchasedQty > 0 ? [buildDbPurchaseEntry(purchasedQty, totalAmount)] : [];

    const doc = await RawMaterial.create({
      ...rest,
      hsnCode: hsnCode ?? undefined,
      gstPercentage: gstPercentage ?? undefined,
      purchasedQty,
      ratePerUnit,
      purchaseHistory,
      lastPurchaseDate: purchasedQty > 0 ? new Date() : undefined,
    });
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
