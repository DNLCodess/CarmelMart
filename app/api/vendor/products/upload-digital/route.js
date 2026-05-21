import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkStorageLimit, checkUploadType, checkFileSize, formatStorageBytes } from "@/lib/subscription";
import { randomUUID } from "crypto";

// Absolute hard cap — no single file may exceed this regardless of tier
const HARD_MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const BUCKET = "digital-products";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Fetch vendor tier + usage before reading the full file buffer
    const { data: vendor } = await admin
      .from("vendors")
      .select("subscription_tier, digital_storage_bytes")
      .eq("id", user.id)
      .single();

    const tier      = vendor?.subscription_tier ?? "free";
    const usedBytes = vendor?.digital_storage_bytes ?? 0;

    // Tier-based file type check
    const typeCheck = checkUploadType(tier, file.type);
    if (!typeCheck.allowed) {
      const tierNames = { free: "Basic", premium: "Premium", vip: "VIP" };
      return NextResponse.json(
        {
          error: `File type "${file.type}" is not available on your ${tierNames[tier] ?? tier} plan. Upgrade to access audio and video formats.`,
          code: "FILE_TYPE_NOT_ALLOWED",
          allowedTypes: typeCheck.allowedTypes,
        },
        { status: 403 },
      );
    }

    const bytes = await file.arrayBuffer();
    const fileSize = bytes.byteLength;

    // Absolute hard cap (VIP ceiling)
    if (fileSize > HARD_MAX_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum allowed size is 500 MB." }, { status: 400 });
    }

    // Tier-based per-file size check
    const sizeCheck = checkFileSize(tier, fileSize);
    if (!sizeCheck.allowed) {
      return NextResponse.json(
        {
          error: `File too large for your plan. Your plan allows up to ${formatStorageBytes(sizeCheck.limit)} per file. Upgrade to upload larger files.`,
          code: "FILE_TOO_LARGE_FOR_TIER",
          limit: sizeCheck.limit,
          fileSize,
        },
        { status: 403 },
      );
    }

    const storageCheck = checkStorageLimit(tier, usedBytes, fileSize);
    if (!storageCheck.allowed) {
      return NextResponse.json(
        {
          error: `Storage limit reached. Your ${tier} plan allows ${formatStorageBytes(storageCheck.limit)} of digital file storage. You have used ${formatStorageBytes(usedBytes)}. Upgrade your plan to upload more files.`,
          code:      "STORAGE_LIMIT_REACHED",
          used:      usedBytes,
          limit:     storageCheck.limit,
          remaining: storageCheck.remaining,
          fileSize,
        },
        { status: 403 },
      );
    }

    const ext  = file.name.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${user.id}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType:  file.type,
        cacheControl: "3600",
        upsert:       false,
      });

    if (uploadError) throw uploadError;

    // Increment vendor's storage usage atomically
    await admin
      .from("vendors")
      .update({ digital_storage_bytes: usedBytes + fileSize })
      .eq("id", user.id);

    // Return path + size — the form stores size so the product save can record it
    return NextResponse.json({ success: true, path, size: fileSize });
  } catch (error) {
    console.error("[vendor/products/upload-digital]", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { path } = await request.json();
    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }
    if (!path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get file size from storage before deleting so we can decrement the quota
    const folder   = path.split("/").slice(0, -1).join("/");
    const filename = path.split("/").pop();
    const { data: fileList } = await admin.storage.from(BUCKET).list(folder);
    const fileEntry = fileList?.find((f) => f.name === filename);
    const fileSize  = fileEntry?.metadata?.size ?? 0;

    const { error } = await admin.storage.from(BUCKET).remove([path]);
    if (error) throw error;

    // Decrement storage usage (floor at 0 to guard against drift)
    if (fileSize > 0) {
      const { data: vendor } = await admin
        .from("vendors")
        .select("digital_storage_bytes")
        .eq("id", user.id)
        .single();

      const newUsed = Math.max(0, (vendor?.digital_storage_bytes ?? 0) - fileSize);
      await admin.from("vendors").update({ digital_storage_bytes: newUsed }).eq("id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
  }
}
