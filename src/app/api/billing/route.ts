import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Bill } from "@/models/Bill";
import { FinishedProduct } from "@/models/FinishedProduct";
import { WorkOrder } from "@/models/WorkOrder";
import { RawMaterial } from "@/models/RawMaterial";
import { billSchema } from "@/types";
import type { ApiResponse, IBill } from "@/types";
import { nextBillNumber } from "@/lib/billNumber";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const source = searchParams.get("source");

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (source) filter.salesSource = source;
    if (dateFrom || dateTo) {
      filter.billDate = {};
      if (dateFrom) filter.billDate.$gte = new Date(dateFrom);
      if (dateTo) filter.billDate.$lte = new Date(dateTo);
    }

    const bills = await Bill.find(filter).sort({ createdAt: -1 }).limit(200);
    return NextResponse.json<ApiResponse<IBill[]>>({
      success: true,
      data: bills.map((b) => b.toJSON() as unknown as IBill),
    });
  } catch {
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
    const parsed = billSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Validate stock availability for all items and resolve raw material HSN codes
    const updatedItems = [];
    for (const item of parsed.data.items) {
      const product = await FinishedProduct.findById(item.finishedProductId).select(
        "readyStock designName"
      );
      if (!product) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: `Product not found: ${item.designName}` },
          { status: 404 }
        );
      }
      if (product.readyStock < item.qty) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: `Insufficient stock for "${item.designName}" (only ${product.readyStock} available)`,
          },
          { status: 409 }
        );
      }

      // Find all work orders that produced this finished product
      const workOrders = await WorkOrder.find({ finishedProductId: item.finishedProductId });
      
      // Extract raw material IDs
      const rawMaterialIds = workOrders.flatMap((wo) => [
        ...(wo.rawMaterialsGiven || []).map((rm) => rm.rawMaterialId.toString()),
        ...(wo.rawMaterialsReturned || []).map((rm) => rm.rawMaterialId.toString()),
      ]);
      const uniqueRmIds = Array.from(new Set(rawMaterialIds));

      // Fetch raw materials to get HSN codes
      const rawMaterials = await RawMaterial.find({ _id: { $in: uniqueRmIds } }).select("hsnCodes hsnCode");
      const hsnCodesSet = new Set<string>();
      for (const rm of rawMaterials) {
        if (rm.hsnCodes && rm.hsnCodes.length > 0) {
          rm.hsnCodes.forEach((code) => {
            if (code) hsnCodesSet.add(code);
          });
        } else if (rm.hsnCode) {
          hsnCodesSet.add(rm.hsnCode);
        }
      }

      updatedItems.push({
        ...item,
        hsnCodes: Array.from(hsnCodesSet),
      });
    }

    // 2. Deduct stock atomically via bulkWrite
    const stockOps = parsed.data.items.map((item) => ({
      updateOne: {
        filter: { _id: item.finishedProductId },
        update: { $inc: { readyStock: -item.qty, totalSold: item.qty } },
      },
    }));
    await FinishedProduct.bulkWrite(stockOps);

    // 3. Atomically generate bill number
    const billNumber = await nextBillNumber();

    // 4. Create the bill (billNumber already set → pre-save hook skips)
    const bill = await Bill.create({ ...parsed.data, items: updatedItems, billNumber });

    return NextResponse.json<ApiResponse<IBill>>(
      { success: true, data: bill.toJSON() as unknown as IBill },
      { status: 201 }
    );
  } catch (err) {
    console.error("Billing POST error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
