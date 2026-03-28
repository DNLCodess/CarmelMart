import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
      return NextResponse.json({ error: "File must be JPEG, PNG, or WebP" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const admin = createAdminClient();
    const path = `avatars/${user.id}.${ext}`;

    const { error: uploadErr } = await admin.storage
      .from("user-content")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = admin.storage.from("user-content").getPublicUrl(path);

    const { error: updateErr } = await admin
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, avatar_url: publicUrl });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
