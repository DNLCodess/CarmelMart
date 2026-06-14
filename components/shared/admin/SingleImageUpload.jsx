"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const MAX_BYTES    = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const ALLOWED_EXT  = ".jpg,.jpeg,.png,.webp,.gif,.avif";

/**
 * SingleImageUpload
 *
 * Props:
 *   value       — string | null   current public URL
 *   onChange    — (url: string | null) => void
 *   uploadUrl   — string          API endpoint (default: /api/admin/upload-image)
 *   context     — string          passed as FormData "context" field (e.g. "categories", "banners")
 *   label       — string          optional label shown inside the dropzone
 *   aspectHint  — string          e.g. "16:9 recommended" shown as hint
 *   disabled    — boolean
 */
export default function SingleImageUpload({
  value      = null,
  onChange,
  uploadUrl  = "/api/admin/upload-image",
  context    = "general",
  label      = "Click or drag to upload",
  aspectHint = null,
  disabled   = false,
}) {
  const [status, setStatus]   = useState("idle"); // idle | uploading | error
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(value);  // optimistic local preview
  const inputRef = useRef(null);

  const upload = async (file) => {
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error("Invalid file type. Use JPEG, PNG, WebP, GIF, or AVIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File too large. Maximum size is 5 MB.");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setStatus("uploading");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("context", context);

      const res  = await fetch(uploadUrl, { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");

      URL.revokeObjectURL(localUrl);
      setPreview(data.url);
      setStatus("idle");
      onChange?.(data.url);
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setPreview(value); // revert to original
      setStatus("error");
      toast.error(err.message || "Image upload failed. Please try again.");
    }
  };

  const handleFiles = (files) => {
    if (disabled || !files?.length) return;
    upload(files[0]);
  };

  const remove = () => {
    setPreview(null);
    setStatus("idle");
    onChange?.(null);
  };

  const uploading = status === "uploading";

  return (
    <div className="space-y-2">
      {/* If there's a preview, show it with replace/remove controls */}
      {preview ? (
        <div className="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
          <img
            src={preview}
            alt="Uploaded"
            className="w-full object-cover max-h-48"
            onError={() => setPreview(null)}
          />

          {/* Uploading overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
              <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-xs font-bold">Uploading…</span>
            </div>
          )}

          {/* Controls overlay */}
          {!uploading && !disabled && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-bold bg-white text-gray-800 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors shadow"
              >
                <Upload className="w-3.5 h-3.5" /> Replace
              </button>
              <button
                type="button"
                onClick={remove}
                className="flex items-center gap-1.5 text-xs font-bold bg-white text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors shadow"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty dropzone */
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!disabled) handleFiles(e.dataTransfer.files); }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-8 px-4 ${
            disabled
              ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-600"
              : dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-gray-200 dark:border-gray-600 hover:border-primary/60 hover:bg-gray-50 dark:hover:bg-gray-700/40"
          }`}
        >
          {uploading ? (
            <>
              <span className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-primary">Uploading…</p>
            </>
          ) : (
            <>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                dragOver ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
              }`}>
                {status === "error" ? <AlertCircle className="w-5 h-5 text-red-500" /> : <ImageIcon className="w-5 h-5" />}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {status === "error" ? "Upload failed — try again" : label}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  JPEG, PNG, WebP · Max 5 MB{aspectHint ? ` · ${aspectHint}` : ""}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXT}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
