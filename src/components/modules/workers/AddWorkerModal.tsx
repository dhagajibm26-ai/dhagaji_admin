"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workerSchema } from "@/types";
type WorkerInput = z.infer<typeof workerSchema>;
import { useCreateWorker, useUpdateWorker } from "@/hooks/useWorkers";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { IWorker } from "@/types";

interface AddWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker?: IWorker | null;
}

export function AddWorkerModal({ isOpen, onClose, worker }: AddWorkerModalProps) {
  const isEdit = !!worker;
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const isPending = createWorker.isPending || updateWorker.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof workerSchema>, unknown, WorkerInput>({
    resolver: zodResolver(workerSchema),
    defaultValues: worker
      ? {
          name: worker.name,
          phone: worker.phone ?? "",
          address: worker.address ?? "",
          isActive: worker.isActive,
        }
      : { name: "", phone: "", address: "", isActive: true },
  });

  function handleClose() {
    reset();
    onClose();
  }

  function onSubmit(data: WorkerInput) {
    if (isEdit && worker) {
      updateWorker.mutate({ id: worker._id, data }, { onSuccess: handleClose });
    } else {
      createWorker.mutate(data, { onSuccess: handleClose });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? "Edit Worker" : "Add Worker"}
      size="sm"
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
            {isEdit ? "Save Changes" : "Add Worker"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Full Name"
          required
          {...register("name")}
          error={errors.name?.message}
        />
        <Input
          label="Phone Number"
          {...register("phone")}
          error={errors.phone?.message}
        />
        <Input
          label="Address"
          {...register("address")}
          error={errors.address?.message}
        />
        <label className="flex items-center gap-2 text-sm text-[#1A1A1A] cursor-pointer select-none">
          <input type="checkbox" {...register("isActive")} className="rounded" />
          Active Worker
        </label>
      </div>
    </Modal>
  );
}
