"use client";

import { useState } from "react";
import { Search, Plus, Ticket, Edit2, Trash2, Globe, User, ToggleLeft, ToggleRight, Copy, Check } from "lucide-react";
import { useCoupons, useDeleteCoupon, useUpdateCoupon } from "@/hooks/useCoupons";
import { useIsOwner } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { AddCouponModal } from "./AddCouponModal";
import type { ICoupon } from "@/types";

export function CouponsPageClient() {
  const isOwner = useIsOwner();
  const [search, setSearch] = useState("");
  const [addCouponOpen, setAddCouponOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<ICoupon | null>(null);

  const [deleteCouponObj, setDeleteCouponObj] = useState<ICoupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useCoupons();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const filtered = coupons.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.discountType.toLowerCase().includes(search.toLowerCase()) ||
    (Array.isArray(c.customerIds) &&
      c.customerIds.some(
        (cust: any) =>
          typeof cust === "object" &&
          cust !== null &&
          cust.name.toLowerCase().includes(search.toLowerCase())
      ))
  );

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.isActive).length;
  const customerSpecificCoupons = coupons.filter((c) => c.assignedType === "customer").length;

  function handleToggleStatus(coupon: ICoupon) {
    updateCoupon.mutate({
      id: coupon._id,
      data: { isActive: !coupon.isActive },
    });
  }

  function handleCopyCode(code: string) {
    void navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Coupon Codes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create and manage general or customer-specific discount coupons
          </p>
        </div>
        <div>
          {isOwner && (
            <Button size="sm" onClick={() => setAddCouponOpen(true)}>
              <Plus size={14} className="mr-1" />
              Add Coupon
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#D32F2F]">
            <Ticket size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Coupons</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCoupons}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <ToggleRight size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Coupons</p>
            <p className="text-2xl font-black text-green-700 mt-0.5">{activeCoupons}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <User size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Customer-Specific</p>
            <p className="text-2xl font-black text-blue-700 mt-0.5">{customerSpecificCoupons}</p>
          </div>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search coupons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F] placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* List / Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-100 rounded-2xl shadow-sm">
          <Ticket size={40} className="text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">
            {search ? "No coupons match your search." : "No coupons created yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#D32F2F] border-b border-slate-100 text-left text-white">
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-white">Coupon Code</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-white">Discount</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-white">Assignment</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-white">Validity / Expiry</th>
                <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-white">Status</th>
                {isOwner && <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-white">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c) => {
                const assignedCustomers = Array.isArray(c.customerIds)
                  ? c.customerIds.map((cust: any) =>
                      typeof cust === "object" && cust !== null ? cust : { name: "Unknown", mobileNumbers: [] }
                    )
                  : [];

                // Expiry calculations
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const start = c.startDate ? new Date(c.startDate) : null;
                const end = c.endDate ? new Date(c.endDate) : null;
                const startDateOnly = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()) : null;
                const endDateOnly = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()) : null;
                const isExpired = endDateOnly ? today > endDateOnly : false;
                const isNotYetActive = startDateOnly ? today < startDateOnly : false;

                const formatDate = (date: Date) => {
                  return date.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                };

                return (
                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-black tracking-wide text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-[#D32F2F]/10 text-[#D32F2F] border border-[#D32F2F]/20 px-2 py-1 rounded-lg text-xs font-black">
                          {c.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(c.code)}
                          className="text-slate-400 hover:text-[#D32F2F] p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Copy Coupon Code"
                        >
                          {copiedCode === c.code ? (
                            <Check size={12} className="text-green-600 animate-in zoom-in duration-200" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {c.discountType === "percentage" ? `${c.discountValue}% Off` : `₹${c.discountValue} Off`}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {c.assignedType === "general" ? (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Globe size={13} className="text-slate-400" />
                          General (All Customers)
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-blue-600 font-bold">
                            <User size={13} className="text-blue-400" />
                            {assignedCustomers.length} {assignedCustomers.length === 1 ? "Customer" : "Customers"}
                          </span>
                          <div className="text-[10px] text-slate-500 pl-4 max-w-xs truncate" title={assignedCustomers.map((cust) => cust.name).join(", ")}>
                            {assignedCustomers.map((cust) => cust.name).join(", ")}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {c.neverExpires ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                          <span className="text-base leading-none">∞</span> Lifetime
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-700 text-xs font-medium">
                            {start ? formatDate(start) : ""} - {end ? formatDate(end) : ""}
                          </span>
                          {isExpired ? (
                            <span className="w-fit text-[9px] bg-rose-50 border border-rose-100 text-rose-600 font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                              Expired
                            </span>
                          ) : isNotYetActive ? (
                            <span className="w-fit text-[9px] bg-amber-50 border border-amber-100 text-amber-600 font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                              Upcoming
                            </span>
                          ) : (
                            <span className="w-fit text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-600 font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                              Active Range
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {isOwner ? (
                        <div className="inline-flex items-center justify-center min-h-[20px] w-9">
                          {updateCoupon.isPending && updateCoupon.variables?.id === c._id ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#D32F2F]" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(c)}
                              disabled={updateCoupon.isPending}
                              className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:ring-offset-2 bg-slate-200 disabled:opacity-75"
                              style={{ backgroundColor: c.isActive ? "#D32F2F" : "#E2E8F0" }}
                              title={c.isActive ? "Deactivate Coupon" : "Activate Coupon"}
                            >
                              <span
                                className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                style={{ transform: c.isActive ? "translateX(16px)" : "translateX(0px)" }}
                              />
                            </button>
                          )}
                        </div>
                      ) : (
                        c.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>
                      )}
                    </td>
                    {isOwner && (
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => setEditCoupon(c)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all shadow-sm cursor-pointer"
                            title="Edit Coupon"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteCouponObj(c)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 active:scale-95 transition-all shadow-sm cursor-pointer"
                            title="Delete Coupon"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <AddCouponModal isOpen={addCouponOpen} onClose={() => setAddCouponOpen(false)} />
      <AddCouponModal
        isOpen={!!editCoupon}
        onClose={() => setEditCoupon(null)}
        coupon={editCoupon}
      />

      <Modal
        isOpen={!!deleteCouponObj}
        onClose={() => setDeleteCouponObj(null)}
        title="Confirm Delete"
        subtitle="This action cannot be undone"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDeleteCouponObj(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteCoupon.isPending}
              onClick={() => {
                if (deleteCouponObj) {
                  deleteCoupon.mutate(deleteCouponObj._id, {
                    onSuccess: () => setDeleteCouponObj(null),
                  });
                }
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete coupon <strong className="text-slate-900">{deleteCouponObj?.code}</strong>? It will be permanently removed.
        </p>
      </Modal>
    </div>
  );
}
