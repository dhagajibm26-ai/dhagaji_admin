"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PenLine, Package, Plus } from "lucide-react";
import { useFinishedStock, lookupBarcode } from "@/hooks/useFinishedStock";
import { BarcodeScanner } from "@/components/modules/finished-stock";
import { useUIStore } from "@/stores/useUIStore";
import {
  useBillingStore,
  useBillingMode,
  useManualAmount,
  useManualNotes,
  useBillItems,
  useCustomerId,
  useCustomerName,
  useCustomerPhone,
  useCustomerAddress,
  useCustomerEmail,
  useSalesSource,
  usePaymentMethod,
  useGSTEnabled,
  useGSTType,
  useGSTRate,
  useCGSTRate,
  useSGSTRate,
  useCGSTAmount,
  useSGSTAmount,
  useGSTNumber,
  useAppliedCoupon,
  useBillDiscount,
  useSubtotal,
  useTaxAmount,
  useGrandTotal,
  useBillingActions,
} from "@/stores/useBillingStore";
import { useCreateBill } from "@/hooks/useBilling";
import { useCustomers } from "@/hooks/useCustomers";
import { useCoupons } from "@/hooks/useCoupons";
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
  const [isCustomCustomer, setIsCustomCustomer] = useState(false);
  const [saveToDirectory, setSaveToDirectory] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Store values ──────────────────────────────────────────────────────────
  const customerId = useCustomerId();
  const customerName = useCustomerName();
  const customerPhone = useCustomerPhone();
  const customerAddress = useCustomerAddress();
  const customerEmail = useCustomerEmail();
  const salesSource = useSalesSource();
  const paymentMethod = usePaymentMethod();
  const items = useBillItems();
  const gstEnabled = useGSTEnabled();
  const gstType = useGSTType();
  const gstRate = useGSTRate();
  const cgstRate = useCGSTRate();
  const sgstRate = useSGSTRate();
  const cgstAmount = useCGSTAmount();
  const sgstAmount = useSGSTAmount();
  const gstNumber = useGSTNumber();
  const appliedCoupon = useAppliedCoupon();
  const discount = useBillDiscount();
  const subtotal = useSubtotal();
  const taxAmount = useTaxAmount();
  const grandTotal = useGrandTotal();
  const actions = useBillingActions();
  const billingMode = useBillingMode();
  const manualAmount = useManualAmount();
  const manualNotes = useManualNotes();

  // ─── Manual item state ───────────────────────────────────────────────────
  const [showManualItemForm, setShowManualItemForm] = useState(false);
  const [manualItemName, setManualItemName] = useState("");
  const [manualItemPrice, setManualItemPrice] = useState("");
  const [manualItemQty, setManualItemQty] = useState("1");
  const [manualItemHsn, setManualItemHsn] = useState("");

  // ─── Searchable customer state ────────────────────────────────────────────
  const { data: customers = [] } = useCustomers();
  const [custSearch, setCustSearch] = useState("");
  const [custDropdownOpen, setCustDropdownOpen] = useState(false);
  const custDropdownRef = useRef<HTMLDivElement>(null);

  // ─── Coupons query state ──────────────────────────────────────────────────
  const { data: coupons = [] } = useCoupons();
  const [couponInputText, setCouponInputText] = useState("");

  // ─── TanStack Query / mutations ────────────────────────────────────────────
  const { data: allProducts = [] } = useFinishedStock();
  const { mutateAsync: createBill, isPending } = useCreateBill();
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 10);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobileNumbers.some((num) => num.includes(q))
    );
  }, [customers, custSearch]);

  // Click outside to close customer dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        custDropdownRef.current &&
        !custDropdownRef.current.contains(e.target as Node)
      ) {
        setCustDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const handleApplyCoupon = useCallback(() => {
    const code = couponInputText.trim().toUpperCase();
    if (!code) {
      addToast({ type: "error", message: "Enter a coupon code" });
      return;
    }

    const coupon = coupons.find((c) => c.code === code);
    if (!coupon) {
      addToast({ type: "error", message: "Coupon code not found" });
      return;
    }

    if (!coupon.isActive) {
      addToast({ type: "error", message: "This coupon is inactive" });
      return;
    }

    // Check expiry
    if (!coupon.neverExpires) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const start = coupon.startDate ? new Date(coupon.startDate) : null;
      const end = coupon.endDate ? new Date(coupon.endDate) : null;

      if (start && end) {
        const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

        if (today < startDateOnly || today > endDateOnly) {
          addToast({ type: "error", message: "This coupon has expired or is not active yet" });
          return;
        }
      }
    }

    // Check customer assignment
    if (coupon.assignedType === "customer") {
      const allowedCustomerIds = Array.isArray(coupon.customerIds)
        ? coupon.customerIds.map((cust: any) =>
          typeof cust === "object" && cust !== null ? cust._id : cust
        )
        : [];

      if (!customerId) {
        addToast({ type: "error", message: "Please select a customer first to apply this coupon" });
        return;
      }

      if (!allowedCustomerIds.includes(customerId)) {
        addToast({ type: "error", message: "This coupon is not valid for the selected customer" });
        return;
      }
    }

    // Apply Coupon
    actions.setAppliedCoupon({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    });
    addToast({ type: "success", message: `Coupon "${coupon.code}" applied!` });
  }, [couponInputText, coupons, customerId, actions, addToast]);

  const handleAddManualItem = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualItemName.trim()) {
        addToast({ type: "error", message: "Item description required" });
        return;
      }
      const price = Number(manualItemPrice);
      if (isNaN(price) || price < 0) {
        addToast({ type: "error", message: "Enter a valid price" });
        return;
      }
      const qty = Number(manualItemQty) || 1;
      actions.addManualItem({
        designName: manualItemName.trim(),
        sellingPrice: price,
        qty,
        hsnCode: manualItemHsn.trim() || undefined,
      });
      setManualItemName("");
      setManualItemPrice("");
      setManualItemQty("1");
      setManualItemHsn("");
      setShowManualItemForm(false);
      addToast({ type: "success", message: `Added "${manualItemName.trim()}"` });
    },
    [manualItemName, manualItemPrice, manualItemQty, manualItemHsn, actions, addToast]
  );

  const handleSave = useCallback(async () => {
    if (!isCustomCustomer && !customerId) {
      addToast({ type: "error", message: "Customer selection is required" });
      return;
    }
    if (isCustomCustomer && !customerName.trim()) {
      addToast({ type: "error", message: "Customer name is required" });
      return;
    }
    if (billingMode === "product" && items.length === 0) {
      addToast({ type: "error", message: "Add at least one product item" });
      return;
    }
    if (
      billingMode === "manual" &&
      items.length === 0 &&
      (!manualAmount || manualAmount <= 0)
    ) {
      addToast({ type: "error", message: "Enter a bill amount or add at least one line item" });
      return;
    }
    if (gstEnabled) {
      if (gstType === "cgst_sgst") {
        if (cgstRate === null || isNaN(cgstRate) || sgstRate === null || isNaN(sgstRate)) {
          addToast({ type: "error", message: "Enter valid CGST and SGST rates" });
          return;
        }
      } else if (gstRate === null || isNaN(gstRate)) {
        addToast({ type: "error", message: "Enter a valid GST rate" });
        return;
      }
    }

    if (isCustomCustomer && saveToDirectory) {
      try {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: customerName.trim(),
            mobileNumbers: [customerPhone.trim() || "—"],
            address: customerAddress.trim() || undefined,
            email: customerEmail.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          queryClient.invalidateQueries({ queryKey: ["customers"] });
          addToast({ type: "success", message: `Customer "${customerName}" registered to directory` });
        }
      } catch (err) {
        console.error("Auto-customer creation error:", err);
      }
    }

    const payload: BillInput = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      salesSource,
      paymentMethod,
      gstEnabled,
      gstType: gstEnabled ? gstType : undefined,
      gstRate: gstEnabled
        ? gstType === "cgst_sgst"
          ? (cgstRate ?? 0) + (sgstRate ?? 0)
          : gstRate
        : null,
      cgstRate: gstEnabled && gstType === "cgst_sgst" ? cgstRate : null,
      sgstRate: gstEnabled && gstType === "cgst_sgst" ? sgstRate : null,
      gstNumber: gstEnabled && gstNumber ? gstNumber : undefined,
      billDate: new Date().toISOString(),
      billDiscount: discount > 0 ? discount : undefined,
      manualAmount: billingMode === "manual" && items.length === 0 ? manualAmount : undefined,
      manualNotes: billingMode === "manual" && manualNotes ? manualNotes : undefined,
      items: items.map((item) => ({
        finishedProductId: item.finishedProductId,
        designName: item.designName,
        barcodeId: item.barcodeId,
        qty: item.qty,
        sellingPrice: item.sellingPrice,
        discount: 0,
        lineTotal: item.sellingPrice * item.qty,
        hsnCodes: item.hsnCodes,
      })),
    };

    try {
      const bill = await createBill(payload);
      actions.clearBill();
      setIsCustomCustomer(false);
      setCouponInputText("");
      setShowManualItemForm(false);
      setManualItemName("");
      setManualItemPrice("");
      setManualItemQty("1");
      setManualItemHsn("");
      onBillSaved(bill);
    } catch {
      // error handled by mutation onError
    }
  }, [
    customerId,
    isCustomCustomer,
    saveToDirectory,
    customerName,
    customerPhone,
    customerAddress,
    customerEmail,
    salesSource,
    paymentMethod,
    gstEnabled,
    gstRate,
    gstNumber,
    discount,
    items,
    billingMode,
    manualAmount,
    manualNotes,
    createBill,
    actions,
    onBillSaved,
    addToast,
    queryClient,
  ]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ── Section 1: Customer + Source ─────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-3">
        {/* Customer Search / Selected Customer / Custom Customer Inputs */}
        <div className="relative" ref={custDropdownRef}>
          {isCustomCustomer ? (
            <div className="space-y-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#D32F2F] tracking-wide uppercase">Custom / One-Time Customer</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCustomer(false);
                    actions.setCustomer(null, "", "", "", "");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer font-bold"
                >
                  Select from Directory
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer Name *"
                  value={customerName}
                  onChange={(e) => actions.setCustomer(null, e.target.value, customerPhone, customerAddress, customerEmail)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={customerPhone}
                  onChange={(e) => actions.setCustomer(null, customerName, e.target.value, customerAddress, customerEmail)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={customerEmail}
                  onChange={(e) => actions.setCustomer(null, customerName, customerPhone, customerAddress, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={customerAddress}
                  onChange={(e) => actions.setCustomer(null, customerName, customerPhone, e.target.value, customerEmail)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="save-to-directory"
                  checked={saveToDirectory}
                  onChange={(e) => setSaveToDirectory(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-[#1b4332] focus:ring-[#1b4332] accent-[#1b4332] cursor-pointer"
                />
                <label htmlFor="save-to-directory" className="text-xs text-slate-600 font-medium select-none cursor-pointer">
                  Save customer to Directory
                </label>
              </div>
            </div>
          ) : customerId ? (
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-sm">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">{customerName}</span>
                <span className="text-xs text-slate-500">
                  {customerPhone ? `Mobile: ${customerPhone}` : "No phone number"}
                  {customerEmail ? ` • Email: ${customerEmail}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  actions.setCustomer(null, "", "", "", "");
                  if (appliedCoupon) {
                    actions.setAppliedCoupon(null);
                    setCouponInputText("");
                    addToast({ type: "warning", message: "Coupon removed because customer changed" });
                  }
                }}
                className="text-xs font-semibold text-[#D32F2F] hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search & select customer... *"
                  value={custSearch}
                  onFocus={() => setCustDropdownOpen(true)}
                  onChange={(e) => {
                    setCustSearch(e.target.value);
                    setCustDropdownOpen(true);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
                />
                {custDropdownOpen && (
                  <div className="absolute z-10 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                    {filteredCustomers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500 italic">
                        No customers found
                      </div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => {
                            actions.setCustomer(c._id, c.name, c.mobileNumbers[0] || "", c.address || "", c.email || "");
                            setCustSearch("");
                            setCustDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex flex-col cursor-pointer"
                        >
                          <span className="font-semibold text-slate-800">{c.name}</span>
                          <span className="text-xs text-slate-400">
                            {c.mobileNumbers.join(", ")}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCustomer(true);
                    actions.setCustomer(null, "", "", "", "");
                  }}
                  className="text-xs text-[#D32F2F] hover:text-[#B71C1C] font-black underline cursor-pointer"
                >
                  + Use Custom / One-Time Customer
                </button>
              </div>
            </div>
          )}
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

      {/* ── Section 2: Flow Switch + Items / Products ──────────────────── */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {/* Flow selection tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => actions.setBillingMode("manual")}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
              billingMode === "manual"
                ? "bg-white text-[#D32F2F] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <PenLine size={13} />
            <span>Create Bill Manually</span>
          </button>
          <button
            type="button"
            onClick={() => actions.setBillingMode("product")}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
              billingMode === "product"
                ? "bg-white text-[#D32F2F] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Package size={13} />
            <span>Add Products</span>
          </button>
        </div>

        {/* ── Flow A: Manual Bill Section ── */}
        {billingMode === "manual" && (
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Manual Billing</p>
                <p className="text-[11px] text-slate-500">No inventory product required. Enter amount or custom items.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualItemForm(!showManualItemForm)}
                className="text-xs font-bold text-[#D32F2F] hover:text-[#B71C1C] flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100/70 px-2.5 py-1 rounded-lg border border-red-100 transition-colors"
              >
                <Plus size={13} />
                {showManualItemForm ? "Close Item Form" : "+ Add Custom Item"}
              </button>
            </div>

            {/* Direct Bill Amount and Notes (when no items) */}
            {items.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Bill Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 1500"
                      value={manualAmount || ""}
                      onChange={(e) => actions.setManualAmount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm font-semibold text-[#1A1A1A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Description / Service (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Custom tailoring / Order"
                    value={manualNotes}
                    onChange={(e) => actions.setManualNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]"
                  />
                </div>
              </div>
            )}

            {/* Expandable Manual Line Item Form */}
            {showManualItemForm && (
              <form
                onSubmit={handleAddManualItem}
                className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm space-y-2.5 animate-in fade-in duration-150"
              >
                <div className="text-xs font-bold text-slate-700">Add Custom Line Item</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Item Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Silk Thread Bangles Set"
                      value={manualItemName}
                      onChange={(e) => setManualItemName(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#D32F2F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Price (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="0"
                      value={manualItemPrice}
                      onChange={(e) => setManualItemPrice(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#D32F2F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Qty *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={manualItemQty}
                      onChange={(e) => setManualItemQty(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#D32F2F]"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <input
                    type="text"
                    placeholder="Optional HSN code (e.g. 6217)"
                    value={manualItemHsn}
                    onChange={(e) => setManualItemHsn(e.target.value)}
                    className="w-48 rounded-md border border-slate-300 px-2 py-1 text-[11px] focus:ring-1 focus:ring-[#D32F2F]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualItemForm(false)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── Flow B: Product-Based Scan & Search row ── */}
        {billingMode === "product" && (
          <div className="flex gap-2">
            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] text-white px-4 py-2.5 text-sm font-medium active:bg-[#333] flex-shrink-0 cursor-pointer"
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
        )}

        {/* Items list */}
        {items.length === 0 ? (
          billingMode === "manual" ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <PenLine className="w-8 h-8 mb-2 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Manual Billing Mode</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {manualAmount > 0
                  ? `Direct bill amount of ${formatINR(manualAmount)} set.`
                  : "Enter a bill amount above or add custom line items."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
              <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <p className="text-sm">No items added yet</p>
              <p className="text-xs mt-0.5">Scan a barcode or search above</p>
            </div>
          )
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const overStock = item.qty >= item.maxStock;
              return (
                <li
                  key={item.barcodeId}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{item.designName}</p>
                      <p className="text-xs text-gray-500">
                        {item.designCode && item.designCode !== "MANUAL"
                          ? `${item.designCode} · ${item.size}`
                          : "Manual Line Item"}
                      </p>
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
                  </div>

                  {item.availableHsnCodes && item.availableHsnCodes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-gray-200/50">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                        Invoiced HSN:
                      </span>
                      {item.availableHsnCodes.map((code) => {
                        const isSelected = item.hsnCodes?.includes(code);
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => actions.toggleItemHsnCode(item.barcodeId, code)}
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all active:scale-95 cursor-pointer",
                              isSelected
                                ? "bg-red-50 border-[#D32F2F]/30 text-[#D32F2F] font-semibold"
                                : "bg-white border-gray-200 text-gray-400"
                            )}
                          >
                            {code}
                          </button>
                        );
                      })}
                    </div>
                  )}
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

          {/* Coupon */}
          <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-2">
            <div className="flex justify-between items-center text-gray-600">
              <span>Apply Coupon</span>
              {appliedCoupon ? (
                <div className="flex items-center gap-1">
                  <span className="bg-[#D32F2F]/10 border border-[#D32F2F]/20 text-[#D32F2F] text-xs font-bold px-2 py-0.5 rounded-lg">
                    {appliedCoupon.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      actions.setAppliedCoupon(null);
                      setCouponInputText("");
                      addToast({ type: "success", message: "Coupon removed" });
                    }}
                    className="text-xs text-gray-400 hover:text-red-500 font-bold px-1 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="ENTER CODE"
                    value={couponInputText}
                    onChange={(e) => setCouponInputText(e.target.value.toUpperCase())}
                    className="w-28 rounded border border-gray-300 px-2 py-0.5 text-xs text-[#1A1A1A] uppercase focus:outline-none focus:ring-1 focus:ring-[#D32F2F]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-[11px] font-bold px-2.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* GST controls */}
          <div className="border-t border-gray-100 pt-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Apply GST</span>
              <button
                type="button"
                onClick={actions.toggleGST}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:ring-offset-2",
                  gstEnabled ? "bg-red-600" : "bg-gray-200"
                )}
                role="switch"
                aria-checked={gstEnabled}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    gstEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {gstEnabled && (
              <div className="space-y-3 mt-2 bg-slate-50/50 p-3 rounded-xl border border-slate-200 transition-all duration-200 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* GST Tax Type Switcher */}
                <div className="grid grid-cols-2 p-0.5 bg-slate-200/70 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => actions.setGSTType("cgst_sgst")}
                    className={cn(
                      "py-1.5 px-2 rounded-md transition-all cursor-pointer text-center",
                      gstType === "cgst_sgst"
                        ? "bg-white text-[#D32F2F] shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    CGST + SGST (Intra-State)
                  </button>
                  <button
                    type="button"
                    onClick={() => actions.setGSTType("igst")}
                    className={cn(
                      "py-1.5 px-2 rounded-md transition-all cursor-pointer text-center",
                      gstType === "igst"
                        ? "bg-white text-[#D32F2F] shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    IGST (Inter-State)
                  </button>
                </div>

                {/* Rates input */}
                {gstType === "cgst_sgst" ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        CGST Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.0"
                          value={cgstRate ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : Number(e.target.value);
                            actions.setCGSTRate(val);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white pl-2.5 pr-7 py-2 text-sm text-[#1A1A1A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        SGST Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.0"
                          value={sgstRate ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : Number(e.target.value);
                            actions.setSGSTRate(val);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white pl-2.5 pr-7 py-2 text-sm text-[#1A1A1A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      IGST Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.0"
                        value={gstRate ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          actions.setGSTRate(val);
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white pl-2.5 pr-7 py-2 text-sm text-[#1A1A1A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">
                        %
                      </span>
                    </div>
                  </div>
                )}

                {/* GSTIN input */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="22AAAAA1111A1Z1"
                    value={gstNumber}
                    onChange={(e) => actions.setGSTNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-[#1A1A1A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent uppercase"
                  />
                </div>

                {/* Quick select pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Quick select:
                  </span>
                  {[5, 12, 18].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => actions.setGSTRate(rate)}
                      className={cn(
                        "text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150 active:scale-95 cursor-pointer",
                        (gstType === "cgst_sgst" ? ((cgstRate ?? 0) + (sgstRate ?? 0) === rate) : gstRate === rate)
                          ? "bg-red-50 border-red-500 text-red-700 shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      {rate}% {gstType === "cgst_sgst" ? `(${rate / 2}% + ${rate / 2}%)` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {gstEnabled && taxAmount > 0 && (
            <div className="space-y-0.5 pt-1 border-t border-slate-100 text-xs">
              {gstType === "cgst_sgst" ? (
                <>
                  <div className="flex justify-between text-blue-700">
                    <span>CGST ({cgstRate ?? (gstRate ? gstRate / 2 : 0)}%)</span>
                    <span>{formatINR(cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-blue-700">
                    <span>SGST ({sgstRate ?? (gstRate ? gstRate / 2 : 0)}%)</span>
                    <span>{formatINR(sgstAmount)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-blue-700">
                  <span>IGST ({gstRate}%)</span>
                  <span>{formatINR(taxAmount)}</span>
                </div>
              )}
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
          disabled={
            isPending ||
            (billingMode === "product"
              ? items.length === 0
              : items.length === 0 && (!manualAmount || manualAmount <= 0))
          }
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
