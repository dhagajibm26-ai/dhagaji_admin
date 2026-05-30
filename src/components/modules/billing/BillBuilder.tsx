"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useFinishedStock, lookupBarcode } from "@/hooks/useFinishedStock";
import { BarcodeScanner } from "@/components/modules/finished-stock";
import { useUIStore } from "@/stores/useUIStore";
import {
  useBillingStore,
  useBillItems,
  useCustomerName,
  useCustomerPhone,
  useSalesSource,
  usePaymentMethod,
  useGSTEnabled,
  useGSTRate,
  useGSTNumber,
  useBillDiscount,
  useSubtotal,
  useTaxAmount,
  useGrandTotal,
  useBillingActions,
} from "@/stores/useBillingStore";
import { useCreateBill } from "@/hooks/useBilling";
import { Button } from "@/components/ui/Button";
import type { IFinishedProduct, SalesSource, PaymentMethod, BillInput } from "@/types";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCES: { value: SalesSource; label: string }[] = [
  { value: "Offline", label: "Shop" },
  { value: "Instagram", label: "Instagram" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Exhibition", label: "Exhibition" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "Cash", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "Card", label: "Card" },
];

const GST_RATES = [5, 12, 18] as const;

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BillBuilderProps {
  onBillSaved: (bill: import("@/types").IBill) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BillBuilder({ onBillSaved }: BillBuilderProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Store values ──────────────────────────────────────────────────────────
  const customerName = useCustomerName();
  const customerPhone = useCustomerPhone();
  const salesSource = useSalesSource();
  const paymentMethod = usePaymentMethod();
  const items = useBillItems();
  const gstEnabled = useGSTEnabled();
  const gstRate = useGSTRate();
  const gstNumber = useGSTNumber();
  const discount = useBillDiscount();
  const subtotal = useSubtotal();
  const taxAmount = useTaxAmount();
  const grandTotal = useGrandTotal();
  const actions = useBillingActions();

  // ─── TanStack Query / mutations ────────────────────────────────────────────
  const { data: allProducts = [] } = useFinishedStock();
  const { mutateAsync: createBill, isPending } = useCreateBill();
  const addToast = useUIStore((s) => s.addToast);

  // ─── Product search (instant — filters cached data) ───────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return allProducts
      .filter(
        (p) =>
          p.readyStock > 0 &&
          (p.designName.toLowerCase().includes(q) ||
            p.designCode.toLowerCase().includes(q) ||
            p.barcodeId.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [allProducts, search]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectProduct = useCallback(
    (product: IFinishedProduct) => {
      actions.addItem(product, 1);
      setSearch("");
      setShowDropdown(false);
      addToast({ type: "success", message: `Added ${product.designName}` });
    },
    [actions, addToast]
  );

  const handleScan = useCallback(
    async (barcodeId: string) => {
      setScannerOpen(false);
      try {
        const product = await lookupBarcode(barcodeId);
        if (product.readyStock === 0) {
          addToast({ type: "error", message: `${product.designName} is out of stock` });
          return;
        }
        actions.addItem(product, 1);
        addToast({ type: "success", message: `Added ${product.designName}` });
      } catch {
        addToast({ type: "error", message: "Product not found for barcode" });
      }
    },
    [actions, addToast]
  );

  const handleSave = useCallback(async () => {
    if (!customerName.trim()) {
      addToast({ type: "error", message: "Customer name is required" });
      return;
    }
    if (items.length === 0) {
      addToast({ type: "error", message: "Add at least one item" });
      return;
    }
    if (gstEnabled && !gstRate) {
      addToast({ type: "error", message: "Select a GST rate" });
      return;
    }

    const payload: BillInput = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      salesSource,
      paymentMethod,
      gstEnabled,
      gstRate: gstEnabled ? gstRate : null,
      gstNumber: gstEnabled && gstNumber ? gstNumber : undefined,
      billDate: new Date().toISOString(),
      billDiscount: discount > 0 ? discount : undefined,
      items: items.map((item) => ({
        finishedProductId: item.finishedProductId,
        designName: item.designName,
        barcodeId: item.barcodeId,
        qty: item.qty,
        sellingPrice: item.sellingPrice,
        discount: 0,
        lineTotal: item.sellingPrice * item.qty,
      })),
    };

    try {
      const bill = await createBill(payload);
      actions.clearBill();
      onBillSaved(bill);
    } catch {
      // error handled by mutation onError
    }
  }, [
    customerName,
    customerPhone,
    salesSource,
    paymentMethod,
    gstEnabled,
    gstRate,
    gstNumber,
    discount,
    items,
    createBill,
    actions,
    onBillSaved,
    addToast,
  ]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ── Section 1: Customer + Source ─────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-3">
        {/* Customer inputs */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Customer name *"
            value={customerName}
            onChange={(e) => actions.setCustomer(e.target.value, customerPhone)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={customerPhone}
            onChange={(e) => actions.setCustomer(customerName, e.target.value)}
            className="w-36 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
          />
        </div>

        {/* Sales source selector */}
        <div className="grid grid-cols-4 gap-1.5">
          {SOURCES.map((src) => (
            <button
              key={src.value}
              onClick={() => actions.setSalesSource(src.value)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg py-2 px-1 text-xs font-medium border transition-colors",
                salesSource === src.value
                  ? "bg-[#D32F2F] border-[#D32F2F] text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-[#D32F2F] hover:text-[#D32F2F]"
              )}
            >
              <span className="leading-tight">{src.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 2: Scan + Search + Items ─────────────────────────────── */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {/* Scan + Search row */}
        <div className="flex gap-2">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] text-white px-4 py-2.5 text-sm font-medium active:bg-[#333] flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12v.01M4 16v.01M4 20v.01M4 4h4v4H4V4zm12 0h4v4h-4V4zm-12 12h4v4H4v-4z"
              />
            </svg>
            Scan
          </button>

          <div className="relative flex-1">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search product by name or code…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
            />
            {/* Search dropdown */}
            {showDropdown && filtered.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
              >
                {filtered.map((p) => (
                  <button
                    key={p._id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectProduct(p);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{p.designName}</p>
                        <p className="text-xs text-gray-500">{p.designCode} · Size {p.size}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-semibold text-[#D32F2F]">
                          {formatINR(p.sellingPrice)}
                        </p>
                        <p className="text-xs text-gray-400">{p.readyStock} left</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items list */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="text-sm">No items added yet</p>
            <p className="text-xs mt-0.5">Scan a barcode or search above</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const overStock = item.qty >= item.maxStock;
              return (
                <li
                  key={item.barcodeId}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{item.designName}</p>
                    <p className="text-xs text-gray-500">{item.designCode} · {item.size}</p>
                    {overStock && (
                      <p className="text-xs text-amber-600 font-medium">Max stock reached</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => actions.updateQty(item.barcodeId, item.qty - 1)}
                      disabled={item.qty <= 1}
                      className="w-7 h-7 rounded-full bg-gray-200 text-[#1A1A1A] text-sm font-bold flex items-center justify-center disabled:opacity-30 active:bg-gray-300"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                    <button
                      onClick={() => actions.updateQty(item.barcodeId, item.qty + 1)}
                      disabled={item.qty >= item.maxStock}
                      className="w-7 h-7 rounded-full bg-gray-200 text-[#1A1A1A] text-sm font-bold flex items-center justify-center disabled:opacity-30 active:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-[#1A1A1A] w-20 text-right flex-shrink-0">
                    {formatINR(item.sellingPrice * item.qty)}
                  </span>
                  <button
                    onClick={() => actions.removeItem(item.barcodeId)}
                    className="w-7 h-7 rounded-full text-gray-400 hover:text-[#D32F2F] hover:bg-red-50 flex items-center justify-center flex-shrink-0 transition-colors"
                    aria-label="Remove item"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Section 3: Sticky totals + Save ──────────────────────────────── */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white px-4 pt-3 pb-4 space-y-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium">{formatINR(subtotal)}</span>
          </div>

          {/* Discount */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-600">Discount</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs">₹</span>
              <input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => actions.setDiscount(Number(e.target.value))}
                placeholder="0"
                className="w-20 text-right rounded border border-gray-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#D32F2F]"
              />
            </div>
          </div>

          {/* GST controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={actions.toggleGST}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                gstEnabled
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-300 text-gray-600 hover:border-blue-400"
              )}
            >
              GST {gstEnabled ? "ON" : "OFF"}
            </button>
            {gstEnabled && (
              <>
                {GST_RATES.map((r) => (
                  <button
                    key={r}
                    onClick={() => actions.setGSTRate(r)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
                      gstRate === r
                        ? "bg-blue-100 border-blue-500 text-blue-700"
                        : "bg-white border-gray-300 text-gray-600 hover:border-blue-400"
                    )}
                  >
                    {r}%
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="GSTIN"
                  value={gstNumber}
                  onChange={(e) => actions.setGSTNumber(e.target.value)}
                  className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </>
            )}
          </div>

          {gstEnabled && taxAmount > 0 && (
            <div className="flex justify-between text-blue-700 text-xs">
              <span>GST ({gstRate}%)</span>
              <span>{formatINR(taxAmount)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-1">
            <span className="font-bold text-base text-[#1A1A1A]">GRAND TOTAL</span>
            <span className="font-bold text-xl text-[#D32F2F]">{formatINR(grandTotal)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="flex gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => actions.setPaymentMethod(m.value)}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium border transition-colors",
                paymentMethod === m.value
                  ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
                  : "bg-white border-gray-300 text-gray-600 hover:border-[#1A1A1A]"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Save button */}
        <Button
          variant="primary"
          size="lg"
          className="w-full text-base"
          onClick={handleSave}
          isLoading={isPending}
          disabled={isPending || items.length === 0}
        >
          {isPending ? "Saving…" : "Save Bill"}
        </Button>
      </div>

      {/* ── Barcode scanner overlay ───────────────────────────────────────── */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}
