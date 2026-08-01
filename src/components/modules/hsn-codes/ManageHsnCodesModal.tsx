"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useHsnCodes, useCreateHsnCode, useDeleteHsnCode } from "@/hooks/useHsnCodes";

interface ManageHsnCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageHsnCodesModal({ isOpen, onClose }: ManageHsnCodesModalProps) {
  const { data: hsnCodes = [], isLoading } = useHsnCodes();
  const createMutation = useCreateHsnCode();
  const deleteMutation = useDeleteHsnCode();
  const [newCode, setNewCode] = useState("");
  const [newGst, setNewGst] = useState<number | "">("");

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = newCode.trim();
    if (!code) return;
    const gstPercentage = Number(newGst || 0);

    createMutation.mutate({ code, gstPercentage, isActive: true }, {
      onSuccess: () => {
        setNewCode("");
        setNewGst("");
      },
    });
  };

  const isPending = createMutation.isPending || deleteMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage HSN Codes" size="md">
      <div className="space-y-4">
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
          <div className="sm:col-span-1">
            <Input
              label="HSN Code"
              placeholder="e.g. 8471"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-1">
            <Input
              label="GST Percentage (%)"
              placeholder="e.g. 18"
              type="number"
              min="0"
              max="100"
              value={newGst}
              onChange={(e) => setNewGst(e.target.value === "" ? "" : Number(e.target.value))}
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-1">
            <Button type="submit" isLoading={createMutation.isPending} disabled={!newCode.trim() || newGst === ""}>
              Add Code
            </Button>
          </div>
        </form>

        <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {isLoading ? (
            <p className="p-4 text-center text-sm text-slate-400">Loading HSN codes...</p>
          ) : hsnCodes.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-400">No HSN codes defined yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {hsnCodes.map((h) => (
                <li key={h._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-700">{h.code}</span>
                    <span className="text-xs text-slate-500">GST: {h.gstPercentage}%</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-800 h-8 px-2"
                    isLoading={deleteMutation.isPending && deleteMutation.variables === h._id}
                    disabled={isPending}
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete HSN code "${h.code}"?`)) {
                        deleteMutation.mutate(h._id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
