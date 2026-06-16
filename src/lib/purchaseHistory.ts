export interface PurchaseEntry {
  quantity: number;
  totalAmount: number;
  ratePerUnit: number;
  purchasedAt: string;
}

export function weightedRate(
  currentQty: number,
  currentRate: number,
  addQty: number,
  addRate: number
): number {
  const totalQty = currentQty + addQty;
  if (totalQty <= 0) return addRate;
  return Number(((currentQty * currentRate + addQty * addRate) / totalQty).toFixed(4));
}

export function buildPurchaseEntry(
  quantity: number,
  totalAmount: number
): PurchaseEntry {
  const ratePerUnit = quantity > 0 ? Number((totalAmount / quantity).toFixed(4)) : 0;
  return {
    quantity,
    totalAmount: Number(totalAmount.toFixed(2)),
    ratePerUnit,
    purchasedAt: new Date().toISOString(),
  };
}

/** Mongoose subdocument shape (Date field) */
export function buildDbPurchaseEntry(quantity: number, totalAmount: number) {
  const entry = buildPurchaseEntry(quantity, totalAmount);
  return {
    quantity: entry.quantity,
    totalAmount: entry.totalAmount,
    ratePerUnit: entry.ratePerUnit,
    purchasedAt: new Date(),
  };
}

export function formatGramRate(rate: number): string {
  return `${rate.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/g`;
}

export function formatPieceRate(rate: number): string {
  return `₹${rate.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/pc`;
}

export function formatKgRateFromGramRate(ratePerGram: number): string {
  const perKg = ratePerGram * 1000;
  return `₹${perKg.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function resolvePurchaseHistory<T extends {
  purchaseHistory?: PurchaseEntry[];
  purchasedAt?: string;
  createdAt?: Date | string;
}>(
  history: PurchaseEntry[] | undefined,
  fallback?: { quantity: number; totalAmount: number; ratePerUnit: number; date?: string }
): PurchaseEntry[] {
  if (history && history.length > 0) {
    return [...history].sort(
      (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
    );
  }
  if (!fallback || fallback.quantity <= 0) return [];
  return [
    {
      quantity: fallback.quantity,
      totalAmount: fallback.totalAmount,
      ratePerUnit: fallback.ratePerUnit,
      purchasedAt: fallback.date ?? new Date().toISOString(),
    },
  ];
}
