import { connectDB } from "./mongodb";
import { Counter } from "@/models/Counter";

/**
 * Atomically increments the per-year bill counter and returns the next
 * bill number in DC-YYYY-NNNN format (e.g. DC-2026-0001).
 *
 * Uses MongoDB findOneAndUpdate with upsert so concurrent requests never
 * produce the same number.
 */
export async function nextBillNumber(): Promise<string> {
  await connectDB();
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `bill-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `DC-${year}-${String(counter!.seq).padStart(4, "0")}`;
}
