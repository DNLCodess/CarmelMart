/**
 * CarmelMart — Supabase Storage Setup Script
 *
 * Creates the 'product-images' public bucket and uploads placeholder
 * product images sourced from Unsplash.
 *
 * USAGE:
 *   1. Copy .env.local to .env (or set env vars in shell)
 *   2. Run: node scripts/setup-storage.js
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require("@supabase/supabase-js");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");

require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = "product-images";

// Maps product key → Unsplash URL
const PRODUCT_IMAGES = [
  { key: "sony-wh1000xm5.jpg",        url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80" },
  { key: "samsung-qled-tv.jpg",        url: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&q=80" },
  { key: "iphone-15-pro.jpg",          url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&q=80" },
  { key: "macbook-air-m2.jpg",         url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80" },
  { key: "dell-ultrasharp-27.jpg",     url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80" },
  { key: "anker-gan-charger.jpg",      url: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80" },
  { key: "jbl-charge5.jpg",            url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80" },
  { key: "agbada-set.jpg",             url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80" },
  { key: "ankara-dress.jpg",           url: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80" },
  { key: "leather-oxfords.jpg",        url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80" },
  { key: "adire-coord-set.jpg",        url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80" },
  { key: "luxury-tote-bag.jpg",        url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80" },
  { key: "l-shaped-sofa.jpg",          url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80" },
  { key: "tefal-cookware.jpg",         url: "https://images.unsplash.com/photo-1584990347449-a2d4c2e4e20c?w=600&q=80" },
  { key: "philips-air-fryer.jpg",      url: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80" },
  { key: "king-duvet-set.jpg",         url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80" },
  { key: "ceramic-vases.jpg",          url: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80" },
  { key: "vitamin-c-serum.jpg",        url: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80" },
  { key: "mens-grooming-kit.jpg",      url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80" },
  { key: "shea-butter-cream.jpg",      url: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80" },
  { key: "oud-rose-perfume.jpg",       url: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&q=80" },
  { key: "olympic-barbell-set.jpg",    url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80" },
  { key: "foldable-treadmill.jpg",     url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80" },
  { key: "nigerian-business-books.jpg",url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80" },
  { key: "music-production.jpg",       url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80" },
];

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), `cm-${Date.now()}.jpg`);
    const file = fs.createWriteStream(tmp);
    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(tmp); });
    }).on("error", reject);
  });
}

async function main() {
  console.log("📦 CarmelMart Storage Setup\n");

  // 1. Create bucket
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (bucketErr && !bucketErr.message.includes("already exists")) {
    console.error("❌ Bucket creation failed:", bucketErr.message);
    process.exit(1);
  }
  console.log(`✅ Bucket '${BUCKET}' ready\n`);

  // 1b. Create user-content bucket for avatars
  const { error: ucErr } = await supabase.storage.createBucket("user-content", {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (ucErr && !ucErr.message.includes("already exists")) {
    console.warn("⚠️  user-content bucket:", ucErr.message);
  } else {
    console.log("✅ Bucket 'user-content' ready\n");
  }

  // 2. Upload images
  for (const { key, url } of PRODUCT_IMAGES) {
    try {
      console.log(`  ↓ Downloading ${key}…`);
      const tmpPath = await downloadFile(url);
      const buffer = fs.readFileSync(tmpPath);

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(key, buffer, { contentType: "image/jpeg", upsert: true });

      fs.unlinkSync(tmpPath);

      if (error) {
        console.warn(`  ⚠️  Upload failed for ${key}: ${error.message}`);
      } else {
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;
        console.log(`  ✅ ${key} → ${publicUrl}`);
      }
    } catch (err) {
      console.warn(`  ⚠️  Error processing ${key}:`, err.message);
    }
  }

  console.log("\n✅ Storage setup complete!");
  console.log(`\nAll images are at: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/<filename>`);
  console.log("\nNext step: Run the seed.sql in Supabase SQL Editor, then update");
  console.log("the image URLs in the products table to use the Storage URLs above.\n");
}

main().catch(console.error);
