/**
 * CarmelMart — Image Migration: Unsplash → Supabase Storage
 *
 * Reads every product's `images` array, downloads each Unsplash URL,
 * uploads to the 'product-images' bucket, and patches the product row
 * with the new Storage URL.
 *
 * USAGE:
 *   node scripts/migrate-images-to-storage.js
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Run setup-storage.js first to ensure the bucket exists.
 */

const { createClient } = require("@supabase/supabase-js");
const https  = require("https");
const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const crypto = require("crypto");

require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BUCKET     = "product-images";
const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

function download(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const tmp   = path.join(os.tmpdir(), `cm-img-${crypto.randomBytes(6).toString("hex")}.jpg`);
    const file  = fs.createWriteStream(tmp);
    proto.get(url, (res) => {
      // Follow redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(tmp);
        return download(res.headers.location).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(tmp); });
    }).on("error", (e) => { fs.unlink(tmp, () => {}); reject(e); });
  });
}

function mimeFromUrl(url) {
  if (url.includes(".png"))  return "image/png";
  if (url.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

function storageKey(productId, idx) {
  return `products/${productId}/${idx}.jpg`;
}

async function migrateProduct(product) {
  const images = product.images ?? [];
  if (images.length === 0) return { id: product.id, skipped: true };

  const newImages = [];
  let changed = false;

  for (let i = 0; i < images.length; i++) {
    const url = images[i];

    // Already a storage URL — skip
    if (url && url.includes(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      newImages.push(url);
      continue;
    }

    // Only migrate Unsplash or known CDN URLs
    if (!url || (!url.includes("unsplash.com") && !url.includes("placehold"))) {
      newImages.push(url);
      continue;
    }

    const key = storageKey(product.id, i);
    let tmpPath;

    try {
      process.stdout.write(`  [${product.id.slice(0, 8)}] img[${i}] downloading…`);
      tmpPath = await download(url);
      const buffer = fs.readFileSync(tmpPath);

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(key, buffer, { contentType: mimeFromUrl(url), upsert: true });

      if (error) throw error;

      const storageUrl = `${STORAGE_BASE}/${key}`;
      newImages.push(storageUrl);
      changed = true;
      console.log(` ✅ ${key}`);
    } catch (err) {
      console.log(` ⚠️  failed (${err.message}) — keeping original`);
      newImages.push(url);
    } finally {
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch {} }
    }
  }

  if (changed) {
    const { error: updateErr } = await supabase
      .from("products")
      .update({ images: newImages })
      .eq("id", product.id);

    if (updateErr) {
      console.warn(`  ⚠️  DB update failed for ${product.id}: ${updateErr.message}`);
    }
  }

  return { id: product.id, changed, imageCount: images.length };
}

async function main() {
  console.log("🖼️  CarmelMart — Image Migration to Supabase Storage\n");

  // Fetch all products with at least one image
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, images")
    .not("images", "is", null);

  if (error) {
    console.error("❌ Failed to fetch products:", error.message);
    process.exit(1);
  }

  const eligible = products.filter((p) => Array.isArray(p.images) && p.images.length > 0);
  console.log(`Found ${eligible.length} products with images.\n`);

  let migrated = 0;
  let skipped  = 0;

  for (const product of eligible) {
    const result = await migrateProduct(product);
    if (result.skipped || !result.changed) {
      skipped++;
    } else {
      migrated++;
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Migrated: ${migrated} products`);
  console.log(`   Skipped:  ${skipped} products (already on Storage or no Unsplash URLs)`);
  console.log(`\nAll product images are now at: ${STORAGE_BASE}/products/<id>/<index>.jpg`);
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
