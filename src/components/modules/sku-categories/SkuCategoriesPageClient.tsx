"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Edit2, Trash2, Tag, Layers, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useIsOwner } from "@/stores/useAuthStore";
import {
  useSkuCategories,
  useCreateSkuCategory,
  useUpdateSkuCategory,
  useDeleteSkuCategory,
} from "@/hooks/useSkuCategories";
import type { ISkuCategory } from "@/types";

export function SkuCategoriesPageClient() {
  const isOwner = useIsOwner();
  const { data: categories = [], isLoading, isError, error } = useSkuCategories();
  const createMutation = useCreateSkuCategory();
  const updateMutation = useUpdateSkuCategory();
  const deleteMutation = useDeleteSkuCategory();

  // Search filter
  const [search, setSearch] = useState("");

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<ISkuCategory | null>(null);
  
  // Form Fields State
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [isSizeFieldEnabled, setIsSizeFieldEnabled] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState("");

  // Get active main categories for the parent dropdown selection
  const mainCategories = useMemo(() => {
    return categories.filter((c) => {
      const hasParent = !!c.parentId;
      const isSelf = editItem ? c._id === editItem._id : false;
      return !hasParent && c.isActive && !isSelf;
    });
  }, [categories, editItem]);

  // Group subcategories under their main category to show hierarchy in table
  const sortedAndFilteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    // Helper to get raw string parent ID
    const getParentId = (c: ISkuCategory): string | null => {
      if (!c.parentId) return null;
      if (typeof c.parentId === "object" && "_id" in c.parentId) {
        return c.parentId._id;
      }
      return c.parentId;
    };

    // Filter by search query if applicable
    const matchesSearch = (c: ISkuCategory) => {
      const parentName = typeof c.parentId === "object" && c.parentId && "name" in c.parentId
        ? (c.parentId.name as string).toLowerCase()
        : "";
      return (
        c.name.toLowerCase().includes(q) ||
        parentName.includes(q)
      );
    };

    const rootCategories = categories.filter((c) => !getParentId(c));
    const result: ISkuCategory[] = [];

    rootCategories.forEach((root) => {
      const children = categories.filter((c) => getParentId(c) === root._id);
      
      const rootMatches = matchesSearch(root);
      const matchedChildren = children.filter(matchesSearch);

      // If search query is entered, we only include matched rows
      if (q) {
        if (rootMatches) {
          result.push(root);
          result.push(...children); // Include all children if parent matched
        } else if (matchedChildren.length > 0) {
          result.push(root); // Include parent for context
          result.push(...matchedChildren);
        }
      } else {
        result.push(root);
        result.push(...children);
      }
    });

    // Handle orphans (subcategories whose parent is missing/deleted)
    const orphans = categories.filter((c) => {
      const pid = getParentId(c);
      if (!pid) return false;
      return !rootCategories.some((r) => r._id === pid);
    });

    if (q) {
      result.push(...orphans.filter(matchesSearch));
    } else {
      result.push(...orphans);
    }

    return result;
  }, [categories, search]);

  const handleOpenAdd = () => {
    setEditItem(null);
    setName("");
    setParentId("");
    setIsSizeFieldEnabled(false);
    setIsActive(true);
    setFormError("");
    setIsOpen(true);
  };

  const handleOpenEdit = (item: ISkuCategory) => {
    setEditItem(item);
    setName(item.name);
    
    // Resolve parentId representation
    let pid = "";
    if (item.parentId) {
      pid = typeof item.parentId === "object" && "_id" in item.parentId 
        ? item.parentId._id 
        : item.parentId;
    }
    setParentId(pid);
    setIsSizeFieldEnabled(item.isSizeFieldEnabled);
    setIsActive(item.isActive);
    setFormError("");
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Category name is required");
      return;
    }

    const payload = {
      name: trimmedName,
      parentId: parentId || null,
      isSizeFieldEnabled,
      isActive,
    };

    if (editItem) {
      updateMutation.mutate(
        { id: editItem._id, data: payload },
        {
          onSuccess: () => setIsOpen(false),
          onError: (err) => setFormError(err.message),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => setIsOpen(false),
        onError: (err) => setFormError(err.message),
      });
    }
  };

  const toggleActiveStatus = (item: ISkuCategory) => {
    if (!isOwner) return;
    updateMutation.mutate({
      id: item._id,
      data: { isActive: !item.isActive },
    });
  };

  const handleDelete = (item: ISkuCategory) => {
    const isParent = !item.parentId;
    const confirmMessage = isParent
      ? `Delete SKU Category "${item.name}"? WARNING: This will also soft-delete all of its subcategories.`
      : `Delete Subcategory "${item.name}"?`;

    if (confirm(confirmMessage)) {
      deleteMutation.mutate(item._id);
    }
  };

  const isPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">SKU Categories</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage main categories and subcategories for products, including sizing toggles.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/finished-stock" className="inline-flex">
            <Button variant="outline" size="sm">
              <ArrowLeft size={14} className="mr-1.5" />
              Back to Finished Stock
            </Button>
          </Link>
          {isOwner && (
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus size={14} className="mr-1.5" />
              Add Category
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F] placeholder:text-slate-400"
          />
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load categories: {error?.message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="relative w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 min-w-[200px]">Category Name</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3">Parent Category</th>
                <th className="px-4 py-3 text-center">Size Field</th>
                <th className="px-4 py-3 text-center">Status</th>
                {isOwner && <th className="px-4 py-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                    Loading categories...
                  </td>
                </tr>
              ) : sortedAndFilteredCategories.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                    {search ? "No categories match your search." : "No SKU categories added yet."}
                  </td>
                </tr>
              ) : (
                sortedAndFilteredCategories.map((category) => {
                  const isSub = !!category.parentId;
                  const parentName =
                    typeof category.parentId === "object" && category.parentId && "name" in category.parentId
                      ? (category.parentId.name as string)
                      : "—";

                  return (
                    <tr
                      key={category._id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isSub ? "bg-slate-50/20" : "font-medium"
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isSub ? (
                            <>
                              <span className="text-slate-300 font-mono text-sm pl-2">↳</span>
                              <Layers size={14} className="text-slate-400" />
                              <span className="text-slate-700">{category.name}</span>
                            </>
                          ) : (
                            <>
                              <Tag size={14} className="text-[#D32F2F]" />
                              <span className="text-slate-900 font-semibold">{category.name}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isSub ? (
                          <Badge variant="neutral" className="bg-purple-50 text-purple-700 border-purple-100 font-semibold text-[10px]">
                            Subcategory
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="bg-blue-50 text-blue-700 border-blue-100 font-semibold text-[10px]">
                            Main Category
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {isSub ? parentName : "—"}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {category.isSizeFieldEnabled ? (
                          <Badge variant="success" className="text-[10px] font-semibold">Enabled</Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] font-semibold text-slate-400 bg-slate-100">Disabled</Badge>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!isOwner || isPending}
                          onClick={() => toggleActiveStatus(category)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
                            !isOwner && "cursor-default"
                          } ${
                            category.isActive
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100"
                              : "bg-slate-50 text-slate-600 ring-slate-500/10 hover:bg-slate-100"
                          }`}
                        >
                          {category.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {isOwner && (
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEdit(category)}
                              className="text-slate-600 hover:text-slate-900"
                              aria-label={`Edit ${category.name}`}
                            >
                              <Edit2 size={13} className="mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(category)}
                              className="text-red-600 hover:text-red-800"
                              aria-label={`Delete ${category.name}`}
                            >
                              <Trash2 size={13} className="mr-1" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={editItem ? "Edit SKU Category" : "Add SKU Category"}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" form="sku-category-form" isLoading={isPending}>
                {editItem ? "Update Category" : "Add Category"}
              </Button>
            </div>
          }
        >
          <form id="sku-category-form" onSubmit={handleSave} noValidate className="space-y-4 p-1">
            <Input
              label="Category Name"
              placeholder="e.g. Bangles, Fancy Box, Cotton Thread"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="off"
            />

            <Select
              label="Parent Category (Optional)"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              hint="Select a parent category if this is a subcategory. Leave blank for Main Category."
            >
              <option value="">None (Main Category)</option>
              {mainCategories.map((main) => (
                <option key={main._id} value={main._id}>
                  {main.name}
                </option>
              ))}
            </Select>

            {/* Toggle switch for Size Field */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Sizing Settings
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="inline-flex items-center cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isSizeFieldEnabled}
                      onChange={(e) => setIsSizeFieldEnabled(e.target.checked)}
                    />
                    <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D32F2F]"></div>
                  </div>
                  <div className="ms-3">
                    <p className="text-sm font-semibold text-slate-700">Enable Size Field</p>
                    <p className="text-xs text-slate-400 mt-0.5">Check if this category needs product size entries (e.g. 2.4, 2.6)</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Status Settings
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="inline-flex items-center cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </div>
                  <div className="ms-3">
                    <p className="text-sm font-semibold text-slate-700">Active Category</p>
                    <p className="text-xs text-slate-400 mt-0.5">Toggle to enable or disable this category across dynamic menus</p>
                  </div>
                </label>
              </div>
            </div>

            {formError && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 font-medium">
                {formError}
              </p>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
