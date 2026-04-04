"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Eye, Edit2, Trash2, Package, Image as ImageIcon, RefreshCw, CheckSquare, Square, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

async function fetchVendorProducts() {
  const r = await fetch("/api/vendor/products");
  return r.json();
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorProductsPage() {
  const qc              = useQueryClient();
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selected, setSelected]         = useState(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-products"],
    queryFn: fetchVendorProducts,
    staleTime: 30_000,
    retry: false,
  });

  const products = data?.products ?? [];

  const { mutate: bulkStatus, isPending: bulking } = useMutation({
    mutationFn: ({ ids, status }) =>
      fetch("/api/vendor/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...ids], status }),
      }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      toast.success(`${d.updated} product${d.updated !== 1 ? "s" : ""} updated`);
      setSelected(new Set());
      setBulkMenuOpen(false);
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
    },
    onError: () => toast.error("Bulk update failed"),
  });

  const { mutate: deleteProduct, isPending: deleting } = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/vendor/products/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Delete failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const statusCounts = useMemo(() => ({
    all:      products.length,
    active:   products.filter((p) => p.status === "active").length,
    draft:    products.filter((p) => p.status === "draft").length,
    inactive: products.filter((p) => p.status === "inactive").length,
  }), [products]);

  const filtered = products.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.id)));
  const toggleOne   = (id) => setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="space-y-5">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-primary">{selected.size} selected</span>
          <div className="relative ml-auto">
            <button
              onClick={() => setBulkMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors"
            >
              Set Status <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {bulkMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden w-36">
                {["draft", "inactive"].map((s) => (
                  <button
                    key={s}
                    onClick={() => bulkStatus({ ids: selected, status: s })}
                    disabled={bulking}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 capitalize transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            Clear
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl shrink-0">
          {["all", "active", "draft", "inactive"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                statusFilter === s ? "bg-white dark:bg-gray-600 text-primary shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {s} ({statusCounts[s]})
            </button>
          ))}
        </div>
        <Link
          href="/vendor/products/new"
          className="flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      {/* Products table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading products…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <Package className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
              {search || statusFilter !== "all" ? "No matching products" : "No products yet"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters."
                : "Start adding products to your store."}
            </p>
            <Link
              href="/vendor/products/new"
              className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Add First Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="pl-4 pr-2 py-3.5 w-8">
                    <button onClick={toggleAll} className="text-gray-400 hover:text-primary transition-colors">
                      {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Product</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Price</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Stock</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filtered.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors ${selected.has(p.id) ? "bg-primary/5 dark:bg-primary/10" : ""}`}>
                    <td className="pl-4 pr-2 py-4">
                      <button onClick={() => toggleOne(p.id)} className="text-gray-400 hover:text-primary transition-colors">
                        {selected.has(p.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                          {p.image ? (
                            <Image src={p.image} alt={p.name} fill className="object-cover" sizes="44px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-gray-300 dark:text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{p.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{p.sold_count || 0} sold · ⭐ {p.avg_rating || "–"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400 hidden md:table-cell">{p.category?.name ?? "–"}</td>
                    <td className="px-5 py-4 text-right">
                      <p className="font-bold text-gray-900 dark:text-gray-100">₦{(p.sale_price ?? p.price).toLocaleString()}</p>
                      {p.sale_price && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 line-through">₦{p.price.toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center hidden sm:table-cell">
                      <span className={`font-semibold ${p.stock === 0 ? "text-red-500" : p.stock < 5 ? "text-amber-600" : "text-gray-900 dark:text-gray-100"}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {p.moderation_status === "pending" ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                          Pending Review
                        </span>
                      ) : p.moderation_status === "rejected" ? (
                        <div>
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                            Rejected
                          </span>
                          {p.moderation_reason && (
                            <p className="text-[11px] text-red-500 dark:text-red-400 mt-1 max-w-[120px] mx-auto" title={p.moderation_reason}>
                              {p.moderation_reason.length > 40 ? p.moderation_reason.slice(0, 40) + "…" : p.moderation_reason}
                            </p>
                          )}
                        </div>
                      ) : p.moderation_status === "flagged" ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                          Flagged
                        </span>
                      ) : (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          p.status === "active"
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}>
                          {p.status === "active" ? "Live" : p.status}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/product/${p.id}`}
                          className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
                          title="View in store"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/vendor/products/${p.id}/edit`}
                          className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product?"
        message={`"${deleteTarget?.name}" will be permanently removed from your store. This cannot be undone.`}
        onConfirm={() => deleteProduct(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
