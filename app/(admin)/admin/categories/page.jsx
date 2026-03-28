"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag, Plus, Pencil, Trash2, RefreshCw, X, Check } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import SingleImageUpload from "@/components/shared/admin/SingleImageUpload";

async function fetchCategories() {
  const r = await fetch("/api/admin/categories");
  return r.json();
}

function CategoryModal({ open, initial, categories, onClose, onSave, saving }) {
  const [name,     setName]     = useState(initial?.name     ?? "");
  const [slug,     setSlug]     = useState(initial?.slug     ?? "");
  const [image,    setImage]    = useState(initial?.image    ?? "");
  const [parentId, setParentId] = useState(initial?.parentId ?? "");

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    onSave({ name: name.trim(), slug: slug.trim(), image: image.trim(), parent_id: parentId || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{initial ? "Edit Category" : "New Category"}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Name *</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!initial) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
              }}
              placeholder="e.g. Electronics"
              required
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-generated from name"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Parent Category</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">None (top-level)</option>
              {categories
                .filter((c) => !initial || c.id !== initial.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              }
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Category Image</label>
            <SingleImageUpload
              value={image || null}
              onChange={(url) => setImage(url ?? "")}
              context="categories"
              label="Upload category image"
              aspectHint="Square recommended"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors flex items-center gap-2">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {initial ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ category, onConfirm, onCancel, saving }) {
  if (!category) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100">Delete Category</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete <strong>{category.name}</strong>?
          {category.productCount > 0 && (
            <span className="block mt-1 text-red-600 dark:text-red-400">
              This category has {category.productCount} product(s) and cannot be deleted.
            </span>
          )}
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            Cancel
          </button>
          {category.productCount === 0 && (
            <button onClick={onConfirm} disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors flex items-center gap-2">
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [modal,  setModal]  = useState(null); // null | { mode: "create" } | { mode: "edit", category }
  const [delCat, setDelCat] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchCategories,
    staleTime: 60_000,
    retry: false,
  });

  const categories = data?.categories ?? [];

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const url    = id ? `/api/admin/categories/${id}` : "/api/admin/categories";
      const method = id ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Delete failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setDelCat(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const parentMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-5">
      <CategoryModal
        key={modal?.category?.id ?? "new"}
        open={!!modal}
        initial={modal?.category}
        categories={categories}
        saving={saveMutation.isPending}
        onClose={() => setModal(null)}
        onSave={(payload) => saveMutation.mutate({ id: modal?.category?.id, payload })}
      />
      <DeleteConfirm
        category={delCat}
        saving={deleteMutation.isPending}
        onCancel={() => setDelCat(null)}
        onConfirm={() => deleteMutation.mutate(delCat.id)}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Categories</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{categories.length} categories</p>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading categories…</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-14 text-center">
            <Tag className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">No categories yet</p>
            <button onClick={() => setModal({ mode: "create" })} className="mt-3 text-sm text-primary hover:underline font-semibold">
              Create your first category
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Parent</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Slug</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Products</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {c.image ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 relative">
                            <Image src={c.image} alt={c.name} fill className="object-cover" sizes="40px" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                            <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Added {c.createdAt}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-gray-500 dark:text-gray-400">
                      {c.parentId ? parentMap[c.parentId] ?? "—" : <span className="text-gray-300 dark:text-gray-600">Top-level</span>}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell font-mono text-xs text-gray-500 dark:text-gray-400">{c.slug}</td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">{c.productCount}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ mode: "edit", category: c })}
                          title="Edit"
                          className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDelCat(c)}
                          title="Delete"
                          className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
    </div>
  );
}
