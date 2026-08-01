"use client";

import { useState } from "react";
import { Search, Plus, Phone, MapPin, Edit2, Trash2, Users } from "lucide-react";
import { useCustomers, useDeleteCustomer } from "@/hooks/useCustomers";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AddCustomerModal } from "./AddCustomerModal";
import type { ICustomer } from "@/types";

export function CustomersPageClient() {
  const [search, setSearch] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<ICustomer | null>(null);

  const [deleteCustomerObj, setDeleteCustomerObj] = useState<ICustomer | null>(null);

  const { data: customers = [], isLoading } = useCustomers();
  const deleteCustomer = useDeleteCustomer();

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.mobileNumbers.some((num) => num.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  const totalCustomers = customers.length;
  const multipleNumbers = customers.filter((c) => c.mobileNumbers.length > 1).length;

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage customer database, contacts, and addresses
          </p>
        </div>
        <div>
          <Button size="sm" onClick={() => setAddCustomerOpen(true)}>
            <Plus size={14} className="mr-1" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#D32F2F]">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Customers</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCustomers}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Phone size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Multiple Mobile Numbers</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{multipleNumbers}</p>
          </div>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone or address..."
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
          <Users size={40} className="text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">
            {search ? "No customers match your search." : "No customers registered yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-left">
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Name</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Mobile Number(s)</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Email</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Address</th>
                <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-slate-800">{c.name}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {c.mobileNumbers.map((num, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-700 px-2 py-1 text-xs font-medium border border-slate-200"
                        >
                          <Phone size={10} />
                          {num}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {c.email ? (
                      <span className="text-slate-800 font-medium">{c.email}</span>
                    ) : (
                      <span className="text-slate-400 italic">No email provided</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {c.address ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        {c.address}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">No address provided</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => setEditCustomer(c)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all shadow-sm cursor-pointer"
                        title="Edit Customer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteCustomerObj(c)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 active:scale-95 transition-all shadow-sm cursor-pointer"
                        title="Delete Customer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <AddCustomerModal isOpen={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} />
      <AddCustomerModal
        isOpen={!!editCustomer}
        onClose={() => setEditCustomer(null)}
        customer={editCustomer}
      />

      <Modal
        isOpen={!!deleteCustomerObj}
        onClose={() => setDeleteCustomerObj(null)}
        title="Confirm Delete"
        subtitle="This action cannot be undone"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDeleteCustomerObj(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteCustomer.isPending}
              onClick={() => {
                if (deleteCustomerObj) {
                  deleteCustomer.mutate(deleteCustomerObj._id, {
                    onSuccess: () => setDeleteCustomerObj(null),
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
          Are you sure you want to delete customer <strong className="text-slate-900">{deleteCustomerObj?.name}</strong>? All their profile data will be permanently removed.
        </p>
      </Modal>
    </div>
  );
}
