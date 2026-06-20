import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorise(supabase, admin) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["accountant", "admin"].includes(profile.role)) return null;
  return user;
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const admin    = createAdminClient();
    if (!await authorise(supabase, admin)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const range  = searchParams.get("range")  || "30d";
    const type   = searchParams.get("type")   || null; // credit | debit
    const search = searchParams.get("search") || null;
    const page   = Math.max(1, Number(searchParams.get("page") || 1));
    const limit  = 30;

    const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
    const days    = daysMap[range];
    const since   = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

    let q = admin
      .from("wallet_transactions")
      .select("id, user_id, type, amount, description, reference, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (since) q = q.gte("created_at", since);
    if (type)  q = q.eq("type", type);

    const { data: rows, count, error: qErr } = await q;
    if (qErr) throw qErr;

    // Resolve vendor/user names
    const userIds = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))];
    let userMap = {};
    if (userIds.length) {
      const { data: users } = await admin
        .from("users").select("id, email, first_name, last_name, role")
        .in("id", userIds);
      userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));
    }

    let transactions = (rows || []).map((r) => {
      const u = userMap[r.user_id];
      const name = u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email : "Unknown";
      return {
        id:          r.id,
        type:        r.type,        // credit | debit
        amount:      r.amount ?? 0,
        description: r.description ?? "—",
        reference:   r.reference   ?? null,
        user:        name,
        userEmail:   u?.email ?? null,
        userRole:    u?.role  ?? null,
        date:        new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
        rawDate:     r.created_at,
      };
    });

    if (search) {
      const sq = search.toLowerCase();
      transactions = transactions.filter(
        (t) =>
          t.user.toLowerCase().includes(sq) ||
          (t.userEmail && t.userEmail.toLowerCase().includes(sq)) ||
          (t.description && t.description.toLowerCase().includes(sq)) ||
          (t.reference && t.reference.toLowerCase().includes(sq)),
      );
    }

    const totalCredits = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const totalDebits  = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      transactions,
      summary: { totalCredits, totalDebits, net: totalCredits - totalDebits },
      pagination: { page, pages: Math.ceil((count ?? 0) / limit), total: count ?? 0 },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
