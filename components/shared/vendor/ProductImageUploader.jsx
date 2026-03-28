"use client";

import { useState, useRef, useCallback, useId } from "react";
import { Upload, X, ImageIcon, AlertCircle, GripVertical, ChevronUp, ChevronDown, Star } from "lucide-react";
import toast from "react-hot-toast";

const MAX_FILES    = 8;
const MAX_BYTES    = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const ALLOWED_EXT  = ".jpg,.jpeg,.png,.webp,.gif,.avif";

/**
 * ProductImageUploader
 *
 * Props:
 *   value        — string[]  — current list of public image URLs (controlled)
 *   onChange     — (urls: string[]) => void
 *   onPathAdded  — (path: string) => void  — called with storage path after upload (for cleanup on discard)
 *   disabled     — boolean
 */
export default function ProductImageUploader({ value = [], onChange, onPathAdded, disabled = false }) {
  // Each entry: { id, url, path?, status: "done"|"uploading"|"error", progress, error }
  const [items, setItems] = useState(() =>
    value.map((url) => ({ id: crypto.randomUUID(), url, status: "done", progress: 100 }))
  );
  const [dragOver, setDragOver]   = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const inputRef  = useRef(null);
  const uploadId  = useId();

  // Keep parent in sync whenever items change
  const syncParent = useCallback((next) => {
    const urls = next.filter((i) => i.status === "done").map((i) => i.url);
    onChange?.(urls);
  }, [onChange]);

  const uploadFile = useCallback(async (file) => {
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error(`${file.name}: unsupported file type`);
      return null;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`${file.name}: exceeds 5 MB limit`);
      return null;
    }

    const itemId = crypto.randomUUID();

    // Optimistic preview with local blob URL
    const preview = URL.createObjectURL(file);
    const newItem = { id: itemId, url: preview, status: "uploading", progress: 0, error: null };

    setItems((prev) => {
      const next = [...prev, newItem];
      return next;
    });

    try {
      // Simulate early progress tick (XHR would give real progress; fetch doesn't)
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, progress: 30 } : i));

      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/vendor/products/upload-image", {
        method: "POST",
        body:   form,
      });

      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, progress: 80 } : i));

      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");

      // Revoke local blob to free memory
      URL.revokeObjectURL(preview);

      const done = { id: itemId, url: data.url, path: data.path, status: "done", progress: 100, error: null };
      onPathAdded?.(data.path);

      setItems((prev) => {
        const next = prev.map((i) => i.id === itemId ? done : i);
        syncParent(next);
        return next;
      });

      return done;
    } catch (err) {
      URL.revokeObjectURL(preview);
      const failed = { id: itemId, url: null, status: "error", progress: 0, error: err.message };
      setItems((prev) => {
        const next = prev.map((i) => i.id === itemId ? failed : i);
        return next;
      });
      toast.error(`${file.name}: ${err.message}`);
      return null;
    }
  }, [syncParent, onPathAdded]);

  const handleFiles = useCallback((files) => {
    const current = items.filter((i) => i.status !== "error").length;
    const slots   = MAX_FILES - current;
    if (slots <= 0) {
      toast.error(`Maximum ${MAX_FILES} images allowed`);
      return;
    }
    Array.from(files).slice(0, slots).forEach(uploadFile);
  }, [items, uploadFile]);

  const remove = useCallback((id) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      syncParent(next);
      return next;
    });
  }, [syncParent]);

  const retry = useCallback((id) => {
    // Remove the failed entry — user will re-select the file
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast("Please re-select the file to retry", { icon: "ℹ️" });
  }, []);

  const move = useCallback((from, dir) => {
    const to = from + dir;
    setItems((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      syncParent(next);
      return next;
    });
  }, [syncParent]);

  // Drag-and-drop reordering
  const dragItem = useRef(null);
  const onDragStart = (i) => { dragItem.current = i; setDragIndex(i); };
  const onDragEnterItem = (i) => {
    if (dragItem.current === null || dragItem.current === i) return;
    setItems((prev) => {
      const next = [...prev];
      const dragged = next.splice(dragItem.current, 1)[0];
      next.splice(i, 0, dragged);
      dragItem.current = i;
      setDragIndex(i);
      syncParent(next);
      return next;
    });
  };
  const onDragEnd = () => { dragItem.current = null; setDragIndex(null); };

  // Dropzone handlers
  const onDropzoneDragOver  = (e) => { e.preventDefault(); if (!disabled) setDragOver(true); };
  const onDropzoneDragLeave = ()  => setDragOver(false);
  const onDropzoneDrop      = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  const done     = items.filter((i) => i.status === "done");
  const canAdd   = done.length < MAX_FILES && !disabled;
  const uploading = items.some((i) => i.status === "uploading");

  return (
    <div className="space-y-4">
      {/* Drop zone — only shown when can still add more */}
      {canAdd && (
        <div
          role="button"
          tabIndex={0}
          onDragOver={onDropzoneDragOver}
          onDragLeave={onDropzoneDragLeave}
          onDrop={onDropzoneDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          aria-label="Upload product images"
          className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all select-none py-10 px-6 ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-gray-200 dark:border-gray-600 hover:border-primary/60 hover:bg-gray-50 dark:hover:bg-gray-700/40"
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
            dragOver ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
          }`}>
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {dragOver ? "Drop images here" : "Drag & drop images, or click to browse"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              JPEG, PNG, WebP, GIF, AVIF · Max 5 MB each · Up to {MAX_FILES} images
            </p>
          </div>
          <p className="text-xs font-semibold text-primary">
            {done.length}/{MAX_FILES} images added
          </p>
          <input
            ref={inputRef}
            id={uploadId}
            type="file"
            accept={ALLOWED_EXT}
            multiple
            className="sr-only"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />
        </div>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-primary font-semibold px-1">
          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          Uploading images…
        </div>
      )}

      {/* Image grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item, i) => (
            <div
              key={item.id}
              draggable={item.status === "done" && !disabled}
              onDragStart={() => onDragStart(i)}
              onDragEnter={() => onDragEnterItem(i)}
              onDragEnd={onDragEnd}
              className={`relative group rounded-xl overflow-hidden border-2 aspect-square transition-all ${
                dragIndex === i
                  ? "border-primary shadow-lg scale-105"
                  : item.status === "error"
                  ? "border-red-300 dark:border-red-600"
                  : "border-gray-100 dark:border-gray-700"
              }`}
            >
              {/* Image or placeholder */}
              {item.url ? (
                <img
                  src={item.url}
                  alt={`Product image ${i + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {item.status === "error" ? (
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
              )}

              {/* Upload progress overlay */}
              {item.status === "uploading" && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                  <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-white text-xs font-bold">{item.progress}%</span>
                  <div className="w-3/4 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {item.status === "error" && (
                <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center gap-1 p-2">
                  <AlertCircle className="w-5 h-5 text-white" />
                  <p className="text-white text-[10px] text-center leading-tight font-semibold">Upload failed</p>
                  <button
                    type="button"
                    onClick={() => retry(item.id)}
                    className="text-[10px] text-white underline font-bold mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Done overlay — controls */}
              {item.status === "done" && !disabled && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/30"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>

                  {/* Move up/down */}
                  <div className="absolute bottom-1.5 right-1.5 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        className="w-5 h-5 bg-white dark:bg-gray-800 rounded flex items-center justify-center shadow hover:bg-gray-50"
                        title="Move up"
                      >
                        <ChevronUp className="w-3 h-3 text-gray-600" />
                      </button>
                    )}
                    {i < items.length - 1 && (
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        className="w-5 h-5 bg-white dark:bg-gray-800 rounded flex items-center justify-center shadow hover:bg-gray-50"
                        title="Move down"
                      >
                        <ChevronDown className="w-3 h-3 text-gray-600" />
                      </button>
                    )}
                  </div>

                  {/* Drag handle */}
                  <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-70 transition-opacity cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-white drop-shadow" />
                  </div>
                </div>
              )}

              {/* Main image badge */}
              {i === 0 && item.status === "done" && (
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">
                  <Star className="w-2.5 h-2.5 fill-white" /> Main
                </div>
              )}

              {/* Index badge */}
              {i > 0 && item.status === "done" && (
                <div className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">
                  {i + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state when limit reached */}
      {!canAdd && items.some((i) => i.status === "done") && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Maximum of {MAX_FILES} images reached. Remove an image to add another.
        </p>
      )}

      {/* Hint */}
      {done.length > 1 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Drag thumbnails or use the arrows to reorder. The first image is the main display image.
        </p>
      )}
    </div>
  );
}
