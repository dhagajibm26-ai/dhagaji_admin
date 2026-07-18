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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = finishedProductSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }
    await connectDB();
    const item = await FinishedProduct.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true }
    );
    if (!item) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Product not found" }, { status: 404 });
    }

    // Resolve HSN codes dynamically from the work orders that produced this finished product
    const workOrders = await WorkOrder.find({ finishedProductId: id })
      .select("rawMaterialsGiven rawMaterialsReturned banglesGiven threadItemsGiven");
    
    const rawMaterialIds = workOrders.flatMap((wo) => [
      ...(wo.rawMaterialsGiven || []).map((rm) => rm.rawMaterialId.toString()),
      ...(wo.rawMaterialsReturned || []).map((rm) => rm.rawMaterialId.toString()),
    ]);
    const uniqueRmIds = Array.from(new Set(rawMaterialIds));

    const bangleStockIds = workOrders.flatMap((wo) => [
      ...(wo.banglesGiven || []).map((bg) => bg.banglesStockId.toString()),
    ]);
    const uniqueBangleIds = Array.from(new Set(bangleStockIds));

    const threadStockIds = workOrders.flatMap((wo) => [
      ...(wo.threadItemsGiven || []).map((tg) => tg.threadStockId.toString()),
    ]);
    const uniqueThreadIds = Array.from(new Set(threadStockIds));

    const hsnSet = new Set<string>();

    const rawMaterials = await RawMaterial.find({ _id: { $in: uniqueRmIds } })
      .select("hsnCodes hsnCode");
    rawMaterials.forEach((rm) => {
      if (rm.hsnCodes && rm.hsnCodes.length > 0) {
        rm.hsnCodes.forEach((c) => { if (c) hsnSet.add(c); });
      } else if (rm.hsnCode) {
        hsnSet.add(rm.hsnCode);
      }
    });

    const banglesStock = await BanglesStock.find({ _id: { $in: uniqueBangleIds } })
      .select("hsnCodes hsnCode");
    banglesStock.forEach((bs) => {
      const doc = bs as any;
      if (doc.hsnCodes && doc.hsnCodes.length > 0) {
        doc.hsnCodes.forEach((c: string) => { if (c) hsnSet.add(c); });
      } else if (doc.hsnCode) {
        hsnSet.add(doc.hsnCode);
      }
    });

    const threadsStock = await ThreadsStock.find({ _id: { $in: uniqueThreadIds } })
      .select("hsnCodes hsnCode");
    threadsStock.forEach((ts) => {
      const doc = ts as any;
      if (doc.hsnCodes && doc.hsnCodes.length > 0) {
        doc.hsnCodes.forEach((c: string) => { if (c) hsnSet.add(c); });
      } else if (doc.hsnCode) {
        hsnSet.add(doc.hsnCode);
      }
    });

    const json = item.toJSON();
    json.hsnCodes = Array.from(hsnSet);

    return NextResponse.json<ApiResponse>({ success: true, data: json });
  } catch (err) {
    console.error("PATCH finished product API error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
