"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  useCreateMaterialCategory,
  useDeleteMaterialCategory,
  useMaterialCategories,
  useUpdateMaterialCategory,
} from "@/hooks/useMaterialCategories";

export function MaterialCategoriesPageClient() {
  const { data: categories = [], isLoading } = useMaterialCategories();
  const createCategory = useCreateMaterialCategory();
  const updateCategory = useUpdateMaterialCategory();
  const deleteCategory = useDeleteMaterialCategory();

  const [newCategory, setNewCategory] = useState("");
  const [editState, setEditState] = useState<Record<string, string>>({});

  const isPending =
    createCategory.isPending || updateCategory.isPending || deleteCategory.isPending;

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Material Categories</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Add and manage dynamic categories used in raw material entries.
          </p>
        </div>
        <Link href="/raw-material" className="inline-flex">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} className="mr-1" />
            Back to Raw Material
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto]">
          <Input
            label="New Category"
            placeholder="e.g. Packing Accessories"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <div className="flex items-end">
            <Button
              onClick={() => {
                const name = newCategory.trim();
                if (!name) return;
                createCategory.mutate({ name, isActive: true }, { onSuccess: () => setNewCategory("") });
              }}
              isLoading={createCategory.isPending}
              disabled={!newCategory.trim()}
            >
              <Plus size={14} className="mr-1" />
              Add Category
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-[#D32F2F] text-left text-xs font-semibold uppercase tracking-wider text-white">
              <th className="px-4 py-3 text-white">Category Name</th>
              <th className="px-4 py-3 text-center text-white">Status</th>
              <th className="px-4 py-3 text-center text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={3}>
                  Loading categories...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={3}>
                  No categories yet.
                </td>
              </tr>
            ) : (
              categories.map((category) => {
                const editValue = editState[category._id] ?? category.name;
                return (
                  <tr key={category._id}>
                    <td className="px-4 py-3">
                      <input
                        value={editValue}
                        onChange={(e) =>
                          setEditState((prev) => ({ ...prev, [category._id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#D32F2F] focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/25"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          updateCategory.mutate({
                            id: category._id,
                            data: { isActive: !category.isActive },
                          })
                        }
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          category.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending || !editValue.trim()}
                          onClick={() =>
                            updateCategory.mutate({
                              id: category._id,
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
                            if (confirm(`Delete category \"${category.name}\"?`)) {
                              deleteCategory.mutate(category._id);
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
