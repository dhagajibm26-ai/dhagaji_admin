"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import type { ICustomer } from "@/types";

// Schema for form input (wrapping strings in objects for react-hook-form useFieldArray)
const customerFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  mobileNumbers: z
    .array(
      z.object({
        value: z.string().trim().min(1, "Mobile number cannot be empty"),
      })
    )
    .min(1, "At least one mobile number is required"),
  address: z.string().optional(),
  email: z.string().optional(),
});

type CustomerFormInput = z.infer<typeof customerFormSchema>;

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: ICustomer | null;
}

export function AddCustomerModal({ isOpen, onClose, customer }: AddCustomerModalProps) {
  "use no memo";
  const isEdit = !!customer;
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isPending = createCustomer.isPending || updateCustomer.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormInput>({
    resolver: zodResolver(customerFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      mobileNumbers: [{ value: "" }],
      address: "",
      email: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "mobileNumbers",
  });

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        reset({
          name: customer.name,
          mobileNumbers: customer.mobileNumbers.map((num) => ({ value: num })),
          address: customer.address ?? "",
          email: customer.email ?? "",
        });
      } else {
        reset({
          name: "",
          mobileNumbers: [{ value: "" }],
          address: "",
          email: "",
        });
      }
    }
  }, [isOpen, customer, reset]);

  function handleClose() {
    reset();
    onClose();
  }

  function onSubmit(data: CustomerFormInput) {
    const payload = {
      name: data.name.trim(),
      mobileNumbers: data.mobileNumbers.map((m) => m.value.trim()),
      address: data.address?.trim() || undefined,
      email: data.email?.trim() || undefined,
    };

    if (isEdit && customer) {
      updateCustomer.mutate(
        { id: customer._id, data: payload },
        { onSuccess: handleClose }
      );
    } else {
      createCustomer.mutate(payload, { onSuccess: handleClose });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? "Edit Customer" : "Add Customer"}
      subtitle={isEdit ? "Update customer profile details" : "Register a new customer"}
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
            {isEdit ? "Save Changes" : "Add Customer"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Customer Name"
          required
          autoComplete="off"
          placeholder="e.g. John Doe"
          {...register("name")}
          error={errors.name?.message}
        />

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Mobile Numbers <span className="text-[#D32F2F]">*</span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 py-0 px-2"
              onClick={() => append({ value: "" })}
            >
              <Plus size={14} className="mr-1" />
              Add More
            </Button>
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    placeholder="e.g. 9876543210"
                    autoComplete="off"
                    {...register(`mobileNumbers.${index}.value` as const)}
                    error={errors.mobileNumbers?.[index]?.value?.message}
                  />
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 border-rose-100 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-transparent px-3"
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            ))}
            {errors.mobileNumbers?.root?.message && (
              <p className="text-xs text-rose-600 font-medium">
                {errors.mobileNumbers.root.message}
              </p>
            )}
          </div>
        </div>

        <Input
          label="Email Address"
          type="email"
          autoComplete="off"
          placeholder="e.g. john@example.com"
          {...register("email")}
          error={errors.email?.message}
        />

        <Input
          label="Address"
          autoComplete="off"
          placeholder="e.g. Shop 12, Market Area"
          {...register("address")}
          error={errors.address?.message}
        />
      </div>
    </Modal>
  );
}
