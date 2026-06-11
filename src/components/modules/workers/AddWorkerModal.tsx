"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workerSchema } from "@/types";
type WorkerInput = z.infer<typeof workerSchema>;
import { useCreateWorker, useUpdateWorker } from "@/hooks/useWorkers";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { IWorker } from "@/types";

const DRAFT_KEY = "dhagaji-worker-form-draft";

function formatAadhaar(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  const parts = digits.match(/.{1,4}/g) ?? [];
  return parts.join(" ");
}

async function translateToGujarati(text: string): Promise<string> {
  const query = text.trim();
  if (!query) return "";

  const res = await fetch(`/api/translate/gujarati?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error("Translation failed");
  }
  const json = (await res.json()) as { data?: { translatedText?: string } };
  return json.data?.translatedText?.trim() ?? "";
}

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
  const [allowGujaratiEdit, setAllowGujaratiEdit] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof workerSchema>, unknown, WorkerInput>({
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: false,
    resolver: zodResolver(workerSchema),
    defaultValues: worker
      ? {
          name: worker.name,
          nameGu: worker.nameGu ?? "",
          fatherOrHusbandName: worker.fatherOrHusbandName ?? "",
          fatherOrHusbandNameGu: worker.fatherOrHusbandNameGu ?? "",
          dateOfBirth: worker.dateOfBirth ? new Date(worker.dateOfBirth).toISOString().slice(0, 10) : "",
          gender: worker.gender,
          bloodGroup: worker.bloodGroup ?? "",
          mobile: worker.mobile ?? worker.phone ?? "",
          emergencyContact: worker.emergencyContact ?? "",
          phone: worker.phone ?? "",
          address: worker.address ?? "",
          addressGu: worker.addressGu ?? "",
          aadhaarNumber: worker.aadhaarNumber ?? "",
          designation: worker.designation ?? "",
          joiningDate: worker.joiningDate ? new Date(worker.joiningDate).toISOString().slice(0, 10) : "",
          photoDataUrl: worker.photoDataUrl ?? "",
          isActive: worker.isActive,
        }
      : {
          name: "",
          nameGu: "",
          fatherOrHusbandName: "",
          fatherOrHusbandNameGu: "",
          dateOfBirth: "",
          bloodGroup: "",
          mobile: "",
          emergencyContact: "",
          phone: "",
          address: "",
          addressGu: "",
          aadhaarNumber: "",
          designation: "",
          joiningDate: "",
          photoDataUrl: "",
          isActive: true,
        },
  });

  const name = watch("name") ?? "";
  const nameGu = watch("nameGu") ?? "";
  const fatherOrHusbandName = watch("fatherOrHusbandName") ?? "";
  const fatherOrHusbandNameGu = watch("fatherOrHusbandNameGu") ?? "";
  const dateOfBirth = watch("dateOfBirth") ?? "";
  const gender = watch("gender") ?? "";
  const bloodGroup = watch("bloodGroup") ?? "";
  const mobile = watch("mobile") ?? "";
  const emergencyContact = watch("emergencyContact") ?? "";
  const address = watch("address") ?? "";
  const addressGu = watch("addressGu") ?? "";
  const aadhaarNumber = watch("aadhaarNumber") ?? "";
  const designation = watch("designation") ?? "";
  const joiningDate = watch("joiningDate") ?? "";
  const photoDataUrl = watch("photoDataUrl") ?? "";

  useEffect(() => {
    if (!isOpen || isEdit) return;
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<WorkerInput>;
      reset({
        ...parsed,
        aadhaarNumber: formatAadhaar(parsed.aadhaarNumber ?? ""),
      });
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, [isEdit, isOpen, reset]);

  useEffect(() => {
    if (!isOpen || allowGujaratiEdit) return;
    const timer = setTimeout(() => {
      if (name.trim()) {
        translateToGujarati(name)
          .then((translated) => {
            if (translated) setValue("nameGu", translated, { shouldDirty: true });
          })
          .catch(() => undefined);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [allowGujaratiEdit, isOpen, name, setValue]);

  useEffect(() => {
    if (!isOpen || allowGujaratiEdit) return;
    const timer = setTimeout(() => {
      if (fatherOrHusbandName.trim()) {
        translateToGujarati(fatherOrHusbandName)
          .then((translated) => {
            if (translated) setValue("fatherOrHusbandNameGu", translated, { shouldDirty: true });
          })
          .catch(() => undefined);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [allowGujaratiEdit, fatherOrHusbandName, isOpen, setValue]);

  useEffect(() => {
    if (!isOpen || allowGujaratiEdit) return;
    const timer = setTimeout(() => {
      if (address.trim()) {
        translateToGujarati(address)
          .then((translated) => {
            if (translated) setValue("addressGu", translated, { shouldDirty: true });
          })
          .catch(() => undefined);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [address, allowGujaratiEdit, isOpen, setValue]);

  function handleClose() {
    reset();
    onClose();
  }

  function handleLocalSave() {
    const payload: Partial<WorkerInput> = {
      name,
      nameGu,
      fatherOrHusbandName,
      fatherOrHusbandNameGu,
      dateOfBirth,
      gender: gender || undefined,
      bloodGroup,
      mobile,
      emergencyContact,
      address,
      addressGu,
      aadhaarNumber,
      designation,
      joiningDate,
      photoDataUrl,
      isActive: watch("isActive"),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }

  async function handleCopy() {
    const text = [
      `Name: ${name}`,
      `નામ: ${nameGu}`,
      `Father/Husband: ${fatherOrHusbandName}`,
      `પિતા/પતિનું નામ: ${fatherOrHusbandNameGu}`,
      `Mobile: ${mobile}`,
      `Emergency: ${emergencyContact}`,
      `Aadhaar: ${aadhaarNumber}`,
      `Designation: ${designation}`,
      `DOB: ${dateOfBirth}`,
      `Joining Date: ${joiningDate}`,
      `Address: ${address}`,
      `સરનામું: ${addressGu}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
  }

  function handlePrintCard() {
    const cardHtml = `
      <div style="width:340px;border:2px solid #111;border-radius:14px;padding:14px;font-family:Arial,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <div style="font-size:10px;letter-spacing:1px;color:#555;">DHAGAJI CREATION</div>
            <div style="font-size:16px;font-weight:700;">Worker Card</div>
          </div>
          ${photoDataUrl ? `<img src="${photoDataUrl}" style="height:64px;width:64px;object-fit:cover;border-radius:10px;border:1px solid #ccc;" />` : ""}
        </div>
        <hr style="margin:10px 0;border:none;border-top:1px solid #ddd;" />
        <div style="font-size:12px;line-height:1.55;">
          <div><b>Name:</b> ${name}</div>
          <div><b>નામ:</b> ${nameGu}</div>
          <div><b>Father/Husband:</b> ${fatherOrHusbandName}</div>
          <div><b>પિતા/પતિ:</b> ${fatherOrHusbandNameGu}</div>
          <div><b>Designation:</b> ${designation}</div>
          <div><b>Mobile:</b> ${mobile}</div>
          <div><b>Aadhaar:</b> ${aadhaarNumber}</div>
          <div><b>Address:</b> ${address}</div>
          <div><b>સરનામું:</b> ${addressGu}</div>
        </div>
      </div>
    `;
    const win = window.open("", "_blank", "width=600,height=600");
    if (!win) return;
    win.document.write(`<html><body style="display:flex;justify-content:center;padding:20px;">${cardHtml}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  async function onPhotoSelect(file: File | null) {
    if (!file) {
      setValue("photoDataUrl", "", { shouldDirty: true });
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
    setValue("photoDataUrl", dataUrl, { shouldDirty: true });
  }

  function onSubmit(data: WorkerInput) {
    const payload: WorkerInput = {
      ...data,
      aadhaarNumber: data.aadhaarNumber ? formatAadhaar(data.aadhaarNumber) : undefined,
      phone: data.mobile || data.phone,
    };

    if (isEdit && worker) {
      updateWorker.mutate({ id: worker._id, data: payload }, { onSuccess: handleClose });
    } else {
      createWorker.mutate(payload, { onSuccess: handleClose });
    }
  }

  const previewMeta = useMemo(
    () => [
      ["DOB", dateOfBirth || "-"],
      ["Gender", gender || "-"],
      ["Blood", bloodGroup || "-"],
      ["Join", joiningDate || "-"],
    ],
    [bloodGroup, dateOfBirth, gender, joiningDate]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? "Edit Worker" : "Add Worker"}
      subtitle="English to Gujarati auto-translation with live card preview"
      size="xl"
      footer={
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={handleLocalSave} disabled={isPending}>
            Save Draft
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={isPending}>
            Copy Details
          </Button>
          <Button variant="ghost" size="sm" onClick={handlePrintCard} disabled={isPending}>
            Print Card
          </Button>
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void onPhotoSelect(file);
              }}
              className="block w-full text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowGujaratiEdit}
              onChange={(e) => setAllowGujaratiEdit(e.target.checked)}
              className="rounded"
            />
            Enable manual Gujarati edits
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Name (English)" required autoComplete="off" {...register("name")} error={errors.name?.message} />
            <Input label="નામ (Gujarati)" readOnly={!allowGujaratiEdit} autoComplete="off" {...register("nameGu")} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Father/Husband (English)" autoComplete="off" {...register("fatherOrHusbandName")} />
            <Input label="પિતા/પતિનું નામ" readOnly={!allowGujaratiEdit} autoComplete="off" {...register("fatherOrHusbandNameGu")} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Address (English)" autoComplete="off" {...register("address")} error={errors.address?.message} />
            <Input label="સરનામું (Gujarati)" readOnly={!allowGujaratiEdit} autoComplete="off" {...register("addressGu")} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Date of Birth" type="date" {...register("dateOfBirth")} />
            <Input label="Joining Date" type="date" {...register("joiningDate")} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Gender" {...register("gender")}>
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
            <Select label="Blood Group" {...register("bloodGroup")}>
              <option value="">Select...</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Mobile" autoComplete="off" {...register("mobile")} />
            <Input label="Emergency Contact" autoComplete="off" {...register("emergencyContact")} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Aadhaar Number"
              placeholder="XXXX XXXX XXXX"
              autoComplete="off"
              value={aadhaarNumber}
              onChange={(e) => setValue("aadhaarNumber", formatAadhaar(e.target.value), { shouldDirty: true })}
              error={errors.aadhaarNumber?.message}
            />
            <Input label="Designation / Work Type" autoComplete="off" {...register("designation")} />
          </div>

          <label className="flex items-center gap-2 text-sm text-[#1A1A1A] cursor-pointer select-none">
            <input type="checkbox" {...register("isActive")} className="rounded" />
            Active Worker
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Live Worker Card Preview</p>
          <div id="worker-card-preview" className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-[0.15em] text-slate-500">DHAGAJI CREATION</p>
                <p className="text-base font-bold text-slate-900">Worker Identity Card</p>
              </div>
              {photoDataUrl ? (
                <img src={photoDataUrl} alt="Worker" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-xl border border-dashed border-slate-300 grid place-content-center text-[10px] text-slate-400">
                  No Photo
                </div>
              )}
            </div>

            <div className="space-y-1 text-sm">
              <p><span className="font-semibold">Name:</span> {name || "-"}</p>
              <p><span className="font-semibold">નામ:</span> {nameGu || "-"}</p>
              <p><span className="font-semibold">Father/Husband:</span> {fatherOrHusbandName || "-"}</p>
              <p><span className="font-semibold">પિતા/પતિ:</span> {fatherOrHusbandNameGu || "-"}</p>
              <p><span className="font-semibold">Designation:</span> {designation || "-"}</p>
              <p><span className="font-semibold">Mobile:</span> {mobile || "-"}</p>
              <p><span className="font-semibold">Aadhaar:</span> {aadhaarNumber || "-"}</p>
              <p><span className="font-semibold">Address:</span> {address || "-"}</p>
              <p><span className="font-semibold">સરનામું:</span> {addressGu || "-"}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2">
              {previewMeta.map(([label, value]) => (
                <div key={label} className="text-xs">
                  <p className="text-slate-500">{label}</p>
                  <p className="font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
