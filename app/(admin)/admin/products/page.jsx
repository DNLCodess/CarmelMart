"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Package, RefreshCw, CheckCircle, XCircle, Flag, Image as ImageIcon, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

async function fetchProducts(params) {
  const r = await fetch(`/api/admin/products?${params}`);
  return r.json();
}

async function moderateProduct(id, action, reason) {
  const r = await fetch(`/api/admin/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, reason }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Update failed");
  return d;
}

const MOD_CFG = {
  pending:  { label: "Pending Review", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
  approved: { label: "Approved",       cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" },
  rejected: { label: "Rejected",       cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" },
  flagged:  { label: "Flagged",        cls: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800" },
};

function ModBadge({ status }) {
  const c = MOD_CFG[status] ?? MOD_CFG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

function ReasonModal({ open, title, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)…"
          rows={3}
          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={() => { onConfirm(reason); setReason(""); }} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteProductConfirm({ product, onConfirm, onCancel, saving }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 mt-0.5">
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Delete Product</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Permanently delete <strong className="text-gray-700 dark:text-gray-200">{product.name}</strong>? This cannot be undone.
            </p>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-300">
          All associated reviews and order history referencing this product will lose their product link.
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors flex items-center gap-2"
          >
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            Delete Product
          </button>
        </div>
      </div>
    </div>
  );
}

const MOD_TABS = [
  { value: "",         label: "All"      },
  { value: "pending",  label: "Pending"  },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "flagged",  label: "Flagged"  },
  { value: "featured", label: "Featured" },
];

function ActionButtons({ p, onAction, onDelete, isPending }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onAction(p.id, p.featured ? "unfeature" : "feature")}
        disabled={isPending}
        title={p.featured ? "Remove from featured" : "Feature on homepage"}
        className={`p-2 rounded-lg transition-colors ${p.featured ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20" : "text-gray-400 dark:text-gray-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"}`}
      >
        <Star className={`w-4 h-4 ${p.featured ? "fill-amber-400" : ""}`} />
      </button>
      {p.moderationStatus !== "approved" && (
        <button
          onClick={() => onAction(p.id, "approve")}
          disabled={isPending}
          title="Approve"
          className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
        </button>
      )}
      {p.moderationStatus !== "rejected" && (
        <button
          onClick={() => onAction(p.id, "reject")}
          disabled={isPending}
          title="Reject"
          className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
      {p.moderationStatus !== "flagged" ? (
        <button
          onClick={() => onAction(p.id, "flag")}
          disabled={isPending}
          title="Flag for review"
          className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
        >
          <Flag className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => onAction(p.id, "unflag")}
          disabled={isPending}
          title="Remove flag"
          className="p-2 rounded-lg text-orange-500 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Flag className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={() => onDelete({ id: p.id, name: p.name })}
        title="Delete product"
        className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function ProductCard({ p, onAction, onDelete, isPending }) {
  return (
    <div className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 relative">
          {p.image ? (
            <Image src={p.image} alt={p.name} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <Link
              href={`/product/${p.id}`}
              target="_blank"
              className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-1 hover:underline"
            >
              {p.name}
            </Link>
            <ModBadge status={p.moderationStatus} />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">{p.category} · Added {p.createdAt}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.vendorName}</p>
          {p.moderationReason && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Reason: {p.moderationReason}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/60">
        <div>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
            ₦{(p.salePrice ?? p.price ?? 0).toLocaleString()}
          </span>
          {p.salePrice && (
            <span className="text-xs line-through text-gray-400 dark:text-gray-500 ml-1.5">
              ₦{p.price.toLocaleString()}
            </span>
          )}
        </div>
        <ActionButtons p={p} onAction={onAction} onDelete={onDelete} isPending={isPending} />
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const urlParams = useSearchParams();
  const [modFilter, setModFilter] = useState("pending");
  const [search, setSearch]       = useState(urlParams.get("search") ?? "");
  const [page, setPage]           = useState(1);
  const [modal, setModal]         = useState(null); // { id, action, title }
  const [delProduct, setDelProduct] = useState(null); // { id, name }

  const params = new URLSearchParams({ page });
  if (modFilter === "featured") params.set("featured", "true");
  else if (modFilter)           params.set("moderation_status", modFilter);
  if (search)                   params.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", modFilter, search, page],
    queryFn: () => fetchProducts(params.toString()),
    staleTime: 30_000,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: ({ id, action, reason }) => moderateProduct(id, action, reason),
    onSuccess: (_, { action }) => {
      const labels = { approve: "approved", reject: "rejected", flag: "flagged", unflag: "approved", feature: "featured", unfeature: "unfeatured" };
      toast.success(`Product ${labels[action] ?? action}`);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Delete failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setDelProduct(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAction = (id, action) => {
    if (action === "approve" || action === "unflag" || action === "feature" || action === "unfeature") {
      mutation.mutate({ id, action });
    } else {
      setModal({ id, action, title: action === "reject" ? "Reject Product" : "Flag Product" });
    }
  };

  const products = data?.products ?? [];
  const pages    = data?.pages ?? 1;
  const total    = data?.total ?? 0;

  return (
    <div className="space-y-5">
      <ReasonModal
        open={!!modal}
        title={modal?.title}
        onConfirm={(reason) => {
          mutation.mutate({ id: modal.id, action: modal.action, reason });
          setModal(null);
        }}
        onCancel={() => setModal(null)}
      />
      <DeleteProductConfirm
        product={delProduct}
        saving={deleteMutation.isPending}
        onCancel={() => setDelProduct(null)}
        onConfirm={() => deleteMutation.mutate(delProduct.id)}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Product Moderation</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total.toLocaleString()} products</p>
        </div>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
        {MOD_TABS.map(({ value, label }) => (
          <button
            key={label}
            onClick={() => { setModFilter(value); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              modFilter === value
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Product list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-14 text-center">
            <Package className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">No products found</p>
          </div>
        ) : (
          <>
            {/* Mobile card list — hidden on lg+ */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  onAction={handleAction}
                  onDelete={setDelProduct}
                  isPending={mutation.isPending}
                />
              ))}
            </div>

            {/* Desktop table — hidden below lg */}
            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Product</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vendor</th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Price</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 relative">
                            {p.image ? (
                              <Image src={p.image} alt={p.name} fill className="object-cover" sizes="48px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/product/${p.id}`}
                              target="_blank"
                              className="font-semibold text-gray-900 dark:text-gray-100 hover:underline line-clamp-1"
                            >
                              {p.name}
                            </Link>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{p.category} · Added {p.createdAt}</p>
                            {p.moderationReason && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Reason: {p.moderationReason}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{p.vendorName}</p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          ₦{(p.salePrice ?? p.price ?? 0).toLocaleString()}
                        </span>
                        {p.salePrice && (
                          <p className="text-xs line-through text-gray-400 dark:text-gray-500">₦{p.price.toLocaleString()}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <ModBadge status={p.moderationStatus} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <ActionButtons p={p} onAction={handleAction} onDelete={setDelProduct} isPending={mutation.isPending} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
