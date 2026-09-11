import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { IFinishedProduct, SalesSource, PaymentMethod } from "@/types";

// ─── Draft item (client-only cart representation) ─────────────────────────────

export interface BillDraftItem {
  finishedProductId?: string;
  designName: string;
  designCode?: string;
  size?: string;
  barcodeId: string;
  qty: number;
  sellingPrice: number;
  /** Cached at add-time for stock-overflow UI warning */
  maxStock: number;
  availableHsnCodes?: string[];
  hsnCodes?: string[];
}

// ─── State interface ──────────────────────────────────────────────────────────

export type BillingMode = "product" | "manual";
export type GSTType = "cgst_sgst" | "igst";

interface BillingState {
  billingMode: BillingMode;
  manualAmount: number;
  manualNotes: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail: string;
  salesSource: SalesSource;
  paymentMethod: PaymentMethod;
  items: BillDraftItem[];
  gstEnabled: boolean;
  gstType: GSTType;
  gstRate: number | null;
  cgstRate: number | null;
  sgstRate: number | null;
  gstNumber: string;
  discount: number;
  appliedCoupon: {
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
  } | null;
  // Actions
  setBillingMode: (mode: BillingMode) => void;
  setManualAmount: (amount: number) => void;
  setManualNotes: (notes: string) => void;
  addManualItem: (item: { designName: string; qty: number; sellingPrice: number; hsnCode?: string }) => void;
  setCustomer: (id: string | null, name: string, phone: string, address: string, email: string) => void;
  setSalesSource: (source: SalesSource) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  addItem: (product: IFinishedProduct, qty?: number) => void;
  removeItem: (barcodeId: string) => void;
  updateQty: (barcodeId: string, qty: number) => void;
  toggleGST: () => void;
  setGSTType: (type: GSTType) => void;
  setGSTRate: (rate: number | null) => void;
  setCGSTRate: (rate: number | null) => void;
  setSGSTRate: (rate: number | null) => void;
  setGSTNumber: (n: string) => void;
  setDiscount: (amount: number) => void;
  setAppliedCoupon: (coupon: { code: string; discountType: "percentage" | "fixed"; discountValue: number } | null) => void;
  clearBill: () => void;
  toggleItemHsnCode: (barcodeId: string, hsnCode: string) => void;
}

const INITIAL: Pick<
  BillingState,
  | "billingMode"
  | "manualAmount"
  | "manualNotes"
  | "customerId"
  | "customerName"
  | "customerPhone"
  | "customerAddress"
  | "customerEmail"
  | "salesSource"
  | "paymentMethod"
  | "items"
  | "gstEnabled"
  | "gstType"
  | "gstRate"
  | "cgstRate"
  | "sgstRate"
  | "gstNumber"
  | "discount"
  | "appliedCoupon"
> = {
  billingMode: "product",
  manualAmount: 0,
  manualNotes: "",
  customerId: null,
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  customerEmail: "",
  salesSource: "Offline",
  paymentMethod: "Cash",
  items: [],
  gstEnabled: false,
  gstType: "cgst_sgst",
  gstRate: null,
  cgstRate: null,
  sgstRate: null,
  gstNumber: "",
  discount: 0,
  appliedCoupon: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBillingStore = create<BillingState>()((set, get) => ({
  ...INITIAL,

  setBillingMode: (mode) => set({ billingMode: mode }),
  setManualAmount: (amount) => set({ manualAmount: Math.max(0, amount) }),
  setManualNotes: (notes) => set({ manualNotes: notes }),

  addManualItem: (item) =>
    set((s) => {
      const barcodeId = `MAN-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      return {
        items: [
          ...s.items,
          {
            designName: item.designName,
            designCode: "MANUAL",
            size: "—",
            barcodeId,
            qty: Math.max(1, item.qty),
            sellingPrice: Math.max(0, item.sellingPrice),
            maxStock: 999999,
            availableHsnCodes: item.hsnCode ? [item.hsnCode] : [],
            hsnCodes: item.hsnCode ? [item.hsnCode] : [],
          },
        ],
      };
    }),

  setCustomer: (id, name, phone, address, email) => set({ customerId: id, customerName: name, customerPhone: phone, customerAddress: address, customerEmail: email }),
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
  setGSTType: (type) =>
    set((s) => {
      if (type === "cgst_sgst" && s.gstRate) {
        return { gstType: type, cgstRate: s.gstRate / 2, sgstRate: s.gstRate / 2 };
      }
      return { gstType: type };
    }),
  setGSTRate: (rate) =>
    set((s) => {
      if (s.gstType === "cgst_sgst") {
        return {
          gstRate: rate,
          cgstRate: rate != null ? rate / 2 : null,
          sgstRate: rate != null ? rate / 2 : null,
        };
      }
      return { gstRate: rate };
    }),
  setCGSTRate: (rate) =>
    set((s) => {
      const currentSgst = s.sgstRate ?? rate ?? 0;
      const total = (rate ?? 0) + currentSgst;
      return { cgstRate: rate, gstRate: total };
    }),
  setSGSTRate: (rate) =>
    set((s) => {
      const currentCgst = s.cgstRate ?? rate ?? 0;
      const total = currentCgst + (rate ?? 0);
      return { sgstRate: rate, gstRate: total };
    }),
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

export const useBillingMode = () => useBillingStore((s) => s.billingMode);
export const useManualAmount = () => useBillingStore((s) => s.manualAmount);
export const useManualNotes = () => useBillingStore((s) => s.manualNotes);
export const useCustomerId = () => useBillingStore((s) => s.customerId);
export const useCustomerName = () => useBillingStore((s) => s.customerName);
export const useCustomerPhone = () => useBillingStore((s) => s.customerPhone);
export const useCustomerAddress = () => useBillingStore((s) => s.customerAddress);
export const useCustomerEmail = () => useBillingStore((s) => s.customerEmail);
export const useSalesSource = () => useBillingStore((s) => s.salesSource);
export const usePaymentMethod = () => useBillingStore((s) => s.paymentMethod);
export const useBillItems = () => useBillingStore((s) => s.items);
export const useGSTEnabled = () => useBillingStore((s) => s.gstEnabled);
export const useGSTType = () => useBillingStore((s) => s.gstType);
export const useGSTRate = () => useBillingStore((s) => s.gstRate);
export const useCGSTRate = () => useBillingStore((s) => s.cgstRate);
export const useSGSTRate = () => useBillingStore((s) => s.sgstRate);
export const useGSTNumber = () => useBillingStore((s) => s.gstNumber);
export const useAppliedCoupon = () => useBillingStore((s) => s.appliedCoupon);

export const useSubtotal = () =>
  useBillingStore((s) => {
    const itemsTotal = s.items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0);
    return itemsTotal > 0 ? itemsTotal : s.manualAmount || 0;
  });

export const useBillDiscount = () =>
  useBillingStore((s) => {
    const itemsTotal = s.items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0);
    const subtotal = itemsTotal > 0 ? itemsTotal : s.manualAmount || 0;
    if (!s.appliedCoupon) return s.discount;
    if (s.appliedCoupon.discountType === "percentage") {
      return (subtotal * s.appliedCoupon.discountValue) / 100;
    } else {
      return Math.min(subtotal, s.appliedCoupon.discountValue);
    }
  });

export const useCGSTAmount = () =>
  useBillingStore((s) => {
    if (!s.gstEnabled) return 0;
    const itemsTotal = s.items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0);
    const subtotal = itemsTotal > 0 ? itemsTotal : s.manualAmount || 0;
    const discount = s.appliedCoupon
      ? s.appliedCoupon.discountType === "percentage"
        ? (subtotal * s.appliedCoupon.discountValue) / 100
        : Math.min(subtotal, s.appliedCoupon.discountValue)
      : s.discount;
    const taxable = Math.max(0, subtotal - discount);
    if (s.gstType === "cgst_sgst") {
      const rate = s.cgstRate ?? (s.gstRate ? s.gstRate / 2 : 0);
      return (taxable * rate) / 100;
    }
    return 0;
  });

export const useSGSTAmount = () =>
  useBillingStore((s) => {
    if (!s.gstEnabled) return 0;
    const itemsTotal = s.items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0);
    const subtotal = itemsTotal > 0 ? itemsTotal : s.manualAmount || 0;
    const discount = s.appliedCoupon
      ? s.appliedCoupon.discountType === "percentage"
        ? (subtotal * s.appliedCoupon.discountValue) / 100
        : Math.min(subtotal, s.appliedCoupon.discountValue)
      : s.discount;
    const taxable = Math.max(0, subtotal - discount);
    if (s.gstType === "cgst_sgst") {
      const rate = s.sgstRate ?? (s.gstRate ? s.gstRate / 2 : 0);
      return (taxable * rate) / 100;
    }
    return 0;
  });

export const useTaxAmount = () =>
  useBillingStore((s) => {
    if (!s.gstEnabled) return 0;
    const itemsTotal = s.items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0);
    const subtotal = itemsTotal > 0 ? itemsTotal : s.manualAmount || 0;
    const discount = s.appliedCoupon
      ? s.appliedCoupon.discountType === "percentage"
        ? (subtotal * s.appliedCoupon.discountValue) / 100
        : Math.min(subtotal, s.appliedCoupon.discountValue)
      : s.discount;
    const taxable = Math.max(0, subtotal - discount);
    if (s.gstType === "cgst_sgst") {
      const cgst = s.cgstRate ?? (s.gstRate ? s.gstRate / 2 : 0);
      const sgst = s.sgstRate ?? (s.gstRate ? s.gstRate / 2 : 0);
      return (taxable * (cgst + sgst)) / 100;
    }
    return s.gstRate ? (taxable * s.gstRate) / 100 : 0;
  });

export const useGrandTotal = () =>
  useBillingStore((s) => {
    const itemsTotal = s.items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0);
    const subtotal = itemsTotal > 0 ? itemsTotal : s.manualAmount || 0;
    const discount = s.appliedCoupon
      ? s.appliedCoupon.discountType === "percentage"
        ? (subtotal * s.appliedCoupon.discountValue) / 100
        : Math.min(subtotal, s.appliedCoupon.discountValue)
      : s.discount;
    const taxable = Math.max(0, subtotal - discount);
    let tax = 0;
    if (s.gstEnabled) {
      if (s.gstType === "cgst_sgst") {
        const cgst = s.cgstRate ?? (s.gstRate ? s.gstRate / 2 : 0);
        const sgst = s.sgstRate ?? (s.gstRate ? s.gstRate / 2 : 0);
        tax = (taxable * (cgst + sgst)) / 100;
      } else if (s.gstRate) {
        tax = (taxable * s.gstRate) / 100;
      }
    }
    return taxable + tax;
  });

export const useBillingActions = () =>
  useBillingStore(useShallow((s) => ({
    setBillingMode: s.setBillingMode,
    setManualAmount: s.setManualAmount,
    setManualNotes: s.setManualNotes,
    addManualItem: s.addManualItem,
    setCustomer: s.setCustomer,
    setSalesSource: s.setSalesSource,
    setPaymentMethod: s.setPaymentMethod,
    addItem: s.addItem,
    removeItem: s.removeItem,
    updateQty: s.updateQty,
    toggleGST: s.toggleGST,
    setGSTType: s.setGSTType,
    setGSTRate: s.setGSTRate,
    setCGSTRate: s.setCGSTRate,
    setSGSTRate: s.setSGSTRate,
    setGSTNumber: s.setGSTNumber,
    setDiscount: s.setDiscount,
    setAppliedCoupon: s.setAppliedCoupon,
    clearBill: s.clearBill,
    toggleItemHsnCode: s.toggleItemHsnCode,
  })));


