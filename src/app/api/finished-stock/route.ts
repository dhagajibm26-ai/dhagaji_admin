import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { FinishedProduct } from "@/models/FinishedProduct";
import { finishedProductSchema } from "@/types";
import type { ApiResponse } from "@/types";

import { WorkOrder } from "@/models/WorkOrder";
import { RawMaterial } from "@/models/RawMaterial";

const OWNER_ONLY_FIELDS = [
  "makingCostPerPc",
  "otherCostPerPc",
  "MRP",
  "wholesalePrice",
  "totalCost",
  "profitPerPc",
  "totalRevenue",
] as const;

function stripCostFields(product: Record<string, unknown>) {
  const result = { ...product };
  for (const f of OWNER_ONLY_FIELDS) delete result[f];
  return result;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const isOwner = session.user.role === "owner";
    await connectDB();
    
    const items = await FinishedProduct.find().sort({ createdAt: -1 });

    // 1. Fetch all work orders associated with the retrieved finished product IDs
    const productIds = items.map((p) => p._id);
    const workOrders = await WorkOrder.find({ finishedProductId: { $in: productIds } })
      .select("finishedProductId rawMaterialsGiven rawMaterialsReturned");

    // 2. Map finished product ID to the set of raw material IDs used in its production
    const prodToRmMap = new Map<string, Set<string>>();
    workOrders.forEach((wo) => {
      if (!wo.finishedProductId) return;
      const pidStr = wo.finishedProductId.toString();
      if (!prodToRmMap.has(pidStr)) {
        prodToRmMap.set(pidStr, new Set());
      }
      const rmSet = prodToRmMap.get(pidStr)!;
      (wo.rawMaterialsGiven || []).forEach((rm) => {
        if (rm.rawMaterialId) rmSet.add(rm.rawMaterialId.toString());
      });
      (wo.rawMaterialsReturned || []).forEach((rm) => {
        if (rm.rawMaterialId) rmSet.add(rm.rawMaterialId.toString());
      });
    });

    // 3. Gather all unique raw material IDs to fetch their HSN codes
    const allRmIds = new Set<string>();
    prodToRmMap.forEach((rmSet) => {
      rmSet.forEach((id) => allRmIds.add(id));
    });

    // 4. Fetch the raw materials and build a map of raw material ID -> HSN codes
    const rawMaterials = await RawMaterial.find({ _id: { $in: Array.from(allRmIds) } })
      .select("_id hsnCodes hsnCode");
    const rmToHsnMap = new Map<string, string[]>();
    rawMaterials.forEach((rm) => {
      const codes = new Set<string>();
      if (rm.hsnCodes && rm.hsnCodes.length > 0) {
        rm.hsnCodes.forEach((code) => { if (code) codes.add(code); });
      } else if (rm.hsnCode) {
        codes.add(rm.hsnCode);
      }
      rmToHsnMap.set(rm._id.toString(), Array.from(codes));
    });

    // 5. Build final response objects, resolving HSN codes dynamically for each product
    const data = items.map((p) => {
      const json = p.toJSON() as unknown as Record<string, unknown>;
      const pidStr = p._id.toString();
      const rmSet = prodToRmMap.get(pidStr);
      const hsnSet = new Set<string>();
      if (rmSet) {
        rmSet.forEach((rmId) => {
          const codes = rmToHsnMap.get(rmId);
          if (codes) codes.forEach((c) => hsnSet.add(c));
        });
      }
      json.hsnCodes = Array.from(hsnSet);
      return isOwner ? json : stripCostFields(json);
    });

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (err) {
    console.error("Fetch finished stock API error:", err);
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
    const parsed = finishedProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    const item = await FinishedProduct.create(parsed.data);
    return NextResponse.json<ApiResponse>({ success: true, data: item.toJSON() }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
