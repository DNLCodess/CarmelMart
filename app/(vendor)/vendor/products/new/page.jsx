"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save, AlertCircle, RotateCcw, Clock } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProductImageUploader from "@/components/shared/vendor/ProductImageUploader";

const DRAFT_KEY = "cm-new-product-draft";

async function fetchCategories() {
  const r = await fetch("/api/categories");
  return r.json();
}

function FieldError({ error }) {
  if (!error) return null;
  return (
    <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error.message}
    </p>
  );
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NewProductPage() {
  const router  = useRouter();
  const [images, setImages]             = useState([]);
  const [uploadedPaths, setUploadedPaths] = useState([]); // for potential cleanup
  const [draft, setDraft]               = useState(null);  // { values, savedAt, images }
  const [draftBanner, setDraftBanner]   = useState(false);
  const saveTimer = useRef(null);

  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn:  fetchCategories,
    staleTime: 300_000,
  });
  const categories = catData?.categories ?? [];

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { status: "active", stock: 0 },
  });

  const allValues = useWatch({ control });
  const price     = watch("price");
  const salePrice = watch("sale_price");

  // ── Load draft on mount ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.values) {
        setDraft(parsed);
        setDraftBanner(true);
      }
    } catch { /* corrupt JSON — ignore */ }
  }, []);

  const restoreDraft = useCallback(() => {
    if (!draft) return;
    reset(draft.values);
    if (draft.images?.length) setImages(draft.images);
    setDraftBanner(false);
    toast.success("Draft restored");
  }, [draft, reset]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraft(null);
    setDraftBanner(false);
    toast("Draft discarded", { icon: "🗑️" });
  }, []);

  // ── Auto-save draft on field change (debounced 1.5 s) ────────────────────
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const payload = {
          values:  allValues,
          images,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch { /* storage quota exceeded — ignore */ }
    }, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [allValues, images]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const { mutate: createProduct } = useMutation({
    mutationFn: async (data) => {
      const r = await fetch("/api/vendor/products", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        data.name,
          description: data.description,
          price:       Number(data.price),
          sale_price:  data.sale_price ? Number(data.sale_price) : null,
          stock:       Number(data.stock),
          category_id: data.category_id || null,
          status:      data.status,
          images,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to create product");
      return d;
    },
    onSuccess: () => {
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Product created successfully!");
      router.push("/vendor/products");
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data) => createProduct(data);

  const discount = salePrice && price && Number(salePrice) > 0 && Number(salePrice) < Number(price)
    ? Math.round(((Number(price) - Number(salePrice)) / Number(price)) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Products
      </Link>

      {/* Draft banner */}
      {draftBanner && draft && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-5 py-4">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-300 font-semibold">
            You have an unsaved draft from {timeAgo(draft.savedAt)}.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={restoreDraft}
              className="text-sm font-bold text-amber-800 dark:text-amber-300 bg-amber-200 dark:bg-amber-800 px-4 py-1.5 rounded-full hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Product Information ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Product Information</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name", {
                required: "Product name is required",
                minLength: { value: 3, message: "Name must be at least 3 characters" },
              })}
              placeholder="e.g. iPhone 15 Pro Max 256GB"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <FieldError error={errors.name} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              {...register("description")}
              rows={4}
              placeholder="Describe your product — size, material, condition, warranty…"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
            <select
              {...register("category_id")}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Pricing & Inventory ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Pricing & Inventory</h2>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Price (₦) <span className="text-red-500">*</span>
              </label>
              <input
                {...register("price", {
                  required: "Price is required",
                  min: { value: 1, message: "Price must be greater than 0" },
                })}
                type="number" min="0" step="any" placeholder="5000"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <FieldError error={errors.price} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Sale Price (₦) <span className="text-gray-400 dark:text-gray-500 font-normal">optional</span>
              </label>
              <input
                {...register("sale_price", {
                  validate: (v) => {
                    if (!v) return true;
                    if (Number(v) >= Number(price)) return "Sale price must be less than the regular price";
                    return true;
                  },
                })}
                type="number" min="0" step="any" placeholder="4500"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <FieldError error={errors.sale_price} />
              {discount && (
                <p className="mt-1.5 text-xs text-green-600 dark:text-green-400 font-semibold">{discount}% off</p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Stock Quantity</label>
              <input
                {...register("stock", { min: { value: 0, message: "Stock cannot be negative" } })}
                type="number" min="0" placeholder="100"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <FieldError error={errors.stock} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
              <select
                {...register("status")}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="active">Active — visible in store</option>
                <option value="draft">Draft — hidden from store</option>
                <option value="inactive">Inactive — out of stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Product Images ───────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Product Images</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Upload up to 8 images. The first image will be the main display image.
            </p>
          </div>
          <ProductImageUploader
            value={images}
            onChange={setImages}
            onPathAdded={(path) => setUploadedPaths((p) => [...p, path])}
          />
          {images.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
              At least one product image is strongly recommended — listings without images get fewer views.
            </p>
          )}
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pb-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-8 py-3 rounded-full hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSubmitting ? "Creating…" : "Create Product"}
          </button>
          <Link
            href="/vendor/products"
            className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          {/* Manual save draft button */}
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: allValues, images, savedAt: Date.now() }));
                toast.success("Draft saved");
              } catch {
                toast.error("Could not save draft");
              }
            }}
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Save draft
          </button>
        </div>
      </form>
    </div>
  );
}
