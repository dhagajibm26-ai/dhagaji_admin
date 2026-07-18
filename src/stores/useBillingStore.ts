import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { IFinishedProduct, SalesSource, PaymentMethod } from "@/types";

// ─── Draft item (client-only cart representation) ─────────────────────────────

export interface BillDraftItem {
  finishedProductId: string;
  designName: string;
  designCode: string;
  size: string;
  barcodeId: string;
  qty: number;
  sellingPrice: number;
  /** Cached at add-time for stock-overflow UI warning */
  maxStock: number;
  availableHsnCodes?: string[];
  hsnCodes?: string[];
}

// ─── State interface ──────────────────────────────────────────────────────────

interface BillingState {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  salesSource: SalesSource;
  paymentMethod: PaymentMethod;
  items: BillDraftItem[];
  gstEnabled: boolean;
  gstRate: number | null;
  gstNumber: string;
  discount: number;
  appliedCoupon: {
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
  } | null;
  // Actions
  setCustomer: (id: string | null, name: string, phone: string, address: string) => void;
  setSalesSource: (source: SalesSource) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  addItem: (product: IFinishedProduct, qty?: number) => void;
  removeItem: (barcodeId: string) => void;
  updateQty: (barcodeId: string, qty: number) => void;
  toggleGST: () => void;
  setGSTRate: (rate: number | null) => void;
  setGSTNumber: (n: string) => void;
  setDiscount: (amount: number) => void;
  setAppliedCoupon: (coupon: { code: string; discountType: "percentage" | "fixed"; discountValue: number } | null) => void;
  clearBill: () => void;
  toggleItemHsnCode: (barcodeId: string, hsnCode: string) => void;
}

const INITIAL: Pick<
  BillingState,
  | "customerId"
  | "customerName"
  | "customerPhone"
  | "customerAddress"
  | "salesSource"
  | "paymentMethod"
  | "items"
  | "gstEnabled"
  | "gstRate"
  | "gstNumber"
  | "discount"
  | "appliedCoupon"
> = {
  customerId: null,
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  salesSource: "Offline",
  paymentMethod: "Cash",
  items: [],
  gstEnabled: false,
  gstRate: null,
  gstNumber: "",
  discount: 0,
  appliedCoupon: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBillingStore = create<BillingState>()((set) => ({
  ...INITIAL,

  setCustomer: (id, name, phone, address) => set({ customerId: id, customerName: name, customerPhone: phone, customerAddress: address }),
  setSalesSource: (source) => set({ salesSource: source }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  addItem: (product, qty = 1) =>
    set((s) => {
      const existing = s.items.find((i) => i.barcodeId === product.barcodeId);
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.barcodeId === product.barcodeId
              ? { ...i, qty: Math.min(i.qty + qty, i.maxStock) }
              : i
          ),
        };
      }
      const clampedQty = Math.min(qty, product.readyStock);
      const prodHsn = product.hsnCodes || [];
      return {
        items: [
          ...s.items,
          {
            finishedProductId: product._id,
            designName: product.designName,
            designCode: product.designCode,
            size: product.size,
            barcodeId: product.barcodeId,
            qty: clampedQty,
            sellingPrice: product.sellingPrice,
            maxStock: product.readyStock,
            availableHsnCodes: prodHsn,
            hsnCodes: prodHsn,
          },
        ],
      };
    }),

  removeItem: (barcodeId) =>
    set((s) => ({ items: s.items.filter((i) => i.barcodeId !== barcodeId) })),

  updateQty: (barcodeId, qty) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.barcodeId === barcodeId
          ? { ...i, qty: Math.max(1, Math.min(qty, i.maxStock)) }
          : i
      ),
    })),

  toggleGST: () => set((s) => ({ gstEnabled: !s.gstEnabled })),
  setGSTRate: (rate) => set({ gstRate: rate }),
  setGSTNumber: (n) => set({ gstNumber: n }),
  setDiscount: (amount) => set({ discount: Math.max(0, amount), appliedCoupon: null }),
  setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
  clearBill: () => set(INITIAL),
  toggleItemHsnCode: (barcodeId, hsnCode) =>
    set((s) => ({
      items: s.items.map((i) => {
        if (i.barcodeId !== barcodeId) return i;
        const current = i.hsnCodes || [];
        const next = current.includes(hsnCode)
          ? current.filter((c) => c !== hsnCode)
          : [...current, hsnCode];
        return { ...i, hsnCodes: next };
      }),
    })),
}));

// ─── Individual selector hooks (Zustand v5 pattern) ──────────────────────────

export const useCustomerId = () => useBillingStore((s) => s.customerId);
export const useCustomerName = () => useBillingStore((s) => s.customerName);
export const useCustomerPhone = () => useBillingStore((s) => s.customerPhone);
export const useCustomerAddress = () => useBillingStore((s) => s.customerAddress);
export const useSalesSource = () => useBillingStore((s) => s.salesSource);
export const usePaymentMethod = () => useBillingStore((s) => s.paymentMethod);
export const useBillItems = () => useBillingStore((s) => s.items);
export const useGSTEnabled = () => useBillingStore((s) => s.gstEnabled);
export const useGSTRate = () => useBillingStore((s) => s.gstRate);
export const useGSTNumber = () => useBillingStore((s) => s.gstNumber);
export const useAppliedCoupon = () => useBillingStore((s) => s.appliedCoupon);

export const useSubtotal = () =>
  useBillingStore((s) => s.items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0));

export const useBillDiscount = () =>
  useBillingStore((s) => {
    if (!s.appliedCoupon) return s.discount;
    const subtotal = s.items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0);
    if (s.appliedCoupon.discountType === "percentage") {
      return (subtotal * s.appliedCoupon.discountValue) / 100;
    } else {
      return Math.min(subtotal, s.appliedCoupon.discountValue);
    }
  });

export const useTaxAmount = () =>
  useBillingStore((s) => {
    const subtotal = s.items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0);
    const discount = s.appliedCoupon
      ? s.appliedCoupon.discountType === "percentage"
        ? (subtotal * s.appliedCoupon.discountValue) / 100
        : Math.min(subtotal, s.appliedCoupon.discountValue)
      : s.discount;
    const taxable = Math.max(0, subtotal - discount);
    return s.gstEnabled && s.gstRate ? (taxable * s.gstRate) / 100 : 0;
  });

export const useGrandTotal = () =>
  useBillingStore((s) => {
    const subtotal = s.items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0);
    const discount = s.appliedCoupon
      ? s.appliedCoupon.discountType === "percentage"
        ? (subtotal * s.appliedCoupon.discountValue) / 100
        : Math.min(subtotal, s.appliedCoupon.discountValue)
      : s.discount;
    const taxable = Math.max(0, subtotal - discount);
    const tax = s.gstEnabled && s.gstRate ? (taxable * s.gstRate) / 100 : 0;
    return taxable + tax;
  });

export const useBillingActions = () =>
  useBillingStore(useShallow((s) => ({
    setCustomer: s.setCustomer,
    setSalesSource: s.setSalesSource,
    setPaymentMethod: s.setPaymentMethod,
    addItem: s.addItem,
    removeItem: s.removeItem,
    updateQty: s.updateQty,
    toggleGST: s.toggleGST,
    setGSTRate: s.setGSTRate,
    setGSTNumber: s.setGSTNumber,
    setDiscount: s.setDiscount,
    setAppliedCoupon: s.setAppliedCoupon,
    clearBill: s.clearBill,
    toggleItemHsnCode: s.toggleItemHsnCode,
  })));


