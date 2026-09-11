import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Bill } from "@/models/Bill";
import { RawMaterial } from "@/models/RawMaterial";
import { FinishedProduct } from "@/models/FinishedProduct";
import { WorkOrder } from "@/models/WorkOrder";
import type { ApiResponse } from "@/types";
import type { SalesSource } from "@/models/Bill";
import type { Types } from "mongoose";

export interface DashboardData {
  todaySales: { amount: number; billCount: number };
  rawMaterialValue: number;
  finishedStockValue: number;
  readyStockCount: number;
  pendingWorkerPayments: number;
  lowStockItems: { name: string; closingStock: number }[];
  todayProfit: { revenue: number; cost: number; profit: number; margin: number };
  salesBySource: Record<SalesSource, number>;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    // Dashboard is owner-only
    if (session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // ── Date range for today ─────────────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // ── Run independent queries in parallel ──────────────────────────────────
    const [todayBills, rawMatAgg, finishedAgg, workerPayAgg, rawMatsForStock] =
      await Promise.all([
        // Today's bills (need docs for virtual grandTotal)
        Bill.find({ billDate: { $gte: todayStart, $lt: todayEnd } }),

        // Raw material total value via aggregation
        RawMaterial.aggregate<{ total: number }>([
          { $match: { isDeleted: { $ne: true } } },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: [
                    {
                      $subtract: [
                        { $add: ["$openingStock", "$purchasedQty"] },
                        "$usedQty",
                      ],
                    },
                    "$ratePerUnit",
                  ],
                },
              },
            },
          },
        ]),

        // Finished stock: total value + count
        FinishedProduct.aggregate<{ stockValue: number; readyStockCount: number }>([
          {
            $group: {
              _id: null,
              stockValue: { $sum: { $multiply: ["$readyStock", "$sellingPrice"] } },
              readyStockCount: { $sum: "$readyStock" },
            },
          },
        ]),

        // Pending worker payments
        WorkOrder.aggregate<{ total: number }>([
          {
            $project: {
              outstanding: {
                $subtract: [
                  { $multiply: ["$qualityOK", "$perPieceRate"] },
                  "$amountPaid",
                ],
              },
            },
          },
          { $match: { outstanding: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: "$outstanding" } } },
        ]),

        // Raw materials for low-stock detection
        RawMaterial.find({ isDeleted: { $ne: true } }).select(
          "itemName openingStock purchasedQty usedQty lowStockThreshold"
        ),
      ]);

    // ── Today's sales totals ─────────────────────────────────────────────────
    const todaySalesAmount = todayBills.reduce((sum, b) => {
      const j = b.toJSON() as { grandTotal: number };
      return sum + (j.grandTotal ?? 0);
    }, 0);
    const todayBillCount = todayBills.length;

    // ── Sales by source (today) ──────────────────────────────────────────────
    const salesBySource: Record<SalesSource, number> = {
      Offline: 0,
      Instagram: 0,
      WhatsApp: 0,
      Exhibition: 0,
    };
    for (const bill of todayBills) {
      const j = bill.toJSON() as { salesSource: SalesSource; grandTotal: number };
      if (j.salesSource in salesBySource) {
        salesBySource[j.salesSource] += j.grandTotal ?? 0;
      }
    }

    // ── Today's profit (lookup product cost for each bill item) ──────────────
    const allProductIds = [
      ...new Set(
        todayBills.flatMap((b) =>
          b.items
            .filter((i) => i.finishedProductId)
            .map((i) => (i.finishedProductId as Types.ObjectId).toString())
        )
      ),
    ];

    const costProducts = allProductIds.length
      ? await FinishedProduct.find({ _id: { $in: allProductIds } }).select(
          "makingCostPerPc otherCostPerPc"
        )
      : [];

    const costMap = new Map(
      costProducts.map((p) => [
        p._id.toString(),
        p.makingCostPerPc + p.otherCostPerPc,
      ])
    );

    let todayCost = 0;
    for (const bill of todayBills) {
      for (const item of bill.items) {
        const costPerPc = item.finishedProductId
          ? costMap.get((item.finishedProductId as Types.ObjectId).toString()) ?? 0
          : 0;
        todayCost += costPerPc * item.qty;
      }
    }

    const todayRevenue = todaySalesAmount;
    const todayProfit = todayRevenue - todayCost;
    const todayMargin = todayRevenue > 0 ? (todayProfit / todayRevenue) * 100 : 0;

    // ── Low stock items ───────────────────────────────────────────────────────
    const lowStockItems = rawMatsForStock
      .filter((m) => {
        const closing = m.openingStock + m.purchasedQty - m.usedQty;
        return closing <= m.lowStockThreshold;
      })
      .map((m) => ({
        name: m.itemName,
        closingStock: m.openingStock + m.purchasedQty - m.usedQty,
      }));

    // ── Assemble response ─────────────────────────────────────────────────────
    const data: DashboardData = {
      todaySales: { amount: todaySalesAmount, billCount: todayBillCount },
      rawMaterialValue: rawMatAgg[0]?.total ?? 0,
      finishedStockValue: finishedAgg[0]?.stockValue ?? 0,
      readyStockCount: finishedAgg[0]?.readyStockCount ?? 0,
      pendingWorkerPayments: workerPayAgg[0]?.total ?? 0,
      lowStockItems,
      todayProfit: {
        revenue: todayRevenue,
        cost: todayCost,
        profit: todayProfit,
        margin: todayMargin,
      },
      salesBySource,
    };

    return NextResponse.json<ApiResponse<DashboardData>>({ success: true, data });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
