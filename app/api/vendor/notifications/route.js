import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getVendor() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!p || p.role !== "vendor") return null;
  return { user, admin };
}

// GET — fetch recent notifications
export async function GET() {
  try {
    const ctx = await getVendor();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data } = await ctx.admin
      .from("notifications")
      .select("id, type, title, message, link, read, created_at")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const notifications = (data || []).map((n) => ({
      id:        n.id,
      type:      n.type,
      title:     n.title,
      message:   n.message,
      link:      n.link,
      read:      n.read,
      createdAt: n.created_at,
      ago:       timeAgo(n.created_at),
    }));

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — mark notifications as read
export async function PATCH(request) {
  try {
    const ctx = await getVendor();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { ids } = body; // array of IDs, or omit to mark all read

    if (ids !== undefined && !Array.isArray(ids)) {
      return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
    }

    let query = ctx.admin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", ctx.user.id);

    if (ids?.length) {
      query = query.in("id", ids);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
