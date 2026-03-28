"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Save, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProductImageUploader from "@/components/shared/vendor/ProductImageUploader";

async function fetchCategories() {
  const r = await fetch("/api/categories");
  return r.json();
}

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
  const [images, setImages] = useState([]);
  const [imagesReady, setImagesReady] = useState(false);

  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn:  fetchCategories,
    staleTime: 300_000,
  });
  const categories = catData?.categories ?? [];

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
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { status: "active", stock: 0 } });

  const price     = watch("price");
  const salePrice = watch("sale_price");

  // Populate form + images once product loads
  useEffect(() => {
    if (!product) return;
    reset({
      name:        product.name,
      description: product.description ?? "",
      price:       product.price,
      sale_price:  product.sale_price ?? "",
      stock:       product.stock,
      category_id: product.category?.id ?? product.category_id ?? "",
      status:      product.status,
    });
    setImages(Array.isArray(product.images) ? product.images : []);
    setImagesReady(true);
  }, [product, reset]);

  const { mutate: updateProduct } = useMutation({
    mutationFn: async (data) => {
      const r = await fetch(`/api/vendor/products/${id}`, {
        method:  "PATCH",
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
      if (!r.ok) throw new Error(d.error || "Update failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Product updated!");
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
      qc.invalidateQueries({ queryKey: ["vendor-product-edit", id] });
      router.push("/vendor/products");
    },
    onError: (e) => toast.error(e.message),
  });

  const { mutate: deleteProduct, isPending: deleting } = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/vendor/products/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Delete failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
      router.push("/vendor/products");
    },
    onError: (e) => toast.error(e.message),
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

  const discount = salePrice && price && Number(salePrice) > 0 && Number(salePrice) < Number(price)
    ? Math.round(((Number(price) - Number(salePrice)) / Number(price)) * 100)
    : null;

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
                {...register("price", { required: "Price is required", min: { value: 1, message: "Must be > 0" } })}
                type="number" min="0" step="any"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
              />
              <FieldError error={errors.price} />
            </div>
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
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Stock Quantity</label>
              <input
                {...register("stock", { min: { value: 0, message: "Cannot be negative" } })}
                type="number" min="0"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
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
