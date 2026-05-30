import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Bill } from "@/models/Bill";
import type { ApiResponse, IBill } from "@/types";

/**
 * GET /api/billing/[id]/pdf
 *
 * Returns bill data so the client can generate a PDF using jsPDF.
 * The actual PDF rendering happens client-side (WhatsAppShare component).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const bill = await Bill.findById(id);
    if (!bill) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<IBill>>({
      success: true,
      data: bill.toJSON() as unknown as IBill,
    });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
