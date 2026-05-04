"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Fragment } from "react";
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Package,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import SingleImageUpload from "@/components/shared/admin/SingleImageUpload";

async function fetchCategories() {
  const r = await fetch("/api/admin/categories");
  return r.json();
}

async function fetchCategoryProducts(categoryId) {
  const r = await fetch(
    `/api/admin/products?category_id=${categoryId}&limit=100`,
  );
  return r.json();
}

// ─── Moderation badge ────────────────────────────────────────────────────────

const MOD_CFG = {
  pending: {
    label: "Pending",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  },
  approved: {
    label: "Approved",
    cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  },
  flagged: {
    label: "Flagged",
    cls: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  },
};

function ModBadge({ status }) {
  const c = MOD_CFG[status] ?? MOD_CFG.pending;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}
    >
      {c.label}
    </span>
  );
}

// ─── Category create/edit modal ───────────────────────────────────────────────

function CategoryModal({ open, initial, categories, onClose, onSave, saving }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [parentId, setParentId] = useState(initial?.parentId ?? "");

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    onSave({
      name: name.trim(),
      slug: slug.trim(),
      image: image.trim(),
      parent_id: parentId || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">
            {initial ? "Edit Category" : "New Category"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Name *
            </label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!initial)
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  );
              }}
              placeholder="e.g. Electronics"
              required
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Slug
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-generated from name"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Parent Category
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">None (top-level)</option>
              {categories
                .filter((c) => !initial || c.id !== initial.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Category Image
            </label>
            <SingleImageUpload
              value={image || null}
              onChange={(url) => setImage(url ?? "")}
              context="categories"
              label="Upload category image"
              aspectHint="Square recommended"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {initial ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Category delete modal ────────────────────────────────────────────────────

function DeleteCategoryConfirm({ category, onConfirm, onCancel, saving }) {
  const [checked, setChecked] = useState(false);

  if (!category) return null;
  const hasProd = category.productCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 mt-0.5">
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              Delete &ldquo;{category.name}&rdquo;
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {hasProd
                ? `This category contains ${category.productCount} product${category.productCount !== 1 ? "s" : ""}. Deleting it will permanently remove all of them.`
                : "This category has no products and will be permanently deleted."}
            </p>
          </div>
        </div>

        {hasProd && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
              Destructive action
            </p>
            <p className="text-sm text-red-600 dark:text-red-300">
              <strong>{category.productCount}</strong> product
              {category.productCount !== 1 ? "s" : ""} will be permanently
              deleted and cannot be recovered.
            </p>
            <label className="flex items-start gap-2.5 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 accent-red-600 w-4 h-4 shrink-0"
              />
              <span className="text-sm text-red-700 dark:text-red-300 leading-snug">
                I understand all products in this category will be permanently
                deleted
              </span>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(hasProd)}
            disabled={saving || (hasProd && !checked)}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-2"
          >
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {hasProd ? "Delete Category + Products" : "Delete Category"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product delete modal ─────────────────────────────────────────────────────

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
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              Delete Product
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Permanently delete{" "}
              <strong className="text-gray-700 dark:text-gray-200">
                {product.name}
              </strong>
              ? This cannot be undone.
            </p>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-300">
          Order history referencing this product will lose its product link.
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

// ─── Inline product list for an expanded category ─────────────────────────────

function CategoryProducts({ categoryId, onDelete }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-cat-products", categoryId],
    queryFn: () => fetchCategoryProducts(categoryId),
    staleTime: 30_000,
  });

  const products = data?.products ?? [];

  if (isLoading) {
    return (
      <div className="px-6 py-4 flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        Loading products…
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="px-6 py-5 text-center">
        <Package className="w-7 h-7 text-gray-200 dark:text-gray-600 mx-auto mb-1.5" />
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No products in this category
        </p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-gray-100 dark:border-gray-700">
        <tr>
          <th className="pl-14 pr-5 py-2.5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Product
          </th>
          <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden md:table-cell">
            Vendor
          </th>
          <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Price
          </th>
          <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden sm:table-cell">
            Status
          </th>
          <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
        {products.map((p) => (
          <tr
            key={p.id}
            className="hover:bg-white dark:hover:bg-gray-800/60 transition-colors"
          >
            <td className="pl-14 pr-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 relative">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200 line-clamp-1 max-w-[180px]">
                  {p.name}
                </span>
              </div>
            </td>
            <td className="px-5 py-3 hidden md:table-cell text-xs text-gray-500 dark:text-gray-400">
              {p.vendorName}
            </td>
            <td className="px-5 py-3 text-right text-xs font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
              {p.salePrice ? (
                <span>
                  ₦{p.salePrice.toLocaleString()}
                  <span className="line-through text-gray-400 ml-1">
                    ₦{p.price.toLocaleString()}
                  </span>
                </span>
              ) : (
                `₦${(p.price || 0).toLocaleString()}`
              )}
            </td>
            <td className="px-5 py-3 hidden sm:table-cell">
              <ModBadge status={p.moderationStatus} />
            </td>
            <td className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-0.5">
                <Link
                  href={`/admin/products?search=${encodeURIComponent(p.name)}`}
                  title="Edit / moderate on products page"
                  className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/product/${p.id}`}
                  target="_blank"
                  title="View on storefront"
                  className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() =>
                    onDelete({ id: p.id, name: p.name, categoryId })
                  }
                  title="Delete product"
                  className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | { mode, category }
  const [delCat, setDelCat] = useState(null); // category object
  const [delProduct, setDelProduct] = useState(null); // { id, name, categoryId }
  const [expandedId, setExpandedId] = useState(null); // category id | null

  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchCategories,
    staleTime: 60_000,
    retry: false,
  });

  const categories = data?.categories ?? [];

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const url = id ? `/api/admin/categories/${id}` : "/api/admin/categories";
      const method = id ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Save failed");
      return d;
    },
    onSuccess: (_, { id }) => {
      toast.success(id ? "Category updated" : "Category created");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setModal(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async ({ id, force }) => {
      const url = `/api/admin/categories/${id}${force ? "?force=true" : ""}`;
      const r = await fetch(url, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Delete failed");
      return d;
    },
    onSuccess: (data) => {
      toast.success(
        data.deletedProducts > 0
          ? `Category deleted along with ${data.deletedProducts} product${data.deletedProducts !== 1 ? "s" : ""}`
          : "Category deleted",
      );
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setDelCat(null);
      setExpandedId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async ({ id }) => {
      const r = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Delete failed");
      return d;
    },
    onSuccess: (_, { categoryId }) => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["admin-cat-products", categoryId] });
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setDelProduct(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const parentMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const toggleExpand = (id) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-5">
      <CategoryModal
        key={modal?.category?.id ?? "new"}
        open={!!modal}
        initial={modal?.category}
        categories={categories}
        saving={saveMutation.isPending}
        onClose={() => setModal(null)}
        onSave={(payload) =>
          saveMutation.mutate({ id: modal?.category?.id, payload })
        }
      />
      <DeleteCategoryConfirm
        category={delCat}
        saving={deleteCategoryMutation.isPending}
        onCancel={() => setDelCat(null)}
        onConfirm={(force) =>
          deleteCategoryMutation.mutate({ id: delCat.id, force })
        }
      />
      <DeleteProductConfirm
        product={delProduct}
        saving={deleteProductMutation.isPending}
        onCancel={() => setDelProduct(null)}
        onConfirm={() =>
          deleteProductMutation.mutate({
            id: delProduct.id,
            categoryId: delProduct.categoryId,
          })
        }
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">
            Categories
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {categories.length} categories
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading categories…
            </p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-14 text-center">
            <Tag className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">
              No categories yet
            </p>
            <button
              onClick={() => setModal({ mode: "create" })}
              className="mt-3 text-sm text-primary hover:underline font-semibold"
            >
              Create your first category
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">
                    Parent
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">
                    Slug
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Products
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {categories.map((c) => {
                  const isExpanded = expandedId === c.id;
                  return (
                    <Fragment key={c.id}>
                      {/* Category row */}
                      <tr
                        className={`transition-colors ${isExpanded ? "bg-gray-50/80 dark:bg-gray-700/30" : "hover:bg-gray-50/50 dark:hover:bg-gray-700/50"}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {c.image ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 relative">
                                <Image
                                  src={c.image}
                                  alt={c.name}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {c.name}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Added {c.createdAt}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-gray-500 dark:text-gray-400">
                          {c.parentId ? (
                            (parentMap[c.parentId] ?? "—")
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">
                              Top-level
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell font-mono text-xs text-gray-500 dark:text-gray-400">
                          {c.slug}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => toggleExpand(c.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              isExpanded
                                ? "bg-primary/10 text-primary dark:text-white dark:bg-primary/20"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-white"
                            } ${c.productCount === 0 ? "opacity-50 cursor-default pointer-events-none" : "cursor-pointer"}`}
                            disabled={c.productCount === 0}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                            {c.productCount}
                          </button>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                setModal({ mode: "edit", category: c })
                              }
                              title="Edit category"
                              className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors dark:hover:text-white"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDelCat(c)}
                              title="Delete category"
                              className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded product rows */}
                      {isExpanded && (
                        <tr
                          key={`${c.id}-products`}
                          className="bg-gray-50/50 dark:bg-gray-900/20"
                        >
                          <td colSpan={5} className="p-0">
                            <CategoryProducts
                              categoryId={c.id}
                              onDelete={setDelProduct}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
