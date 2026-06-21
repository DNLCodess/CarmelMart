"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCategories } from "@/lib/useCategories";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft, Save, AlertCircle, Trash2, BookOpen, Upload, X,
  Package, Download, Layers, Clock, CheckCircle2, XCircle, Flag, Info,
  Plus, Tag,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProductImageUploader from "@/components/shared/vendor/ProductImageUploader";
import { getTemplate } from "@/lib/product-templates";

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

async function fetchProduct(id) {
  const r = await fetch(`/api/vendor/products/${id}`);
  if (!r.ok) return null;
  const d = await r.json();
  return d.product ?? null;
}

function FieldError({ error }) {
  if (!error) return null;
  return (
    <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error.message}
    </p>
  );
}

// Cartesian product of arrays
function cartesian(arrays) {
  if (!arrays.length) return [[]];
  const [first, ...rest] = arrays;
  const restProd = cartesian(rest);
  return first.flatMap((v) => restProd.map((r) => [v, ...r]));
}

export default function EditProductPage() {
  const router  = useRouter();
  const { id }  = useParams();
  const qc      = useQueryClient();
  const [images, setImages]           = useState([]);
  const [imagesReady, setImagesReady] = useState(false);
  const [condition, setCondition]     = useState("new");

  // Extra template fields (material, brand, etc.) stored in attributes JSONB
  const [attributes, setAttributes]   = useState({});

  // Variant/options state
  const [variantType, setVariantType]               = useState("none");
  const [descriptiveOptions, setDescriptiveOptions] = useState({});
  const [selectedDimOptions, setSelectedDimOptions] = useState({});
  const [variantRows, setVariantRows]               = useState([]);

  // Quantity / bulk pricing state
  const [enableQtyPricing, setEnableQtyPricing] = useState(false);
  const [quantityTiers, setQuantityTiers]       = useState([{ min_qty: "", price: "" }]);

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
  const [digitalFile,      setDigitalFile]      = useState(null);
  const [digitalUploading, setDigitalUploading] = useState(false);

  const setMedia = (key, value) => setMediaFields((prev) => ({ ...prev, [key]: value }));
  const toggleGenre = (g) => setMediaFields((prev) => ({
    ...prev,
    media_genre: prev.media_genre.includes(g)
      ? prev.media_genre.filter((x) => x !== g)
      : [...prev.media_genre, g],
  }));

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

  const { categories, parents: parentCategories, subsByParent } = useCategories();
  const [parentCategoryId, setParentCategoryId] = useState("");

  const { data: product, isLoading } = useQuery({
    queryKey: ["vendor-product-edit", id],
    queryFn:  () => fetchProduct(id),
    enabled:  !!id,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { status: "active", stock: 0 } });

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
      return { ...prev, [dimKey]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  };

  const toggleSelectedDimOption = (dimKey, value) => {
    setSelectedDimOptions((prev) => {
      const cur = prev[dimKey] ?? [];
      return { ...prev, [dimKey]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  };

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

  const updateVariantRow = (rowId, field, value) =>
    setVariantRows((prev) => prev.map((r) => (r._id === rowId ? { ...r, [field]: value } : r)));

  const removeVariantRow = (rowId) =>
    setVariantRows((prev) => prev.filter((r) => r._id !== rowId));

  // ── Populate form once product + categories load ───────────────────────────

  useEffect(() => {
    if (!product || !categories.length) return;
    const catId = product.category?.id ?? product.category_id ?? "";

    const isApproved      = product.moderation_status === "approved";
    const normalizedStatus = isApproved
      ? (["active", "draft", "inactive"].includes(product.status) ? product.status : "active")
      : (product.status === "draft" ? "draft" : "inactive");

    reset({
      name:        product.name,
      description: product.description ?? "",
      price:       product.price,
      sale_price:  product.sale_price ?? "",
      stock:       product.stock,
      category_id: catId,
      status:      normalizedStatus,
    });

    if (catId) {
      const cat = categories.find((c) => c.id === catId);
      if (cat?.parent_id) setParentCategoryId(cat.parent_id);
      else if (cat)       setParentCategoryId(cat.id);
    }

    setImages(Array.isArray(product.images) ? product.images : []);
    if (product.condition) setCondition(product.condition);

    // Restore attributes (extra fields)
    if (product.attributes && typeof product.attributes === "object") {
      setAttributes(product.attributes);
    }

    // Restore variant type and data
    const savedVariantType = product.variant_type ?? "none";
    setVariantType(savedVariantType);

    if (savedVariantType === "descriptive" && product.attributes) {
      // Descriptive options were stored in attributes
      const tmpl = getTemplate(product.categories?.effectiveTemplate ?? product.categories?.template ?? "standard");
      const dimKeys = new Set(tmpl.variantDimensions.map((d) => d.key));
      const dimAttrs = {};
      Object.entries(product.attributes).forEach(([k, v]) => {
        if (dimKeys.has(k) && Array.isArray(v)) dimAttrs[k] = v;
      });
      setDescriptiveOptions(dimAttrs);
    }

    if (savedVariantType === "variants" && Array.isArray(product.variants) && product.variants.length > 0) {
      const rows = product.variants.map((v) => ({
        _id:         v.id ?? `v_${Math.random()}`,
        combination: v.combination,
        stock:       v.stock ?? "",
        price:       v.price ?? "",
      }));
      setVariantRows(rows);

      // Rebuild selectedDimOptions from existing variants
      const tmpl = getTemplate(product.categories?.effectiveTemplate ?? product.categories?.template ?? "standard");
      const dimSelections = {};
      rows.forEach((r) => {
        Object.entries(r.combination).forEach(([dimKey, val]) => {
          if (!dimSelections[dimKey]) dimSelections[dimKey] = new Set();
          dimSelections[dimKey].add(val);
        });
      });
      const converted = {};
      Object.entries(dimSelections).forEach(([k, s]) => {
        // Preserve order from template options
        const tmplDim = tmpl.variantDimensions.find((d) => d.key === k);
        converted[k] = tmplDim
          ? tmplDim.options.filter((o) => s.has(o))
          : [...s];
      });
      setSelectedDimOptions(converted);
    }

    // Restore quantity tiers
    if (Array.isArray(product.quantity_tiers) && product.quantity_tiers.length > 0) {
      setEnableQtyPricing(true);
      setQuantityTiers(product.quantity_tiers.map((t) => ({ min_qty: t.min_qty, price: t.price })));
    }

    // Restore Books & Media fields
    if ((product.categories?.effectiveTemplate ?? product.categories?.template) === "books_media") {
      const deliveryType = product.digital_only ? "digital" : product.is_digital ? "both" : "physical";
      setMediaFields({
        media_author:       product.media_author       ?? "",
        media_isbn:         product.media_isbn         ?? "",
        media_publisher:    product.media_publisher    ?? "",
        media_publish_date: product.media_publish_date ?? "",
        media_edition:      product.media_edition      ?? "",
        media_pages:        product.media_pages        ?? "",
        media_language:     product.media_language     ?? "English",
        media_format:       product.media_format       ?? "",
        media_genre:        Array.isArray(product.media_genre) ? product.media_genre : [],
        delivery_type:      deliveryType,
        digital_price:      product.digital_price ?? "",
      });
      if (product.is_digital && product.digital_file_path) {
        setDigitalFile({
          name: product.digital_file_path.split("/").pop(),
          path: product.digital_file_path,
          size: product.digital_file_size ?? 0,
        });
      }
    }

    setImagesReady(true);
  }, [product, categories, reset]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const { mutate: updateProduct } = useMutation({
    mutationFn: async (data) => {
      const isDigital     = isMediaCategory && mediaFields.delivery_type !== "physical";
      const isDigitalOnly = isMediaCategory && mediaFields.delivery_type === "digital";
      if (isDigital && !digitalFile) throw new Error("Please upload a digital file for this product");

      const baseAttributes = Object.fromEntries(
        Object.entries(attributes).filter(([, v]) =>
          Array.isArray(v) ? v.length > 0 : v?.toString().trim()
        )
      );
      const descriptiveAttrs = variantType === "descriptive"
        ? Object.fromEntries(Object.entries(descriptiveOptions).filter(([, v]) => v.length > 0))
        : {};

      const baseStock = variantType === "variants"
        ? variantRows.reduce((sum, r) => sum + Number(r.stock || 0), 0)
        : Number(data.stock ?? 0);

      const r = await fetch(`/api/vendor/products/${id}`, {
        method:  "PATCH",
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
          is_media_category: isMediaCategory,
          ...(isMediaCategory && {
            media_author:       mediaFields.media_author       || null,
            media_isbn:         mediaFields.media_isbn         || null,
            media_publisher:    mediaFields.media_publisher    || null,
            media_publish_date: mediaFields.media_publish_date || null,
            media_edition:      mediaFields.media_edition      || null,
            media_pages:        mediaFields.media_pages ? Number(mediaFields.media_pages) : null,
            media_language:     mediaFields.media_language     || "English",
            media_format:       mediaFields.media_format       || null,
            media_genre:        mediaFields.media_genre.length ? mediaFields.media_genre : null,
            is_digital:         isDigital,
            digital_only:       isDigitalOnly,
            digital_price:      mediaFields.delivery_type === "both" && mediaFields.digital_price
                                  ? Number(mediaFields.digital_price) : null,
            digital_file_path:  isDigital ? (digitalFile?.path ?? null) : null,
            digital_file_size:  isDigital ? (digitalFile?.size ?? null) : null,
          }),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Update failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Product saved successfully!");
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
      qc.invalidateQueries({ queryKey: ["vendor-product-edit", id] });
      router.push("/vendor/products");
    },
    onError: (e) => toast.error(e.message || "Failed to save product. Please try again."),
  });

  const { mutate: deleteProduct, isPending: deleting } = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/vendor/products/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Delete failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Product deleted.");
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
      router.push("/vendor/products");
    },
    onError: (e) => toast.error(e.message || "Failed to delete product. Please try again."),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="font-bold text-gray-900 dark:text-gray-100 mb-2">Product not found</p>
        <Link href="/vendor/products" className="text-sm text-primary underline">Back to products</Link>
      </div>
    );
  }

  const onSubmit = (data) => updateProduct(data);
  const isDigitalOnly = isMediaCategory && mediaFields.delivery_type === "digital";

  const discount = salePrice && price && Number(salePrice) > 0 && Number(salePrice) < Number(price)
    ? Math.round(((Number(price) - Number(salePrice)) / Number(price)) * 100)
    : null;

  const moderationBanner = (() => {
    const ms = product.moderation_status;
    if (ms === "pending") return {
      Icon: Clock, bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700",
      icon: "text-amber-600 dark:text-amber-400", text: "text-amber-900 dark:text-amber-200",
      title: "Awaiting admin review",
      body:  "Your product is in the review queue. Once approved it will go live automatically.",
    };
    if (ms === "rejected") return {
      Icon: XCircle, bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
      icon: "text-red-600 dark:text-red-400", text: "text-red-900 dark:text-red-200",
      title: "Product rejected",
      body:  product.moderation_reason
        ? `Reason: "${product.moderation_reason}" — Fix the issue below and save to resubmit.`
        : "This product was rejected. Update it below and save to resubmit for review.",
    };
    if (ms === "flagged") return {
      Icon: Flag, bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700",
      icon: "text-orange-600 dark:text-orange-400", text: "text-orange-900 dark:text-orange-200",
      title: "Product flagged",
      body:  product.moderation_reason
        ? `Admin note: "${product.moderation_reason}" — Fix the issue below and save to resubmit.`
        : "This product has been flagged. Review the listing, make changes, and save to resubmit.",
    };
    if (ms === "approved" && product.status === "active") return {
      Icon: CheckCircle2, bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700",
      icon: "text-green-600 dark:text-green-400", text: "text-green-900 dark:text-green-200",
      title: "Product is live",
      body:  "Your product is approved and visible to customers. Any edits you save go live immediately.",
    };
    return null;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/vendor/products"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Products
        </Link>
        <button
          onClick={() => { if (confirm("Delete this product permanently?")) deleteProduct(); }}
          disabled={deleting}
          className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {deleting
            ? <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            : <Trash2 className="w-4 h-4" />}
          Delete Product
        </button>
      </div>

      {moderationBanner && (
        <div className={`flex items-start gap-3 border rounded-2xl px-5 py-4 ${moderationBanner.bg}`}>
          <moderationBanner.Icon className={`w-5 h-5 mt-0.5 shrink-0 ${moderationBanner.icon}`} />
          <div>
            <p className={`text-sm font-bold ${moderationBanner.text}`}>{moderationBanner.title}</p>
            <p className={`text-sm mt-0.5 ${moderationBanner.text} opacity-90`}>{moderationBanner.body}</p>
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
              {...register("name", { required: "Product name is required" })}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
            />
            <FieldError error={errors.name} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              {...register("description")}
              rows={4}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none dark:bg-gray-700 dark:text-gray-100"
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
                {...register("price", { required: "Price is required", min: { value: 1, message: "Must be > 0" } })}
                type="number" min="0" step="any"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
              />
              <FieldError error={errors.price} />
            </div>
            {!isDigitalOnly && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Sale Price (₦)</label>
                <input
                  {...register("sale_price", {
                    validate: (v) => !v || Number(v) < Number(price) || "Must be less than regular price",
                  })}
                  type="number" min="0" step="any"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
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
                  {...register("stock", { min: { value: 0, message: "Cannot be negative" } })}
                  type="number" min="0"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
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
                {product.moderation_status === "approved" ? (
                  <>
                    <option value="active">Live — visible to customers</option>
                    <option value="draft">Draft — hide from store temporarily</option>
                  </>
                ) : (
                  <>
                    <option value="inactive">Submit for review</option>
                    <option value="draft">Save as draft — hidden from store</option>
                  </>
                )}
              </select>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {product.moderation_status === "approved"
                  ? "Your product is approved. Switch to Draft to temporarily hide it without losing approval."
                  : "Choosing \"Submit for review\" places this product in the admin queue."}
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
                type="button" key={opt.value}
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
                    type="number" min="0"
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
                          type="button" key={opt}
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
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Options & Variants</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Does this product come in different colours, sizes, or other options?
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { value: "none",        title: "No options",               desc: "One version only — no sizes, colours, or variations." },
                { value: "descriptive", title: "Just show options",        desc: "List what options are available. One stock total." },
                { value: "variants",    title: "Separate stock per option", desc: "Track stock and set a different price for each combination." },
              ].map(({ value, title, desc }) => {
                const active = variantType === value;
                return (
                  <button
                    type="button" key={value}
                    onClick={() => setVariantType(value)}
                    className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <p className={`text-sm font-bold ${active ? "text-primary" : "text-gray-800 dark:text-gray-200"}`}>{title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{desc}</p>
                  </button>
                );
              })}
            </div>

            {variantType === "descriptive" && (
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Which options do you offer?
                </p>
                {template.variantDimensions.map((dim) => (
                  <div key={dim.key}>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{dim.label}</label>
                    <div className="flex flex-wrap gap-2">
                      {dim.options.map((opt) => {
                        const checked = (descriptiveOptions[dim.key] ?? []).includes(opt);
                        return (
                          <button
                            type="button" key={opt}
                            onClick={() => toggleDescriptiveOption(dim.key, opt)}
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
                  </div>
                ))}
                <p className="text-xs text-gray-400 dark:text-gray-500 italic flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Customers will see these as information. You manage one single stock number above.
                </p>
              </div>
            )}

            {variantType === "variants" && (
              <div className="space-y-5 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                    Step 1 — Select the options you offer
                  </p>
                  {template.variantDimensions.map((dim) => (
                    <div key={dim.key} className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{dim.label}</label>
                      <div className="flex flex-wrap gap-2">
                        {dim.options.map((opt) => {
                          const checked = (selectedDimOptions[dim.key] ?? []).includes(opt);
                          return (
                            <button
                              type="button" key={opt}
                              onClick={() => toggleSelectedDimOption(dim.key, opt)}
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
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={generateCombinations}
                    className="mt-1 px-5 py-2 bg-primary text-white text-sm font-bold rounded-full hover:opacity-90 transition-opacity"
                  >
                    Generate combinations
                  </button>
                </div>

                {variantRows.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                      Step 2 — Set stock (and optional price) for each combination
                    </p>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                      <div className="grid grid-cols-[1fr_80px_120px_36px] gap-0 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        <span>Option</span>
                        <span className="text-center">Stock</span>
                        <span className="text-center">Custom price</span>
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
                            type="number" min="0"
                            value={row.stock}
                            onChange={(e) => updateVariantRow(row._id, "stock", e.target.value)}
                            placeholder="0"
                            className="w-full text-center text-sm px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                          />
                          <input
                            type="number" min="0"
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
                      Leave "Custom price" blank to use the main price above.
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
                      type="number" min="2"
                      value={tier.min_qty}
                      onChange={(e) => setQuantityTiers((prev) => prev.map((t, i) => i === idx ? { ...t, min_qty: e.target.value } : t))}
                      placeholder="3"
                      className="w-20 text-center text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">→ ₦</span>
                    <input
                      type="number" min="1"
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
                  { value: "physical", Icon: Package,  title: "Physical copy",      desc: "Ships as a package." },
                  { value: "digital",  Icon: Download,  title: "Digital download",   desc: "Instant download only." },
                  { value: "both",     Icon: Layers,    title: "Physical + Digital", desc: "Buyers choose." },
                ].map(({ value, Icon, title, desc }) => {
                  const active = mediaFields.delivery_type === value;
                  return (
                    <button
                      type="button" key={value}
                      onClick={() => { setMedia("delivery_type", value); if (value === "physical") setDigitalFile(null); }}
                      className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-gray-400"}`} />
                      <p className={`text-sm font-bold ${active ? "text-primary" : "text-gray-800 dark:text-gray-200"}`}>{title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "media_author",       label: "Author / Artist / Director",  placeholder: "e.g. Chinua Achebe" },
                { key: "media_publisher",    label: "Publisher / Label / Studio",   placeholder: "e.g. Heinemann" },
                { key: "media_isbn",         label: "ISBN / Barcode (optional)",    placeholder: "978-0-000-00000-0", mono: true },
                { key: "media_edition",      label: "Edition (optional)",           placeholder: "e.g. 3rd Edition" },
                { key: "media_language",     label: "Language",                      placeholder: "English" },
                { key: "media_pages",        label: "Pages / Runtime (optional)",   placeholder: "e.g. 320", num: true },
              ].map(({ key, label, placeholder, mono, num }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                  <input
                    type={num ? "number" : "text"} min={num ? "1" : undefined}
                    value={mediaFields[key]}
                    onChange={(e) => setMedia(key, e.target.value)}
                    placeholder={placeholder}
                    className={`w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500${mono ? " font-mono" : ""}`}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Release Date (optional)</label>
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
          {imagesReady && (
            <ProductImageUploader value={images} onChange={setImages} />
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
            {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
          <Link
            href="/vendor/products"
            className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
