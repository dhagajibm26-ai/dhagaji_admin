import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ACTIVE_FILTER } from "@/lib/softDelete";
import { BangleSize } from "@/models/BangleSize";
import { bangleSizeSchema } from "@/types";
import type { ApiResponse } from "@/types";

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const docs = await BangleSize.find(ACTIVE_FILTER).sort({ name: 1 });
    return NextResponse.json<ApiResponse>({ success: true, data: docs.map((d) => d.toJSON()) });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/** Create or restore a single bangle size by name. Returns the resulting doc. */
async function upsertBangleSize(rawName: string, isActive: boolean) {
  const trimmedName = rawName.trim();
  const normalizedName = normalizeName(trimmedName);

  const existing = await BangleSize.findOne({ normalizedName });
  if (existing) {
    if (existing.isDeleted) {
      existing.name = trimmedName;
      existing.normalizedName = normalizedName;
      existing.isActive = isActive;
      existing.isDeleted = false;
      await existing.save();
    }
    return existing;
  }

  return BangleSize.create({ name: trimmedName, normalizedName, isActive });
}

export async function POST(request: Request) {
  let normalizedName = "";

  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // ── Bulk create — body: { names: string[] } ──────────────────────────────
    if (Array.isArray((body as { names?: unknown })?.names)) {
      const names = ((body as { names: unknown[] }).names)
        .filter((n): n is string => typeof n === "string")
        .map((n) => n.trim())
        .filter(Boolean);

      // De-duplicate within the submitted batch (case-insensitive)
      const seen = new Set<string>();
      const unique = names.filter((n) => {
        const key = normalizeName(n);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (unique.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Provide at least one valid size" },
          { status: 400 }
        );
      }

      await connectDB();
      const created = [];
      for (const name of unique) {
        const doc = await upsertBangleSize(name, true);
        created.push(doc.toJSON());
      }
      return NextResponse.json<ApiResponse>({ success: true, data: created }, { status: 201 });
    }

    const parsed = bangleSizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();

    const trimmedName = parsed.data.name.trim();
    normalizedName = normalizeName(trimmedName);

    const existing = await BangleSize.findOne({
      normalizedName,
    });

    if (existing) {
      if (existing.isDeleted) {
        existing.name = trimmedName;
        existing.normalizedName = normalizedName;
        existing.isActive = parsed.data.isActive;
        existing.isDeleted = false;
        await existing.save();
      }
      return NextResponse.json<ApiResponse>({ success: true, data: existing.toJSON() }, { status: 200 });
    }

    const doc = await BangleSize.create({
      name: trimmedName,
      normalizedName,
      isActive: parsed.data.isActive,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: doc.toJSON() }, { status: 201 });
  } catch (err) {
    const error = err as { code?: number };
    if (error.code === 11000) {
      if (normalizedName) {
        await connectDB();
        const existing = await BangleSize.findOne({ normalizedName });
        if (existing?.isDeleted) {
          existing.isDeleted = false;
          await existing.save();
          return NextResponse.json<ApiResponse>({ success: true, data: existing.toJSON() }, { status: 200 });
        }
        if (existing) {
          return NextResponse.json<ApiResponse>({ success: true, data: existing.toJSON() }, { status: 200 });
        }
      }

      return NextResponse.json<ApiResponse>({ success: false, error: "Bangle size already exists" }, { status: 409 });
    }
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
