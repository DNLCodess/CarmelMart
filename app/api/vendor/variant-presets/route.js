/**
 * Vendor-defined reusable variant option presets.
 *
 * Lets vendors save named lists of option values (e.g. custom sizes) that they
 * can apply to a product's variant dimensions instead of being limited to the
 * fixed per-category options in lib/product-templates.js.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_DIMENSIONS = ["size", "color", "storage"];
const MAX_VALUES = 50;
const MAX_VALUE_LEN = 40;
const MAX_NAME_LEN = 60;

async function authorise() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: u } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!u || u.role !== "vendor") return null;
  return { user, admin };
}

/** Clean an incoming values array: trim, drop empties, de-duplicate, cap. */
function sanitiseValues(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    const v = String(raw ?? "").trim().slice(0, MAX_VALUE_LEN);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= MAX_VALUES) break;
  }
  return out;
}

// GET — list the current vendor's presets
export async function GET() {
  try {
    const ctx = await authorise();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await ctx.admin
      .from("vendor_variant_presets")
      .select("id, dimension, name, values, created_at")
      .eq("vendor_id", ctx.user.id)
      .order("dimension", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ presets: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — create a preset { dimension, name, values }
export async function POST(request) {
  try {
    const ctx = await authorise();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { dimension, name, values } = await request.json();

    if (!ALLOWED_DIMENSIONS.includes(dimension))
      return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });

    const cleanName = String(name ?? "").trim().slice(0, MAX_NAME_LEN);
    if (!cleanName) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const cleanValues = sanitiseValues(values);
    if (cleanValues.length === 0)
      return NextResponse.json({ error: "Add at least one value" }, { status: 400 });

    const { data, error } = await ctx.admin
      .from("vendor_variant_presets")
      .insert({ vendor_id: ctx.user.id, dimension, name: cleanName, values: cleanValues })
      .select("id, dimension, name, values, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ preset: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — update a preset { id, name?, values? }
export async function PATCH(request) {
  try {
    const ctx = await authorise();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, name, values } = await request.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const update = { updated_at: new Date().toISOString() };

    if (name !== undefined) {
      const cleanName = String(name ?? "").trim().slice(0, MAX_NAME_LEN);
      if (!cleanName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      update.name = cleanName;
    }

    if (values !== undefined) {
      const cleanValues = sanitiseValues(values);
      if (cleanValues.length === 0)
        return NextResponse.json({ error: "Add at least one value" }, { status: 400 });
      update.values = cleanValues;
    }

    const { data, error } = await ctx.admin
      .from("vendor_variant_presets")
      .update(update)
      .eq("id", id)
      .eq("vendor_id", ctx.user.id)
      .select("id, dimension, name, values, created_at")
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    return NextResponse.json({ preset: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove a preset by ?id=
export async function DELETE(request) {
  try {
    const ctx = await authorise();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await ctx.admin
      .from("vendor_variant_presets")
      .delete()
      .eq("id", id)
      .eq("vendor_id", ctx.user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
