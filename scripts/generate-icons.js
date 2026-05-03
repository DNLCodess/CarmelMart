const sharp = require("sharp");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
// Use the largest source for best quality
const source = path.join(publicDir, "cart-carmel.png");

async function makeCenteredIcon(outputPath, size, bgColor, paddingFraction) {
  const padding = Math.round(size * paddingFraction);
  const innerSize = size - padding * 2;

  // Trim to actual content bounds, then resize to innerSize
  const trimmed = await sharp(source)
    .trim({ background: "#ffffff", threshold: 10 })
    .resize(innerSize, innerSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bgColor,
    },
  })
    .composite([{ input: trimmed, top: padding, left: padding }])
    .png()
    .toFile(outputPath);

  console.log(`Generated: ${outputPath}`);
}

async function main() {
  const white = { r: 255, g: 255, b: 255, alpha: 255 };
  const brand = { r: 86, g: 2, b: 56, alpha: 255 }; // #560238

  await makeCenteredIcon(path.join(publicDir, "android-chrome-192x192.png"), 192, brand, 0.15);
  await makeCenteredIcon(path.join(publicDir, "android-chrome-512x512.png"), 512, brand, 0.15);
  await makeCenteredIcon(path.join(publicDir, "apple-touch-icon.png"), 180, brand, 0.15);
  // Maskable needs 20% safe-zone padding and a filled background so no transparency at edges
  await makeCenteredIcon(path.join(publicDir, "maskable-512x512.png"), 512, brand, 0.20);

  console.log("Done.");
}

main().catch(console.error);
