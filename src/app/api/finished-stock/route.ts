import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { FinishedProduct } from "@/models/FinishedProduct";
import { finishedProductSchema } from "@/types";
import type { ApiResponse } from "@/types";

import { WorkOrder } from "@/models/WorkOrder";
import { RawMaterial } from "@/models/RawMaterial";
import { BanglesStock } from "@/models/BanglesStock";
import { ThreadsStock } from "@/models/ThreadsStock";

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
      .select("finishedProductId rawMaterialsGiven rawMaterialsReturned banglesGiven threadItemsGiven");

    // 2. Map finished product ID to the set of component IDs used in its production
    const prodToRmMap = new Map<string, Set<string>>();
    const prodToBanglesMap = new Map<string, Set<string>>();
    const prodToThreadsMap = new Map<string, Set<string>>();

    workOrders.forEach((wo) => {
      if (!wo.finishedProductId) return;
      const pidStr = wo.finishedProductId.toString();
      
      if (!prodToRmMap.has(pidStr)) prodToRmMap.set(pidStr, new Set());
      if (!prodToBanglesMap.has(pidStr)) prodToBanglesMap.set(pidStr, new Set());
      if (!prodToThreadsMap.has(pidStr)) prodToThreadsMap.set(pidStr, new Set());

      const rmSet = prodToRmMap.get(pidStr)!;
      const banglesSet = prodToBanglesMap.get(pidStr)!;
      const threadsSet = prodToThreadsMap.get(pidStr)!;

      (wo.rawMaterialsGiven || []).forEach((rm) => {
        if (rm.rawMaterialId) rmSet.add(rm.rawMaterialId.toString());
      });
      (wo.rawMaterialsReturned || []).forEach((rm) => {
        if (rm.rawMaterialId) rmSet.add(rm.rawMaterialId.toString());
      });

      (wo.banglesGiven || []).forEach((bg) => {
        if (bg.banglesStockId) banglesSet.add(bg.banglesStockId.toString());
      });

      (wo.threadItemsGiven || []).forEach((tg) => {
        if (tg.threadStockId) threadsSet.add(tg.threadStockId.toString());
      });
    });

    // 3. Gather all unique component IDs
    const allRmIds = new Set<string>();
    const allBanglesIds = new Set<string>();
    const allThreadsIds = new Set<string>();

    prodToRmMap.forEach((rmSet) => rmSet.forEach((id) => allRmIds.add(id)));
    prodToBanglesMap.forEach((banglesSet) => banglesSet.forEach((id) => allBanglesIds.add(id)));
    prodToThreadsMap.forEach((threadsSet) => threadsSet.forEach((id) => allThreadsIds.add(id)));

    // 4. Fetch the components and build maps of component ID -> HSN codes
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

    const banglesStock = await BanglesStock.find({ _id: { $in: Array.from(allBanglesIds) } })
      .select("_id hsnCodes hsnCode");
    const banglesToHsnMap = new Map<string, string[]>();
    banglesStock.forEach((bs) => {
      const codes = new Set<string>();
      const doc = bs as any;
      if (doc.hsnCodes && doc.hsnCodes.length > 0) {
        doc.hsnCodes.forEach((code: string) => { if (code) codes.add(code); });
      } else if (doc.hsnCode) {
        codes.add(doc.hsnCode);
      }
      banglesToHsnMap.set(bs._id.toString(), Array.from(codes));
    });

    const threadsStock = await ThreadsStock.find({ _id: { $in: Array.from(allThreadsIds) } })
      .select("_id hsnCodes hsnCode");
    const threadsToHsnMap = new Map<string, string[]>();
    threadsStock.forEach((ts) => {
      const codes = new Set<string>();
      const doc = ts as any;
      if (doc.hsnCodes && doc.hsnCodes.length > 0) {
        doc.hsnCodes.forEach((code: string) => { if (code) codes.add(code); });
      } else if (doc.hsnCode) {
        codes.add(doc.hsnCode);
      }
      threadsToHsnMap.set(ts._id.toString(), Array.from(codes));
    });

    // 5. Build final response objects, resolving HSN codes dynamically for each product
    const data = items.map((p) => {
      const json = p.toJSON() as unknown as Record<string, unknown>;
      const pidStr = p._id.toString();
      const hsnSet = new Set<string>();
      
      const rmSet = prodToRmMap.get(pidStr);
      if (rmSet) {
        rmSet.forEach((rmId) => {
          const codes = rmToHsnMap.get(rmId);
          if (codes) codes.forEach((c) => hsnSet.add(c));
        });
      }

      const banglesSet = prodToBanglesMap.get(pidStr);
      if (banglesSet) {
        banglesSet.forEach((bId) => {
          const codes = banglesToHsnMap.get(bId);
          if (codes) codes.forEach((c) => hsnSet.add(c));
        });
      }

      const threadsSet = prodToThreadsMap.get(pidStr);
      if (threadsSet) {
        threadsSet.forEach((tId) => {
          const codes = threadsToHsnMap.get(tId);
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
