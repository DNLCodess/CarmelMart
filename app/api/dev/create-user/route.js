import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Only available in development
export async function POST(request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { email, password, role, firstName, lastName, businessName } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: "email, password, and role are required" }, { status: 400 });
    }
    if (!["admin", "vendor", "customer"].includes(role)) {
      return NextResponse.json({ error: "role must be admin, vendor, or customer" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification for dev
      user_metadata: {
        first_name: firstName ?? "Dev",
        last_name:  lastName  ?? "User",
      },
    });

    if (authError) throw new Error(`Auth error: ${authError.message}`);
    const userId = authData.user.id;

    // 2. Upsert into public.users
    const referralCode = `DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const { error: userError } = await admin
      .from("users")
      .upsert({
        id:            userId,
        email,
        first_name:    firstName ?? "Dev",
        last_name:     lastName  ?? "User",
        role,
        referral_code: referralCode,
        wallet_balance: 0,
      });

    if (userError) {
      // Rollback auth user
      await admin.auth.admin.deleteUser(userId);
      throw new Error(`Profile error: ${userError.message}`);
    }

    // 3. If vendor, create vendors record (auto-verified for dev)
    if (role === "vendor") {
      const name = businessName?.trim() || `${firstName ?? "Dev"}'s Store`;
      const { error: vendorError } = await admin
        .from("vendors")
        .insert({
          id:                  userId,
          business_name:       name,
          verification_status: "verified",
          nin_verified:        true,
          cac_verified:        false,
          subscription_tier:   "free",
        });

      if (vendorError) {
        await admin.auth.admin.deleteUser(userId);
        throw new Error(`Vendor error: ${vendorError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email, role },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// List all users (dev only)
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("users")
      .select("id, email, first_name, last_name, role, created_at, vendors ( business_name, verification_status )")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ success: true, users: data ?? [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
