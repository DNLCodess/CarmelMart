import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const MAX_BYTES   = 5 * 1024 * 1024; // 5 MB
const ALLOWED     = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const BUCKET      = "site-images";

// Allowed contexts map to storage sub-folders
const CONTEXTS = new Set(["categories", "banners", "general"]);

export async function POST(request) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const form    = await request.formData();
    const file    = form.get("file");
    const context = form.get("context") || "general";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF, and AVIF are allowed." }, { status: 400 });
    }
    if (!CONTEXTS.has(context)) {
      return NextResponse.json({ error: "Invalid context" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum size is 5 MB." }, { status: 400 });
    }

    const ext  = file.name.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${context}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType:  file.type,
        cacheControl: "3600",
        upsert:       false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ success: true, url: publicUrl, path });
  } catch (error) {
    console.error("[admin/upload-image]", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { path } = await request.json();
    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const { error } = await admin.storage.from(BUCKET).remove([path]);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
