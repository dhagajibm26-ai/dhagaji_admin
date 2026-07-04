import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { FinishedProduct } from "@/models/FinishedProduct";
import { finishedProductSchema } from "@/types";
import type { ApiResponse } from "@/types";

import { WorkOrder } from "@/models/WorkOrder";
import { RawMaterial } from "@/models/RawMaterial";

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
      .select("rawMaterialsGiven rawMaterialsReturned");
    const rawMaterialIds = workOrders.flatMap((wo) => [
      ...(wo.rawMaterialsGiven || []).map((rm) => rm.rawMaterialId.toString()),
      ...(wo.rawMaterialsReturned || []).map((rm) => rm.rawMaterialId.toString()),
    ]);
    const uniqueRmIds = Array.from(new Set(rawMaterialIds));
    const rawMaterials = await RawMaterial.find({ _id: { $in: uniqueRmIds } })
      .select("hsnCodes hsnCode");
    const hsnSet = new Set<string>();
    rawMaterials.forEach((rm) => {
      if (rm.hsnCodes && rm.hsnCodes.length > 0) {
        rm.hsnCodes.forEach((c) => { if (c) hsnSet.add(c); });
      } else if (rm.hsnCode) {
        hsnSet.add(rm.hsnCode);
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
