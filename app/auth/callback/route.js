import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReferralCode } from "@/lib/utils";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");

  // Supabase can send back an error param on denial
  if (error) {
    return NextResponse.redirect(`${origin}/login?oauth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?oauth_error=missing_code`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[OAuth callback] exchange error:", exchangeError.message);
    return NextResponse.redirect(`${origin}/login?oauth_error=exchange_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?oauth_error=no_user`);
  }

  // Check whether this Google user already has a profile
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Brand-new Google user — create a customer profile
    const fullName  = user.user_metadata?.full_name ?? "";
    const [firstName, ...rest] = fullName.trim().split(" ");
    const avatarUrl = user.user_metadata?.avatar_url ?? null;

    const { error: insertError } = await admin.from("users").insert({
      id:             user.id,
      email:          user.email,
      role:           "customer",
      first_name:     firstName || "",
      last_name:      rest.join(" ") || "",
      avatar_url:     avatarUrl,
      referral_code:  generateReferralCode(),
      wallet_balance: 0,
    });

    if (insertError) {
      console.error("[OAuth callback] profile insert error:", insertError.message);
      // A user with no profile row has role=null and will fail every auth guard.
      // Sign them out so they can retry cleanly rather than landing in a broken state.
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?oauth_error=profile_failed`);
    }

    // New users land on home
    return NextResponse.redirect(`${origin}/`);
  }

  // Returning user — go where they were headed
  // Reject protocol-relative URLs like //evil.com that pass a startsWith("/") check
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(`${origin}${safe}`);
}
