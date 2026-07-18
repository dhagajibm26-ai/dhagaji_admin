"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { couponSchema } from "@/types";
import type { CouponInput, ICoupon } from "@/types";
import { useCreateCoupon, useUpdateCoupon } from "@/hooks/useCoupons";
import { useCustomers } from "@/hooks/useCustomers";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface AddCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon?: ICoupon | null;
}

export function AddCouponModal({ isOpen, onClose, coupon }: AddCouponModalProps) {
  const isEdit = !!coupon;
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const { data: customers = [] } = useCustomers();
  const isPending = createCoupon.isPending || updateCoupon.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof couponSchema>, unknown, CouponInput>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      discountType: "percentage",
      discountValue: 0,
      assignedType: "general",
      customerIds: [],
      isActive: true,
      neverExpires: true,
      startDate: "",
      endDate: "",
    },
  });

  const assignedType = watch("assignedType");
  const neverExpires = watch("neverExpires");
  const selectedCustomerIds = watch("customerIds") || [];
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (coupon) {
        const initialCustomerIds = Array.isArray(coupon.customerIds)
          ? coupon.customerIds.map((c: any) => (typeof c === "object" && c !== null ? c._id : c))
          : [];
        reset({
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          assignedType: coupon.assignedType,
          customerIds: initialCustomerIds,
          isActive: coupon.isActive,
          neverExpires: coupon.neverExpires ?? true,
          startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().slice(0, 10) : "",
          endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().slice(0, 10) : "",
        });
      } else {
        reset({
          code: "",
          discountType: "percentage",
          discountValue: 0,
          assignedType: "general",
          customerIds: [],
          isActive: true,
          neverExpires: true,
          startDate: "",
          endDate: "",
        });
      }
      setCustomerSearchQuery("");
    }
  }, [isOpen, coupon, reset]);

  function handleClose() {
    reset();
    onClose();
  }

  function onSubmit(data: CouponInput) {
    const payload = {
      ...data,
      code: data.code.toUpperCase().trim(),
      customerIds: data.assignedType === "general" ? [] : data.customerIds || [],
      startDate: data.neverExpires ? null : data.startDate || null,
      endDate: data.neverExpires ? null : data.endDate || null,
    };

    if (isEdit && coupon) {
      updateCoupon.mutate(
        { id: coupon._id, data: payload },
        { onSuccess: handleClose }
      );
    } else {
      createCoupon.mutate(payload, { onSuccess: handleClose });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? "Edit Coupon" : "Add Coupon"}
      subtitle={isEdit ? "Update coupon parameters" : "Create a new discount coupon"}
      size="md"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {isEdit ? "Save Changes" : "Add Coupon"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Coupon Code"
          required
          autoComplete="off"
          placeholder="e.g. FESTIVE20"
          {...register("code")}
          error={errors.code?.message}
          disabled={isEdit}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Discount Type" {...register("discountType")} error={errors.discountType?.message}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (₹)</option>
          </Select>
          <Input
            label="Discount Value"
            type="number"
            required
            placeholder="e.g. 10"
            {...register("discountValue", { valueAsNumber: true })}
            error={errors.discountValue?.message}
          />
        </div>

        <Select
          label="Assign Coupon To"
          {...register("assignedType")}
          onChange={(e) => {
            const val = e.target.value as "general" | "customer";
            setValue("assignedType", val);
            if (val === "general") {
              setValue("customerIds", []);
            }
          }}
          error={errors.assignedType?.message}
        >
          <option value="general">General (Everyone)</option>
          <option value="customer">Particular Customer</option>
        </Select>

        {assignedType === "customer" && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#1A1A1A]">
              Select Customers *
            </label>
            <input
              type="text"
              placeholder="Search customers by name or phone..."
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
            />
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1.5 bg-slate-50">
              {customers
                .filter((c) => {
                  const q = customerSearchQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    c.name.toLowerCase().includes(q) ||
                    c.mobileNumbers.some((num) => num.includes(q))
                  );
                })
                .map((c) => {
                  const isChecked = selectedCustomerIds.includes(c._id);
                  return (
                    <label
                      key={c._id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-200/50 rounded cursor-pointer select-none text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const next = isChecked
                            ? selectedCustomerIds.filter((id) => id !== c._id)
                            : [...selectedCustomerIds, c._id];
                          setValue("customerIds", next, { shouldValidate: true });
                        }}
                        className="rounded text-[#D32F2F] focus:ring-[#D32F2F]"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        <span className="text-xs text-slate-400">
                          {c.mobileNumbers.join(", ")}
                        </span>
                      </div>
                    </label>
                  );
                })}
              {customers.filter((c) => {
                const q = customerSearchQuery.trim().toLowerCase();
                if (!q) return true;
                return (
                  c.name.toLowerCase().includes(q) ||
                  c.mobileNumbers.some((num) => num.includes(q))
                );
              }).length === 0 && (
                <div className="text-xs text-slate-400 italic text-center py-4">
                  No customers found
                </div>
              )}
            </div>
            {errors.customerIds && (
              <p className="text-xs text-red-600 mt-1">{errors.customerIds.message}</p>
            )}
          </div>
        )}

        <Select
          label="Expiry Setting"
          {...register("neverExpires", {
            setValueAs: (v) => v === "true" || v === true,
          })}
          onChange={(e) => {
            const val = e.target.value === "true";
            setValue("neverExpires", val);
            if (val) {
              setValue("startDate", "");
              setValue("endDate", "");
            }
          }}
          error={errors.neverExpires?.message}
        >
          <option value="true">Never Expires</option>
          <option value="false">Has Expiry Date Range</option>
        </Select>

        {!neverExpires && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
            <Input
              label="Start Date *"
              type="date"
              {...register("startDate")}
              error={errors.startDate?.message}
            />
            <Input
              label="End Date *"
              type="date"
              {...register("endDate")}
              error={errors.endDate?.message}
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-[#1A1A1A] cursor-pointer select-none mt-2">
          <input type="checkbox" {...register("isActive")} className="rounded" />
          Active / Enabled
        </label>
      </div>
    </Modal>
  );
}
