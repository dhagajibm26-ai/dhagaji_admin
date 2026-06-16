"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  useBangleSizes,
  useCreateBangleSizesBulk,
  useDeleteBangleSize,
  useUpdateBangleSize,
} from "@/hooks/useBangleSizes";

/** Split a free-text input into clean size tokens (comma / newline / space). */
function parseSizes(input: string): string[] {
  const seen = new Set<string>();
  return input
    .split(/[\n,]+/)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function BangleSizesPageClient() {
  const { data: sizes = [], isLoading } = useBangleSizes();
  const createSizes = useCreateBangleSizesBulk();
  const updateSize = useUpdateBangleSize();
  const deleteSize = useDeleteBangleSize();

  const [newSize, setNewSize] = useState("");
  const [editState, setEditState] = useState<Record<string, string>>({});

  const parsedSizes = parseSizes(newSize);
  const isPending = createSizes.isPending || updateSize.isPending || deleteSize.isPending;

  function handleAddSizes() {
    const names = parseSizes(newSize);
    if (names.length === 0) return;
    createSizes.mutate(names, { onSuccess: () => setNewSize("") });
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Manage Bangle Sizes</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Add and manage sizes used in the Bangles create form dropdown.
          </p>
        </div>
        <Link href="/bangles" className="inline-flex">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} className="mr-1" />
            Back to Bangles
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          New Bangle Sizes
        </label>
        <textarea
          rows={2}
          placeholder="Add one or many — e.g. 2.4, 2.6, 2.8  (comma, space or new line separated)"
          value={newSize}
          onChange={(e) => setNewSize(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleAddSizes();
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#D32F2F] focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/25 resize-none placeholder:text-slate-400"
        />
        {parsedSizes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {parsedSizes.map((s) => (
              <span
                key={s}
                className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
              >
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {parsedSizes.length > 0
              ? `${parsedSizes.length} size${parsedSizes.length === 1 ? "" : "s"} ready to add`
              : "Tip: paste a list of sizes at once"}
          </p>
          <Button
            onClick={handleAddSizes}
            isLoading={createSizes.isPending}
            disabled={parsedSizes.length === 0}
          >
            <Plus size={14} className="mr-1" />
            Add {parsedSizes.length > 1 ? `${parsedSizes.length} Sizes` : "Size"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Bangle Size</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={2}>
                  Loading sizes...
                </td>
              </tr>
            ) : sizes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={2}>
                  No sizes yet.
                </td>
              </tr>
            ) : (
              sizes.map((size) => {
                const editValue = editState[size._id] ?? size.name;
                return (
                  <tr key={size._id}>
                    <td className="px-4 py-3">
                      <input
                        value={editValue}
                        onChange={(e) =>
                          setEditState((prev) => ({ ...prev, [size._id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#D32F2F] focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/25"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending || !editValue.trim()}
                          onClick={() =>
                            updateSize.mutate({
                              id: size._id,
                              data: { name: editValue.trim() },
                            })
                          }
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-800"
                          disabled={isPending}
                          onClick={() => {
                            if (confirm(`Delete size \"${size.name}\"?`)) {
                              deleteSize.mutate(size._id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
