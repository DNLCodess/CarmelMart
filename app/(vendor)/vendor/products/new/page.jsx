"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCategories } from "@/lib/useCategories";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Save, AlertCircle, RotateCcw, Clock, Upload, X,
  BookOpen, Package, Download, Layers, Info, Plus, Trash2, Tag,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProductImageUploader from "@/components/shared/vendor/ProductImageUploader";
import VariantOptionPicker from "@/components/shared/vendor/VariantOptionPicker";
import { getTemplate } from "@/lib/product-templates";

async function fetchVariantPresets() {
  const r = await fetch("/api/vendor/variant-presets");
  if (!r.ok) return [];
  const d = await r.json();
  return d.presets ?? [];
}

const DRAFT_KEY = "cm-new-product-draft";

const MEDIA_FORMATS = [
  "Hardcover", "Paperback", "eBook", "Audiobook",
  "CD", "DVD", "Blu-ray", "Vinyl", "Digital Download",
];

const MEDIA_GENRES = [
  "Fiction", "Non-Fiction", "Biography", "Self-Help", "Business",
  "Science & Technology", "Religion & Spirituality", "Children's",
  "Romance", "Thriller & Mystery", "History", "Education & Textbooks",
  "Arts & Music", "Health & Wellness", "Travel",
  "Nollywood", "Hollywood", "Gospel", "Afrobeats", "Classical",
  "Action", "Comedy", "Drama", "Horror", "Documentary",
];

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

// Cartesian product of arrays
function cartesian(arrays) {
  if (!arrays.length) return [[]];
  const [first, ...rest] = arrays;
  const restProd = cartesian(rest);
  return first.flatMap((v) => restProd.map((r) => [v, ...r]));
}

export default function NewProductPage() {
  const router    = useRouter();
  const [images, setImages]               = useState([]);
  const [uploadedPaths, setUploadedPaths] = useState([]);
  const [draft, setDraft]                 = useState(null);
  const [draftBanner, setDraftBanner]     = useState(false);
  const [condition, setCondition]         = useState("new");

  // Extra template fields (material, brand, etc.) — stored in attributes JSONB
  const [attributes, setAttributes]       = useState({});

  // Variant/options state
  const [variantType, setVariantType]           = useState("none"); // "none" | "descriptive" | "variants"
  const [descriptiveOptions, setDescriptiveOptions] = useState({});   // { color: ["Red","Blue"], size: ["M","L"] }
  const [selectedDimOptions, setSelectedDimOptions] = useState({});   // for variant builder dimension pickers
  const [variantRows, setVariantRows]           = useState([]);        // [{ _id, combination, stock, price }]

  // Vendor's saved option presets (custom sizes, colours…)
  const { data: variantPresets = [] } = useQuery({
    queryKey: ["vendor-variant-presets"],
    queryFn: fetchVariantPresets,
    staleTime: 60_000,
  });

  // Quantity / bulk pricing state
  const [enableQtyPricing, setEnableQtyPricing] = useState(false);
  const [quantityTiers, setQuantityTiers]       = useState([{ min_qty: "", price: "" }]);

  const saveTimer = useRef(null);

  // Books & Media state
  const [mediaFields, setMediaFields] = useState({
    media_author:       "",
    media_isbn:         "",
    media_publisher:    "",
    media_publish_date: "",
    media_edition:      "",
    media_pages:        "",
    media_language:     "English",
    media_format:       "",
    media_genre:        [],
    delivery_type:      "physical",
    digital_price:      "",
  });
  const [digitalFile,        setDigitalFile]        = useState(null);
  const [digitalUploading,   setDigitalUploading]   = useState(false);

  const setMedia = (key, value) => setMediaFields((prev) => ({ ...prev, [key]: value }));
  const toggleGenre = (g) => setMedia("media_genre",
    mediaFields.media_genre.includes(g)
      ? mediaFields.media_genre.filter((x) => x !== g)
      : [...mediaFields.media_genre, g]
  );

  const { categories, parents: parentCategories, subsByParent } = useCategories();
  const [parentCategoryId, setParentCategoryId] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { status: "inactive", stock: 0 } });

  const allValues  = useWatch({ control });
  const price      = watch("price");
  const salePrice  = watch("sale_price");
  const categoryId = watch("category_id");

  const currentSubs    = subsByParent[parentCategoryId] ?? [];
  const selectedCat    = categories.find((c) => String(c.id) === String(categoryId));
  // effectiveTemplate is resolved (inherits from parent when subcategory template is null)
  const categoryTemplate = selectedCat?.effectiveTemplate ?? selectedCat?.template ?? "standard";
  const isMediaCategory  = categoryTemplate === "books_media";
  const template         = getTemplate(categoryTemplate);

  const handleParentChange = (e) => {
    const pid = e.target.value;
    setParentCategoryId(pid);
    const subs = subsByParent[pid] ?? [];
    setValue("category_id", subs.length === 0 ? pid : "");
    setAttributes({});
    setVariantType("none");
    setDescriptiveOptions({});
    setSelectedDimOptions({});
    setVariantRows([]);
  };

  // ── Variant builder helpers ────────────────────────────────────────────────

  const toggleDescriptiveOption = (dimKey, value) => {
    setDescriptiveOptions((prev) => {
      const cur = prev[dimKey] ?? [];
      return {
        ...prev,
        [dimKey]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      };
    });
  };

  const toggleSelectedDimOption = (dimKey, value) => {
    setSelectedDimOptions((prev) => {
      const cur = prev[dimKey] ?? [];
      return {
        ...prev,
        [dimKey]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      };
    });
  };

  // Merge a saved preset's values into the current selection for a dimension
  const mergeValues = (cur, values) => {
    const next = [...cur];
    for (const v of values) if (!next.includes(v)) next.push(v);
    return next;
  };
  const applyPresetToDescriptive = (dimKey, values) =>
    setDescriptiveOptions((prev) => ({ ...prev, [dimKey]: mergeValues(prev[dimKey] ?? [], values) }));
  const applyPresetToVariants = (dimKey, values) =>
    setSelectedDimOptions((prev) => ({ ...prev, [dimKey]: mergeValues(prev[dimKey] ?? [], values) }));

  const generateCombinations = useCallback(() => {
    const activeDims = template.variantDimensions.filter(
      (d) => (selectedDimOptions[d.key] ?? []).length > 0
    );
    if (!activeDims.length) { setVariantRows([]); return; }

    const combos = cartesian(activeDims.map((d) => selectedDimOptions[d.key]));
    setVariantRows((prev) => {
      const prevMap = {};
      prev.forEach((r) => { prevMap[JSON.stringify(r.combination)] = r; });
      return combos.map((values) => {
        const combination = Object.fromEntries(activeDims.map((d, i) => [d.key, values[i]]));
        const key = JSON.stringify(combination);
        return prevMap[key] ?? { _id: `v_${Date.now()}_${Math.random()}`, combination, stock: "", price: "" };
      });
    });
  }, [template.variantDimensions, selectedDimOptions]);

  const updateVariantRow = (id, field, value) =>
    setVariantRows((prev) => prev.map((r) => (r._id === id ? { ...r, [field]: value } : r)));

  const removeVariantRow = (id) =>
    setVariantRows((prev) => prev.filter((r) => r._id !== id));

  // ── Draft ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.values) { setDraft(parsed); setDraftBanner(true); }
    } catch { /* corrupt JSON */ }
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

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: allValues, images, savedAt: Date.now() }));
      } catch { /* quota */ }
    }, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [allValues, images]);

  // ── Digital file upload ───────────────────────────────────────────────────

  const handleDigitalFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDigitalUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/vendor/products/upload-digital", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Upload failed");
      setDigitalFile({ name: file.name, path: d.path, size: d.size });
      toast.success("File uploaded");
    } catch (err) {
      toast.error(err.message || "File upload failed. Please try again.");
    } finally {
      setDigitalUploading(false);
    }
  };

  const removeDigitalFile = async () => {
    if (!digitalFile) return;
    try {
      await fetch("/api/vendor/products/upload-digital", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: digitalFile.path }),
      });
    } catch { /* non-critical */ }
    setDigitalFile(null);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const { mutate: createProduct } = useMutation({
    mutationFn: async (data) => {
      const isDigital     = isMediaCategory && mediaFields.delivery_type !== "physical";
      const isDigitalOnly = isMediaCategory && mediaFields.delivery_type === "digital";
      if (isDigital && !digitalFile) throw new Error("Please upload a digital file for this product");

      // Build attributes object: extra template fields + descriptive options
      const baseAttributes = Object.fromEntries(
        Object.entries(attributes).filter(([, v]) =>
          Array.isArray(v) ? v.length > 0 : v?.toString().trim()
        )
      );
      const descriptiveAttrs = variantType === "descriptive"
        ? Object.fromEntries(Object.entries(descriptiveOptions).filter(([, v]) => v.length > 0))
        : {};

      // Base stock: for variants mode, sum of all variant stocks
      const baseStock = variantType === "variants"
        ? variantRows.reduce((sum, r) => sum + Number(r.stock || 0), 0)
        : Number(data.stock ?? 0);

      const r = await fetch("/api/vendor/products", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:             data.name,
          description:      data.description,
          price:            Number(data.price),
          sale_price:       data.sale_price ? Number(data.sale_price) : null,
          stock:            isDigitalOnly ? 9999 : baseStock,
          category_id:      data.category_id || null,
          status:           data.status,
          images,
          condition,
          attributes:       { ...baseAttributes, ...descriptiveAttrs },
          variant_type:     variantType,
          quantity_tiers:   enableQtyPricing
            ? quantityTiers.filter((t) => t.min_qty && t.price).map((t) => ({
                min_qty: Number(t.min_qty),
                price:   Number(t.price),
              }))
            : null,
          variants:         variantType === "variants"
            ? variantRows
                .filter((r) => Object.values(r.combination).every(Boolean))
                .map((r) => ({
                  combination: r.combination,
                  stock:       Number(r.stock || 0),
                  price:       r.price ? Number(r.price) : null,
                }))
            : null,
          // Books & Media
          ...(isMediaCategory && {
            media_author:        mediaFields.media_author || null,
            media_isbn:          mediaFields.media_isbn || null,
            media_publisher:     mediaFields.media_publisher || null,
            media_publish_date:  mediaFields.media_publish_date || null,
            media_edition:       mediaFields.media_edition || null,
            media_pages:         mediaFields.media_pages ? Number(mediaFields.media_pages) : null,
            media_language:      mediaFields.media_language || "English",
            media_format:        mediaFields.media_format || null,
            media_genre:         mediaFields.media_genre.length ? mediaFields.media_genre : null,
            is_digital:          isDigital,
            digital_only:        isDigitalOnly,
            digital_file_path:   isDigital ? (digitalFile?.path ?? null) : null,
            digital_price:       mediaFields.delivery_type === "both" && mediaFields.digital_price
                                   ? Number(mediaFields.digital_price) : null,
            digital_file_size:   isDigital ? (digitalFile?.size ?? null) : null,
          }),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to create product");
      return d;
    },
    onSuccess: () => {
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Product created! It will go live once reviewed by admin.");
      router.push("/vendor/products");
    },
    onError: (e) => toast.error(e.message || "Failed to create product. Please try again."),
  });

  const onSubmit = (data) => createProduct(data);

  const isDigitalOnly = isMediaCategory && mediaFields.delivery_type === "digital";

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
            <button type="button" onClick={restoreDraft}
              className="text-sm font-bold text-amber-800 dark:text-amber-300 bg-amber-200 dark:bg-amber-800 px-4 py-1.5 rounded-full hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors">
              Restore
            </button>
            <button type="button" onClick={discardDraft}
              className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline">
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

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <select
                value={parentCategoryId}
                onChange={handleParentChange}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Select a category</option>
                {parentCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {currentSubs.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Subcategory</label>
                <select
                  value={categoryId || ""}
                  onChange={(e) => {
                    setValue("category_id", e.target.value);
                    setAttributes({});
                    setVariantType("none");
                    setDescriptiveOptions({});
                    setSelectedDimOptions({});
                    setVariantRows([]);
                  }}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">Select a subcategory</option>
                  {currentSubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <input type="hidden" {...register("category_id", { required: "Please select a category" })} />
            {errors.category_id && (
              <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>
            )}
          </div>
        </div>

        {/* ── Pricing & Inventory ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Pricing & Inventory</h2>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {isDigitalOnly ? "Digital Price (₦)" : "Price (₦)"} <span className="text-red-500">*</span>
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

            {!isDigitalOnly && (
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
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {isDigitalOnly ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <Download className="w-4 h-4 text-blue-500 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  Stock is managed automatically — digital products have unlimited availability.
                </p>
              </div>
            ) : variantType === "variants" ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl">
                <Info className="w-4 h-4 text-violet-500 shrink-0" />
                <p className="text-sm text-violet-700 dark:text-violet-300 font-medium">
                  Stock is set per option below — total will be calculated automatically.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Stock Quantity</label>
                <input
                  {...register("stock", { min: { value: 0, message: "Stock cannot be negative" } })}
                  type="number" min="0" placeholder="100"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
                <FieldError error={errors.stock} />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Visibility</label>
              <select
                {...register("status")}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="inactive">Submit for review</option>
                <option value="draft">Save as draft — hidden from store</option>
              </select>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Submitting for review places this product in the admin queue. An admin will review and approve it before it appears in the store.
              </p>
            </div>
          </div>
        </div>

        {/* ── Condition ──────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Condition</h2>
          <div className="flex gap-3 flex-wrap">
            {[{ value: "new", label: "New" }, { value: "used", label: "Used" }, { value: "refurbished", label: "Refurbished" }].map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setCondition(opt.value)}
                className={`px-5 py-2 text-sm font-semibold rounded-full border-2 transition-all ${
                  condition === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Category-specific Product Details ─────────────────────────────── */}
        {categoryId && !isMediaCategory && template.extraFields.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
              {template.label} Details
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
              Optional but recommended — helps customers find and trust your product.
            </p>
            {template.extraFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {field.label}
                  {!field.required && <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">optional</span>}
                </label>

                {field.type === "text" && (
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={attributes[field.key] ?? ""}
                    onChange={(e) => setAttributes((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                )}

                {field.type === "number" && (
                  <input
                    type="number"
                    min="0"
                    placeholder={field.placeholder}
                    value={attributes[field.key] ?? ""}
                    onChange={(e) => setAttributes((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                )}

                {field.type === "select" && (
                  <select
                    value={attributes[field.key] ?? field.options[0]}
                    onChange={(e) => setAttributes((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-gray-700 dark:text-gray-100"
                  >
                    {field.options.map((opt, idx) => (
                      <option key={opt} value={opt}>{field.displayOptions?.[idx] ?? opt}</option>
                    ))}
                  </select>
                )}

                {field.type === "multicheck" && (
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((opt) => {
                      const checked = (attributes[field.key] ?? []).includes(opt);
                      return (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => setAttributes((prev) => {
                            const cur = prev[field.key] ?? [];
                            return { ...prev, [field.key]: checked ? cur.filter((v) => v !== opt) : [...cur, opt] };
                          })}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                            checked
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Options / Variants ─────────────────────────────────────────────── */}
        {categoryId && !isMediaCategory && template.supportsVariants && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Sizes, Colours & Options</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Does this product come in different colours, sizes, or other choices?
              </p>
            </div>

            {/* Mode picker */}
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                {
                  value: "none",
                  title: "No choices",
                  desc: "Just one version. No sizes or colours.",
                },
                {
                  value: "descriptive",
                  title: "Show choices only",
                  desc: "List what's available (like \"comes in Red or Blue\"). You keep one stock count.",
                },
                {
                  value: "variants",
                  title: "Count stock per choice",
                  desc: "Set the stock and price for each one (like Red / Small).",
                },
              ].map(({ value, title, desc }) => {
                const active = variantType === value;
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setVariantType(value)}
                    className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <p className={`text-sm font-bold ${active ? "text-primary" : "text-gray-800 dark:text-gray-200"}`}>
                      {title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Descriptive mode: pick available options */}
            {variantType === "descriptive" && (
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Which choices do you have?
                </p>
                {template.variantDimensions.map((dim) => (
                  <VariantOptionPicker
                    key={dim.key}
                    dim={dim}
                    selectedValues={descriptiveOptions[dim.key] ?? []}
                    onToggle={(opt) => toggleDescriptiveOption(dim.key, opt)}
                    presets={variantPresets}
                    onApplyPreset={applyPresetToDescriptive}
                  />
                ))}
                <p className="text-xs text-gray-400 dark:text-gray-500 italic flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Shoppers just see these listed. You keep one stock count above.
                </p>
              </div>
            )}

            {/* Variants mode: pick options then generate combinations */}
            {variantType === "variants" && (
              <div className="space-y-5 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                    Step 1 — Pick the choices you have
                  </p>
                  {template.variantDimensions.map((dim) => (
                    <div key={dim.key} className="mb-4">
                      <VariantOptionPicker
                        dim={dim}
                        selectedValues={selectedDimOptions[dim.key] ?? []}
                        onToggle={(opt) => toggleSelectedDimOption(dim.key, opt)}
                        presets={variantPresets}
                        onApplyPreset={applyPresetToVariants}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={generateCombinations}
                    className="mt-1 px-5 py-2 bg-primary text-white text-sm font-bold rounded-full hover:opacity-90 transition-opacity"
                  >
                    Show all options
                  </button>
                </div>

                {variantRows.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                      Step 2 — Add stock (and price) for each one
                    </p>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                      <div className="grid grid-cols-[1fr_80px_120px_36px] gap-0 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        <span>Choice</span>
                        <span className="text-center">Stock</span>
                        <span className="text-center">Price</span>
                        <span />
                      </div>
                      {variantRows.map((row) => (
                        <div
                          key={row._id}
                          className="grid grid-cols-[1fr_80px_120px_36px] gap-0 border-t border-gray-100 dark:border-gray-700 items-center px-3 py-2"
                        >
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {Object.values(row.combination).join(" / ")}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={row.stock}
                            onChange={(e) => updateVariantRow(row._id, "stock", e.target.value)}
                            placeholder="0"
                            className="w-full text-center text-sm px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                          />
                          <input
                            type="number"
                            min="0"
                            value={row.price}
                            onChange={(e) => updateVariantRow(row._id, "price", e.target.value)}
                            placeholder="Same price"
                            className="w-full text-center text-sm px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariantRow(row._id)}
                            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">
                      Leave the price empty to use the main price.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Bulk / Quantity Discounts ──────────────────────────────────────── */}
        {categoryId && !isMediaCategory && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  Quantity Discounts
                  <span className="text-sm text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Offer a lower price when customers buy in bulk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnableQtyPricing((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enableQtyPricing ? "bg-primary" : "bg-gray-200 dark:bg-gray-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  enableQtyPricing ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>

            {enableQtyPricing && (
              <div className="space-y-3 pt-2">
                {quantityTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">Buy at least</span>
                    <input
                      type="number"
                      min="2"
                      value={tier.min_qty}
                      onChange={(e) => setQuantityTiers((prev) => prev.map((t, i) => i === idx ? { ...t, min_qty: e.target.value } : t))}
                      placeholder="3"
                      className="w-20 text-center text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">→ ₦</span>
                    <input
                      type="number"
                      min="1"
                      value={tier.price}
                      onChange={(e) => setQuantityTiers((prev) => prev.map((t, i) => i === idx ? { ...t, price: e.target.value } : t))}
                      placeholder="4500 each"
                      className="flex-1 text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">per unit</span>
                    {quantityTiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuantityTiers((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setQuantityTiers((prev) => [...prev, { min_qty: "", price: "" }])}
                  className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <Plus className="w-4 h-4" /> Add another tier
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                  Example: Buy 3 or more → ₦4,500 each. Set lower prices for bigger orders to encourage bulk buying.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Books & Media Details ────────────────────────────────────────── */}
        {isMediaCategory && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-primary/30 dark:border-primary/20 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary shrink-0" />
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Books & Media Details</h2>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                How will customers receive this product? <span className="text-red-500">*</span>
              </label>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { value: "physical", Icon: Package,  title: "Physical copy",      desc: "Ships as a package — book, CD, DVD, etc." },
                  { value: "digital",  Icon: Download,  title: "Digital download",   desc: "Instant download only — eBook, MP3, PDF, etc." },
                  { value: "both",     Icon: Layers,    title: "Physical + Digital", desc: "Buyers choose: ship the item or download instantly." },
                ].map(({ value, Icon, title, desc }) => {
                  const active = mediaFields.delivery_type === value;
                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() => { setMedia("delivery_type", value); if (value === "physical") setDigitalFile(null); }}
                      className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-gray-400"}`} />
                      <p className={`text-sm font-bold ${active ? "text-primary" : "text-gray-800 dark:text-gray-200"}`}>{title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "media_author",       label: "Author / Artist / Director",      placeholder: "e.g. Chinua Achebe" },
                { key: "media_publisher",    label: "Publisher / Label / Studio",       placeholder: "e.g. Heinemann" },
                { key: "media_isbn",         label: "ISBN / Barcode (optional)",        placeholder: "978-0-000-00000-0", mono: true },
                { key: "media_edition",      label: "Edition (optional)",               placeholder: "e.g. 3rd Edition, Deluxe" },
                { key: "media_language",     label: "Language",                          placeholder: "English" },
                { key: "media_pages",        label: "Pages / Runtime (optional)",       placeholder: "e.g. 320", num: true },
              ].map(({ key, label, placeholder, mono, num }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                  <input
                    type={num ? "number" : "text"}
                    min={num ? "1" : undefined}
                    value={mediaFields[key]}
                    onChange={(e) => setMedia(key, e.target.value)}
                    placeholder={placeholder}
                    className={`w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500${mono ? " font-mono" : ""}`}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Publication / Release Date (optional)</label>
                <input
                  type="date"
                  value={mediaFields.media_publish_date}
                  onChange={(e) => setMedia("media_publish_date", e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Format</label>
              <div className="flex flex-wrap gap-2">
                {MEDIA_FORMATS.map((f) => (
                  <button
                    type="button" key={f}
                    onClick={() => setMedia("media_format", mediaFields.media_format === f ? "" : f)}
                    className={`px-3.5 py-1.5 text-sm font-semibold rounded-full border-2 transition-all ${
                      mediaFields.media_format === f
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Genre / Category Tags</label>
              <div className="flex flex-wrap gap-2">
                {MEDIA_GENRES.map((g) => {
                  const active = mediaFields.media_genre.includes(g);
                  return (
                    <button
                      type="button" key={g} onClick={() => toggleGenre(g)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary/50"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {mediaFields.delivery_type !== "physical" && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">
                {mediaFields.delivery_type === "both" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Digital Download Price (₦) <span className="text-gray-400 font-normal">optional</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₦</span>
                      <input
                        type="number" min="1"
                        value={mediaFields.digital_price}
                        onChange={(e) => setMedia("digital_price", e.target.value)}
                        placeholder="Leave blank to use the same price as physical"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Upload Digital File <span className="text-red-500">*</span>
                  </label>
                  {digitalFile ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                      <Upload className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300 truncate">{digitalFile.name}</p>
                        {digitalFile.size > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                            {digitalFile.size >= 1024 * 1024
                              ? `${(digitalFile.size / (1024 * 1024)).toFixed(1)} MB`
                              : `${(digitalFile.size / 1024).toFixed(0)} KB`}
                          </p>
                        )}
                      </div>
                      <button type="button" onClick={removeDigitalFile}
                        className="p-1 text-green-600 dark:text-green-400 hover:text-red-500 transition-colors shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${digitalUploading ? "opacity-60 pointer-events-none" : "border-gray-200 dark:border-gray-600 hover:border-primary/50 hover:bg-primary/5"}`}>
                      <input type="file" className="hidden" onChange={handleDigitalFileChange} accept=".pdf,.epub,.mobi,.mp3,.mp4,.ogg,.wav,.mkv,.zip" />
                      {digitalUploading
                        ? <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        : <Upload className="w-8 h-8 text-gray-400" />}
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {digitalUploading ? "Uploading…" : "Click to upload your file"}
                      </p>
                      <p className="text-xs text-gray-400">PDF, EPUB, MOBI, MP3, MP4, ZIP — max 200 MB</p>
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
            {isSubmitting
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            {isSubmitting ? "Creating…" : "Create Product"}
          </button>
          <Link
            href="/vendor/products"
            className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
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
