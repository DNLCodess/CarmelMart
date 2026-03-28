"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, GripVertical, Eye, EyeOff, Image, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import SingleImageUpload from "@/components/shared/admin/SingleImageUpload";

async function fetchBanners() {
  const r = await fetch("/api/admin/hero-banners");
  return r.json();
}

const BADGE_COLORS = [
  { label: "Primary",  value: "bg-primary"      },
  { label: "Red",      value: "bg-red-500"       },
  { label: "Green",    value: "bg-green-600"     },
  { label: "Blue",     value: "bg-blue-600"      },
  { label: "Amber",    value: "bg-amber-500"     },
  { label: "Violet",   value: "bg-violet-600"    },
];

const EMPTY_FORM = {
  title: "", subtitle: "", description: "", cta_label: "Shop Now", cta_href: "/shop",
  image_url: "", badge_text: "", badge_color: "bg-primary", active: true, sort_order: "99",
};

function BannerModal({ open, banner, onClose, onSave, isSaving }) {
  const [form, setForm] = useState(banner ?? EMPTY_FORM);

  if (!open) return null;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim())    { toast.error("Title is required"); return; }
    if (!form.image_url)       { toast.error("Banner image is required"); return; }
    if (!form.cta_href.trim()) { toast.error("CTA link is required"); return; }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-5">
          {banner ? "Edit Banner Slide" : "Add Banner Slide"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Title *</label>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} required
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Fresh Produce & Groceries" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Subtitle</label>
              <input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Farm to Table" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Badge Text</label>
              <input value={form.badge_text} onChange={(e) => set("badge_text", e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                placeholder="New Collection" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Description</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 resize-none"
                placeholder="Short description shown on the hero slide…" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Banner Image *</label>
              <SingleImageUpload
                value={form.image_url || null}
                onChange={(url) => set("image_url", url ?? "")}
                context="banners"
                label="Upload banner image"
                aspectHint="16:9 recommended · min 1200×400px"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">CTA Label</label>
              <input value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Shop Now" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">CTA Link *</label>
              <input value={form.cta_href} onChange={(e) => set("cta_href", e.target.value)} required
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                placeholder="/shop" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Badge Color</label>
              <select value={form.badge_color} onChange={(e) => set("badge_color", e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100">
                {BADGE_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} min={0}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                placeholder="0" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => set("active", !form.active)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${form.active ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? "translate-x-4" : ""}`} />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{form.active ? "Active (visible on homepage)" : "Inactive (hidden)"}</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 text-sm font-bold text-white bg-primary hover:opacity-90 disabled:opacity-50 rounded-xl transition-opacity">
              {isSaving ? "Saving…" : banner ? "Save Changes" : "Add Slide"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ open, title, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">Delete Slide?</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          "<span className="font-semibold">{title}</span>" will be permanently removed from the homepage hero.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HeroBannersPage() {
  const qc = useQueryClient();
  const [modal, setModal]             = useState(null); // null | banner object (edit) | {} (add)
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-hero-banners"],
    queryFn: fetchBanners,
    staleTime: 30_000,
    retry: false,
  });

  const banners = data?.banners ?? [];

  const { mutate: saveBanner, isPending: saving } = useMutation({
    mutationFn: async (form) => {
      const isEdit = !!form.id;
      const url    = isEdit ? `/api/admin/hero-banners/${form.id}` : "/api/admin/hero-banners";
      const r      = await fetch(url, {
        method:  isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Save failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Banner saved");
      qc.invalidateQueries({ queryKey: ["admin-hero-banners"] });
      setModal(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: async ({ id, active }) => {
      const r = await fetch(`/api/admin/hero-banners/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ active }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Update failed");
      return d;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hero-banners"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const { mutate: deleteBanner } = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/admin/hero-banners/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Delete failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Banner deleted");
      qc.invalidateQueries({ queryKey: ["admin-hero-banners"] });
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Hero Banners</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage the homepage hero slideshow. Changes go live immediately.</p>
        </div>
        <button
          onClick={() => setModal(EMPTY_FORM)}
          className="flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Slide
        </button>
      </div>

      {/* Live preview note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-5 py-3.5 text-sm text-blue-800 dark:text-blue-300">
        <span className="font-bold">Note:</span> Hero slides are served from the database. The homepage fetches active slides ordered by <span className="font-mono text-xs">sort_order</span> (lowest first). Up to 5 active slides are shown.
      </div>

      {/* Banners list */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading banners…</p>
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-14 text-center">
          <Image className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">No banners yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add your first hero slide to get started.</p>
          <button
            onClick={() => setModal(EMPTY_FORM)}
            className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add First Slide
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div
              key={b.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl border ${b.active ? "border-gray-100 dark:border-gray-700" : "border-dashed border-gray-200 dark:border-gray-600 opacity-60"} overflow-hidden`}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Drag handle (visual only) */}
                <GripVertical className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 cursor-grab" />

                {/* Thumbnail */}
                <div className="w-20 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{b.title}</p>
                    {b.badge_text && (
                      <span className={`px-2 py-0.5 text-xs font-bold text-white rounded-full ${b.badge_color || "bg-primary"}`}>{b.badge_text}</span>
                    )}
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${b.active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                      {b.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {b.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{b.subtitle}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    CTA: <span className="font-mono">{b.cta_label}</span> → <span className="font-mono">{b.cta_href}</span>
                    <span className="ml-3">Order: {b.sort_order}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive({ id: b.id, active: !b.active })}
                    className={`p-2 rounded-lg transition-colors ${b.active ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                    title={b.active ? "Deactivate" : "Activate"}
                  >
                    {b.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setModal(b)}
                    className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BannerModal
        key={modal?.id ?? "new"}
        open={!!modal}
        banner={modal?.id ? modal : null}
        onClose={() => setModal(null)}
        onSave={(form) => saveBanner(modal?.id ? { ...form, id: modal.id } : form)}
        isSaving={saving}
      />

      <DeleteConfirm
        open={!!deleteTarget}
        title={deleteTarget?.title}
        onConfirm={() => deleteBanner(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
