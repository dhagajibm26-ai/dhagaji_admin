"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, Search, Plus, Printer, ScanLine, Grid3x3, List, Gem } from "lucide-react";
import { useFinishedStock } from "@/hooks/useFinishedStock";
import { useIsOwner } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { lookupBarcode } from "@/hooks/useFinishedStock";
import { ProductCard } from "./ProductCard";
import { AddProductModal } from "./AddProductModal";
import { BarcodeScanner } from "./BarcodeScanner";
import { PrintBarcode } from "./PrintBarcode";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { IFinishedProduct } from "@/types";

const LOW_STOCK_THRESHOLD = 5;
type ViewMode = "grid" | "table";

function fmt(n: number | undefined) {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function FinishedStockPageClient() {
  const isOwner = useIsOwner();
  const addToast = useUIStore((s) => s.addToast);

  const { data: products = [], isLoading } = useFinishedStock();

  const [search, setSearch] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<IFinishedProduct | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [printProducts, setPrintProducts] = useState<IFinishedProduct[]>([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const sizes = useMemo(
    () => [...new Set(products.map((p) => p.size))].sort(),
    [products]
  );

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.designName.toLowerCase().includes(q) ||
        p.designCode.toLowerCase().includes(q) ||
        p.barcodeId.toLowerCase().includes(q);
      const matchSize = !sizeFilter || p.size === sizeFilter;
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      return matchSearch && matchSize && matchCategory;
    });
  }, [products, search, sizeFilter, categoryFilter]);

  const lowStockProducts = products.filter((p) => p.readyStock < LOW_STOCK_THRESHOLD);

  async function handleScan(barcodeId: string) {
    setScannerOpen(false);
    try {
      const product = await lookupBarcode(barcodeId);
      addToast({ type: "success", message: `Found: ${product.designName} (${product.size})` });
      setSearch(product.barcodeId);
    } catch {
      addToast({ type: "error", message: "No product found for that barcode" });
    }
  }

  function handlePrintSingle(product: IFinishedProduct) {
    setPrintProducts([product]);
    setPrintOpen(true);
  }

  function handlePrintSelected() {
    const selected = products.filter((p) => selectedIds.has(p._id));
    if (selected.length === 0) {
      addToast({ type: "error", message: "Select at least one product to print" });
      return;
    }
    setPrintProducts(selected);
    setPrintOpen(true);
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Finished Stock</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {products.length} product{products.length !== 1 ? "s" : ""} in inventory
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setScannerOpen(true)}>
            <ScanLine size={13} className="mr-1.5" />
            Scan
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="outline" size="sm" onClick={handlePrintSelected}>
              <Printer size={13} className="mr-1.5" />
              Print {selectedIds.size}
            </Button>
          )}
          {isOwner && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={14} className="mr-1" />
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D32F2F]/10 mt-0.5">
            <AlertTriangle size={14} className="text-[#D32F2F]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#D32F2F]">
              Low Stock — {lowStockProducts.length} product{lowStockProducts.length !== 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-xs text-rose-600">
              {lowStockProducts.map((p) => `${p.designName} (${p.readyStock} pcs)`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Search + Filters + View toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search by name, code or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F] placeholder:text-slate-400"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={sizeFilter}
          onChange={(e) => setSizeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/30 focus:border-[#D32F2F]"
        >
          <option value="">All Sizes</option>
          {sizes.map((s) => (
            <option key={s} value={s}>Size {s}</option>
          ))}
        </select>
        {/* View toggle */}
        <div className="flex rounded-xl border border-slate-200 overflow-hidden self-end sm:self-auto shadow-sm">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("px-3 py-2 text-sm transition-colors", viewMode === "grid" ? "bg-[#D32F2F] text-white" : "bg-white text-slate-500 hover:bg-slate-50")}
            title="Grid view"
          >
            <Grid3x3 size={15} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={cn("px-3 py-2 text-sm transition-colors border-l border-slate-200", viewMode === "table" ? "bg-[#D32F2F] text-white" : "bg-white text-slate-500 hover:bg-slate-50")}
            title="Table view"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Gem size={40} className="text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">
            {products.length === 0 ? "No products yet. Add your first finished product." : "No products match your search."}
          </p>
          {isOwner && products.length === 0 && (
            <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus size={14} className="mr-1" /> Add Product
            </Button>
          )}
        </div>
      )}

      {/* Grid View */}
      {!isLoading && viewMode === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onPrint={handlePrintSingle}
              onEdit={setEditProduct}
              isSelected={selectedIds.has(product._id)}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {!isLoading && viewMode === "table" && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-left">
                <th className="px-3 py-3 w-8"><span className="sr-only">Select</span></th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Design</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Code</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Category</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Size</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Stock</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Selling ₹</th>
                {isOwner && (
                  <>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-600 text-right">Cost ₹</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-600 text-right">MRP ₹</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-600 text-right">Profit ₹</th>
                  </>
                )}
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((product) => {
                const isLow = product.readyStock < LOW_STOCK_THRESHOLD;
                return (
                  <tr
                    key={product._id}
                    className={cn("hover:bg-slate-50/80 transition-colors", selectedIds.has(product._id) ? "bg-rose-50" : "")}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product._id)}
                        onChange={() => toggleSelect(product._id)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#D32F2F]"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{product.designName}</td>
                    <td className="px-4 py-3 text-slate-500">{product.designCode}</td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{product.category || "—"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{product.size}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-bold tabular-nums", isLow ? "text-[#D32F2F]" : "text-slate-800")}>
                        {product.readyStock}
                      </span>
                      {isLow && <Badge variant="danger" className="ml-2 text-[9px]">Low</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 tabular-nums">{fmt(product.sellingPrice)}</td>
                    {isOwner && (
                      <>
                        <td className="px-4 py-3 text-right text-amber-700 tabular-nums">{fmt(product.totalCost)}</td>
                        <td className="px-4 py-3 text-right text-amber-700 tabular-nums">{fmt(product.MRP)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-medium tabular-nums">{fmt(product.profitPerPc)}</td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePrintSingle(product)}
                          className="text-slate-400 hover:text-slate-700 transition-colors"
                          title="Print label"
                        >
                          <Printer size={14} />
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => setEditProduct(product)}
                            className="text-xs font-semibold text-[#D32F2F] hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile FAB */}
      {isOwner && (
        <button
          onClick={() => setAddOpen(true)}
          className="fixed bottom-20 right-4 lg:hidden z-40 flex items-center justify-center rounded-2xl bg-[#D32F2F] text-white shadow-xl shadow-red-700/30 transition-all hover:bg-[#B71C1C] active:scale-95"
          aria-label="Add product"
          style={{ width: 52, height: 52 }}
        >
          <Plus size={22} />
        </button>
      )}

      {/* Modals */}
      <AddProductModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
      <AddProductModal isOpen={!!editProduct} onClose={() => setEditProduct(null)} product={editProduct} />
      <BarcodeScanner isOpen={scannerOpen} onScan={handleScan} onClose={() => setScannerOpen(false)} />
      <PrintBarcode
        products={printProducts}
        isOpen={printOpen}
        onClose={() => { setPrintOpen(false); setPrintProducts([]); }}
      />
    </div>
  );
}
