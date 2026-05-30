import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Bill } from "@/models/Bill";
import { Expense } from "@/models/Expense";
import type { ApiResponse } from "@/types";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "owner") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start")
      ? new Date(searchParams.get("start")!)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = searchParams.get("end")
      ? new Date(searchParams.get("end")!)
      : new Date();

    await connectDB();

    const [bills, expenses] = await Promise.all([
      Bill.find({ billDate: { $gte: startDate, $lte: endDate } }),
      Expense.find({ date: { $gte: startDate, $lte: endDate } }).lean(),
    ]);

    const totalRevenue = bills.reduce((sum, b) => sum + b.grandTotal, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { totalRevenue, totalExpenses, netProfit, bills, expenses },
    });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
