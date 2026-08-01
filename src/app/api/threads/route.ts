import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ThreadsStock } from "@/models/ThreadsStock";
import { buildDbPurchaseEntry } from "@/lib/purchaseHistory";
import { threadsStockSchema } from "@/types";
import type { ApiResponse } from "@/types";

const ALLOWED_LIMITS = [10, 20, 50, 100, 500] as const;
const DEFAULT_LIMIT = 20;

function parseLimit(raw: string | null): number | null {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return (ALLOWED_LIMITS as readonly number[]).includes(n) ? n : null;
}

function buildFilter(search: string | null) {
  const filter: Record<string, unknown> = { isDeleted: { $ne: true } };
  const q = search?.trim();
  if (q) {
    filter.$or = [
      { threadCode: { $regex: q, $options: "i" } },
      { threadColour: { $regex: q, $options: "i" } },
      { threadCompanyName: { $regex: q, $options: "i" } },
    ];
  }
  return filter;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const fetchAll = searchParams.get("all") === "true";
    const search = searchParams.get("search");

    await connectDB();

    const filter = buildFilter(search);

    if (fetchAll) {
      const docs = await ThreadsStock.find(filter).sort({ updatedAt: -1 });
      return NextResponse.json<ApiResponse>({ success: true, data: docs.map((d) => d.toJSON()) });
    }

    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const limit = parseLimit(searchParams.get("limit"));
    if (limit === null) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid limit. Allowed: 10, 20, 50, 100, 500" },
        { status: 400 }
      );
    }

    const total = await ThreadsStock.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);

    const docs = await ThreadsStock.find(filter)
      .sort({ updatedAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: docs.map((d) => d.toJSON()),
      pagination: { page: safePage, limit, total, totalPages },
    });
  } catch (err) {
    console.error("[GET /api/threads]", err);
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
    const parsed = threadsStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    try {
      await ThreadsStock.collection.dropIndex("threadCode_1");
    } catch {
      // Index doesn't exist or already dropped — ignore
    }
    const { hsnCode, gstPercentage, ...rest } = parsed.data;
    const item = await ThreadsStock.create({
      ...rest,
      hsnCode: hsnCode ?? undefined,
      gstPercentage: gstPercentage ?? undefined,
      purchaseHistory:
        parsed.data.stockAdd > 0
          ? [buildDbPurchaseEntry(parsed.data.stockAdd, Number((parsed.data.stockAdd * parsed.data.costPerUnit).toFixed(2)))]
          : [],
    });
    return NextResponse.json<ApiResponse>({ success: true, data: item.toJSON() }, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/threads]", err);
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "This Thread Code already exists. Please use a different code." },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
