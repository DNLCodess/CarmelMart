"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCategories } from "@/lib/useCategories";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Save, AlertCircle, Trash2, BookOpen, Upload, X, Package, Download, Layers, Clock, CheckCircle2, XCircle, Flag, Info } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProductImageUploader from "@/components/shared/vendor/ProductImageUploader";

// Per-category attribute definitions
const CATEGORY_ATTRIBUTES = {
  fashion:      [
    { key: "sizes",    label: "Available Sizes",         type: "multicheck", options: ["XS","S","M","L","XL","XXL","XXXL"] },
    { key: "colors",   label: "Available Colors",        type: "multicheck", options: ["Black","White","Red","Blue","Green","Yellow","Brown","Gray","Pink","Purple"] },
    { key: "material", label: "Material/Fabric",         type: "text",       placeholder: "e.g. 100% Cotton, Polyester blend" },
  ],
  electronics:  [
    { key: "storage",  label: "Storage Options",         type: "multicheck", options: ["32GB","64GB","128GB","256GB","512GB","1TB","2TB"] },
    { key: "ram",      label: "RAM Options",              type: "multicheck", options: ["4GB","6GB","8GB","12GB","16GB","32GB"] },
    { key: "colors",   label: "Available Colors",        type: "multicheck", options: ["Black","White","Silver","Gold","Blue","Space Gray"] },
  ],
  phones:       [
    { key: "storage",  label: "Storage Options",         type: "multicheck", options: ["64GB","128GB","256GB","512GB"] },
    { key: "ram",      label: "RAM Options",              type: "multicheck", options: ["4GB","6GB","8GB","12GB","16GB"] },
    { key: "colors",   label: "Available Colors",        type: "multicheck", options: ["Black","White","Silver","Gold","Blue","Red","Green"] },
  ],
  "home-living": [
    { key: "colors",   label: "Available Colors",        type: "multicheck", options: ["Black","White","Brown","Gray","Beige","Natural Wood"] },
    { key: "material", label: "Material",                type: "text",       placeholder: "e.g. Solid Oak, MDF, Stainless Steel" },
  ],
  beauty:       [
    { key: "shades",   label: "Available Shades/Colors", type: "multicheck", options: ["Ivory","Beige","Tan","Caramel","Ebony","Cocoa","Universal"] },
    { key: "size",     label: "Volume/Size Options",     type: "multicheck", options: ["30ml","50ml","100ml","200ml","250ml","500ml","1L"] },
  ],
  sports:       [
    { key: "sizes",    label: "Available Sizes",         type: "multicheck", options: ["XS","S","M","L","XL","XXL","36","37","38","39","40","41","42","43","44","45"] },
    { key: "colors",   label: "Available Colors",        type: "multicheck", options: ["Black","White","Red","Blue","Green","Gray","Navy","Orange"] },
  ],
  _default:     [
    { key: "colors",   label: "Available Colors",        type: "multicheck", options: ["Black","White","Red","Blue","Green","Yellow","Other"] },
  ],
};

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

export default function EditProductPage() {
  const router  = useRouter();
  const { id }  = useParams();
  const qc      = useQueryClient();
  const [images, setImages]         = useState([]);
  const [imagesReady, setImagesReady] = useState(false);
  const [condition, setCondition]   = useState("new");
  const [attributes, setAttributes] = useState({});

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
    delivery_type:      "physical", // "physical" | "digital" | "both"
    digital_price:      "",         // only used when delivery_type === "both"
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

  const currentSubs = subsByParent[parentCategoryId] ?? [];

  const handleParentChange = (e) => {
    const pid = e.target.value;
    setParentCategoryId(pid);
    const subs = subsByParent[pid] ?? [];
    setValue("category_id", subs.length === 0 ? pid : "");
    setAttributes({});
  };

  const selectedCat    = categories.find((c) => String(c.id) === String(categoryId));
  const isMediaCategory = selectedCat?.template === "books_media";
  const attrDefs       = selectedCat
    ? (CATEGORY_ATTRIBUTES[selectedCat.slug] ?? CATEGORY_ATTRIBUTES._default)
    : [];

  const toggleAttrOption = (key, value) => {
    setAttributes((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  // Populate form + images once product and categories both load
  useEffect(() => {
    if (!product || !categories.length) return;
    const catId = product.category?.id ?? product.category_id ?? "";

    // Normalise status so RHF's internal value always matches an available dropdown
    // option. Approved products keep their status; everything else collapses to
    // "inactive" (= submit for review) unless already a draft.
    const isApproved     = product.moderation_status === "approved";
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
    // Determine parent selection from the saved category
    if (catId) {
      const cat = categories.find((c) => c.id === catId);
      if (cat?.parent_id) {
        setParentCategoryId(cat.parent_id);
      } else if (cat) {
        setParentCategoryId(cat.id);
      }
    }
    setImages(Array.isArray(product.images) ? product.images : []);
    if (product.condition) setCondition(product.condition);
    if (product.attributes && typeof product.attributes === "object") {
      setAttributes(product.attributes);
    }
    // Restore Books & Media fields if this is a media product
    if (product.categories?.template === "books_media") {
      const deliveryType = product.digital_only
        ? "digital"
        : product.is_digital
          ? "both"
          : "physical";
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
        digital_price:      product.digital_price      ?? "",
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

  const { mutate: updateProduct } = useMutation({
    mutationFn: async (data) => {
      const isDigital     = isMediaCategory && mediaFields.delivery_type !== "physical";
      const isDigitalOnly = isMediaCategory && mediaFields.delivery_type === "digital";
      if (isDigital && !digitalFile) {
        throw new Error("Please upload a digital file for this product");
      }
      const r = await fetch(`/api/vendor/products/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        data.name,
          description: data.description,
          price:       Number(data.price),
          sale_price:  data.sale_price ? Number(data.sale_price) : null,
          stock:       Number(data.stock ?? 0),
          category_id: data.category_id || null,
          status:      data.status,
          images,
          condition,
          attributes:  Object.fromEntries(
            Object.entries(attributes).filter(([, v]) =>
              Array.isArray(v) ? v.length > 0 : v?.toString().trim()
            )
          ),
          // Books & Media fields
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

  // ── Moderation status banner config ─────────────────────────────────────────
  const moderationBanner = (() => {
    const ms = product.moderation_status;
    if (ms === "pending") return {
      Icon: Clock,
      bg:   "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700",
      icon: "text-amber-600 dark:text-amber-400",
      text: "text-amber-900 dark:text-amber-200",
      title: "Awaiting admin review",
      body:  "Your product is in the review queue. Once an admin approves it, it will go live automatically. You can keep editing — changes are saved until approval.",
    };
    if (ms === "rejected") return {
      Icon: XCircle,
      bg:   "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
      icon: "text-red-600 dark:text-red-400",
      text: "text-red-900 dark:text-red-200",
      title: "Product rejected",
      body:  product.moderation_reason
        ? `Reason: "${product.moderation_reason}" — Please fix the issue below and save. Your product will be automatically resubmitted for review.`
        : "This product was rejected by an admin. Please update it below and save to resubmit for review.",
    };
    if (ms === "flagged") return {
      Icon: Flag,
      bg:   "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700",
      icon: "text-orange-600 dark:text-orange-400",
      text: "text-orange-900 dark:text-orange-200",
      title: "Product flagged",
      body:  product.moderation_reason
        ? `Admin note: "${product.moderation_reason}" — Fix the issue below and save. Your product will be automatically resubmitted for review.`
        : "This product has been flagged by an admin. Please review the listing, make necessary changes, and save to resubmit.",
    };
    if (ms === "approved" && product.status === "active") return {
      Icon: CheckCircle2,
      bg:   "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700",
      icon: "text-green-600 dark:text-green-400",
      text: "text-green-900 dark:text-green-200",
      title: "Product is live",
      body:  "Your product is approved and visible to customers. Any edits you save here go live immediately.",
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
          {deleting ? <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete Product
        </button>
      </div>

      {/* ── Moderation status banner ────────────────────────────────────────── */}
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
                  onChange={(e) => { setValue("category_id", e.target.value); setAttributes({}); }}
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
                  : "Choosing \"Submit for review\" places this product in the admin queue. An admin will review and approve it — you'll be notified when it goes live. Choose Draft to save without submitting."}
              </p>
            </div>
          </div>
        </div>

        {/* ── Condition & Variants ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Condition & Variants</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Condition <span className="text-red-500">*</span>
            </label>
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

          {attrDefs.length > 0 && (
            <div className="space-y-5 pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {selectedCat?.name} Variants
              </p>
              {attrDefs.map((attr) => (
                <div key={attr.key}>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{attr.label}</label>
                  {attr.type === "multicheck" ? (
                    <div className="flex flex-wrap gap-2">
                      {attr.options.map((opt) => {
                        const checked = (attributes[attr.key] ?? []).includes(opt);
                        return (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => toggleAttrOption(attr.key, opt)}
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
                  ) : (
                    <input
                      type="text"
                      placeholder={attr.placeholder}
                      value={attributes[attr.key] ?? ""}
                      onChange={(e) => setAttributes((prev) => ({ ...prev, [attr.key]: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Books & Media Details ────────────────────────────────────────── */}
        {isMediaCategory && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-primary/30 dark:border-primary/20 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary shrink-0" />
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Books & Media Details</h2>
            </div>

            {/* ── Delivery type selector ── */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                How will customers receive this product? <span className="text-red-500">*</span>
              </label>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { value: "physical", Icon: Package,  title: "Physical copy",       desc: "Ships as a package — book, CD, DVD, etc." },
                  { value: "digital",  Icon: Download,  title: "Digital download",    desc: "Instant download only — eBook, MP3, PDF, etc." },
                  { value: "both",     Icon: Layers,    title: "Physical + Digital",  desc: "Buyers choose: ship the item or download instantly." },
                ].map(({ value, Icon, title, desc }) => {
                  const active = mediaFields.delivery_type === value;
                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() => { setMedia("delivery_type", value); if (value === "physical") { setDigitalFile(null); } }}
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Author / Artist / Director</label>
                <input
                  value={mediaFields.media_author}
                  onChange={(e) => setMedia("media_author", e.target.value)}
                  placeholder="e.g. Chinua Achebe"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Publisher / Label / Studio</label>
                <input
                  value={mediaFields.media_publisher}
                  onChange={(e) => setMedia("media_publisher", e.target.value)}
                  placeholder="e.g. Heinemann"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ISBN / Barcode <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  value={mediaFields.media_isbn}
                  onChange={(e) => setMedia("media_isbn", e.target.value)}
                  placeholder="978-0-000-00000-0"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Publication / Release Date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={mediaFields.media_publish_date}
                  onChange={(e) => setMedia("media_publish_date", e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Edition <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  value={mediaFields.media_edition}
                  onChange={(e) => setMedia("media_edition", e.target.value)}
                  placeholder="e.g. 3rd Edition, Deluxe"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Pages / Runtime <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="number"
                  min="1"
                  value={mediaFields.media_pages}
                  onChange={(e) => setMedia("media_pages", e.target.value)}
                  placeholder="e.g. 320 pages or 94 mins"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Language</label>
                <input
                  value={mediaFields.media_language}
                  onChange={(e) => setMedia("media_language", e.target.value)}
                  placeholder="English"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Format</label>
              <div className="flex flex-wrap gap-2">
                {MEDIA_FORMATS.map((f) => (
                  <button
                    type="button"
                    key={f}
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

            {/* Genre */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Genre / Category Tags</label>
              <div className="flex flex-wrap gap-2">
                {MEDIA_GENRES.map((g) => {
                  const active = mediaFields.media_genre.includes(g);
                  return (
                    <button
                      type="button"
                      key={g}
                      onClick={() => toggleGenre(g)}
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

            {/* Digital file upload — shown for "digital" and "both" modes */}
            {mediaFields.delivery_type !== "physical" && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">
                {/* Separate digital price — only for "both" mode */}
                {mediaFields.delivery_type === "both" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Digital Download Price (₦) <span className="text-gray-400 font-normal">optional</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₦</span>
                      <input
                        type="number"
                        min="1"
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
                      <button
                        type="button"
                        onClick={removeDigitalFile}
                        className="p-1 text-green-600 dark:text-green-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${digitalUploading ? "opacity-60 pointer-events-none" : "border-gray-200 dark:border-gray-600 hover:border-primary/50 hover:bg-primary/5"}`}>
                      <input type="file" className="hidden" onChange={handleDigitalFileChange} accept=".pdf,.epub,.mobi,.mp3,.mp4,.ogg,.wav,.mkv,.zip" />
                      {digitalUploading ? (
                        <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-gray-400" />
                      )}
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
            <ProductImageUploader
              value={images}
              onChange={setImages}
            />
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
