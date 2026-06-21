"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ProductDetailContent } from "@/app/(pages)/product/[id]/page";

// ── Unsplash image helpers (seed-stable) ─────────────────────────────────────
const IMG = {
  fashion:    ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&q=80&fit=crop"],
  footwear:   ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=700&q=80&fit=crop"],
  accessories:["https://images.unsplash.com/photo-1548036161-6516f1b7c0d5?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700&q=80&fit=crop"],
  electronics:["https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1498049794561-7780e7231661?w=700&q=80&fit=crop"],
  books:      ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1512820790803-83ca734da794?w=700&q=80&fit=crop"],
  jewelry:    ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=700&q=80&fit=crop"],
  fabric:     ["https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1603400521630-9f2de124b33b?w=700&q=80&fit=crop"],
  home:       ["https://images.unsplash.com/photo-1555041469-db61040b2293?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=700&q=80&fit=crop"],
  food:       ["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700&q=80&fit=crop"],
  auto:       ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=700&q=80&fit=crop"],
  sports:     ["https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1517649763962-0c623066013b?w=700&q=80&fit=crop"],
  toys:       ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=700&q=80&fit=crop"],
  games:      ["https://images.unsplash.com/photo-1511512578047-ab702b5a4b99?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=700&q=80&fit=crop"],
  music:      ["https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=700&q=80&fit=crop"],
  standard:   ["https://images.unsplash.com/photo-1541795795328-f073b763494e?w=700&q=80&fit=crop","https://images.unsplash.com/photo-1497366216548-37526070297c?w=700&q=80&fit=crop"],
};

const VENDOR = { id: "v1", name: "CarmelMart Store", slug: "carmelmart", verified: true };

// ── Mock reviews preloaded for every template ────────────────────────────────
const MOCK_REVIEWS = [
  { id:"r1", author:"Amaka O.", rating:5, date:"2026-05-12", comment:"Absolutely love it! Great quality and fast delivery. Will definitely buy again.", helpful:14 },
  { id:"r2", author:"Chidi N.", rating:4, date:"2026-04-28", comment:"Very good product. Matches the description perfectly. Only minor issue was the packaging.", helpful:7 },
  { id:"r3", author:"Fatima M.", rating:5, date:"2026-04-10", comment:"Exceeded my expectations. The quality is top-notch and worth every kobo!", helpful:22 },
  { id:"r4", author:"Emeka A.", rating:3, date:"2026-03-22", comment:"Average. Good for the price but nothing special. Delivery was quick though.", helpful:3 },
  { id:"r5", author:"Ngozi P.", rating:5, date:"2026-03-08", comment:"Perfect! Exactly as described. The vendor was very responsive too.", helpful:18 },
];

const MOCK_RELATED = [
  { id:"rel1", name:"Complementary Item A", price:15000, salePrice:null, images:["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80"], vendor:{name:"ShopNG"} },
  { id:"rel2", name:"Popular Choice B", price:8500, salePrice:7200, images:["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80"], vendor:{name:"VendorHub"} },
  { id:"rel3", name:"Top Rated Item C", price:32000, salePrice:null, images:["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80"], vendor:{name:"BestDeals"} },
  { id:"rel4", name:"Trending Pick D", price:5500, salePrice:4800, images:["https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&q=80"], vendor:{name:"TopShop"} },
];

// ── Scenario presets ─────────────────────────────────────────────────────────
const SCENARIOS = {
  full:    { label:"Fully Populated",    badge:"New Arrival", saleMultiplier:null, outOfStock:false, tiers:true,  digitalAlso:false },
  sale:    { label:"Sale / Discount",    badge:null,          saleMultiplier:0.75, outOfStock:false, tiers:false, digitalAlso:false },
  oos:     { label:"Some Variants OOS",  badge:null,          saleMultiplier:null, outOfStock:true,  tiers:false, digitalAlso:false },
  tiers:   { label:"Quantity Pricing",   badge:"Bulk Deal",   saleMultiplier:null, outOfStock:false, tiers:true,  digitalAlso:false },
  digital: { label:"Digital + Physical", badge:null,          saleMultiplier:null, outOfStock:false, tiers:false, digitalAlso:true  },
};

// ── Base mock products per template ─────────────────────────────────────────
function buildMock(templateKey, scenario) {
  const sc = SCENARIOS[scenario];
  const base = BASE_PRODUCTS[templateKey];
  if (!base) return null;

  const price = base.price;
  const salePrice = sc.saleMultiplier ? Math.round(price * sc.saleMultiplier / 100) * 100 : null;

  const variants = base.variants?.map((v, i) => ({
    ...v,
    stock: sc.outOfStock && i % 3 === 2 ? 0 : v.stock,
  }));

  const quantityTiers = sc.tiers ? base.quantityTiers : null;

  return {
    ...base,
    id: `mock-${templateKey}-${scenario}`,
    salePrice,
    variants,
    quantityTiers,
    badge: sc.badge,
    isDigital: base.isDigital ?? false,
    digitalPrice: sc.digitalAlso ? Math.round(price * 0.55 / 100) * 100 : (base.isDigital ? price : null),
    avgRating: 4.6,
    reviewCount: 128,
    soldCount: 843,
    soldToday: 17,
    location: "Lagos, Nigeria",
  };
}

// ── Base product definitions ─────────────────────────────────────────────────
const BASE_PRODUCTS = {
  fashion: {
    name: "Premium Ankara Wrap Dress — Long Sleeve",
    description: `This stunning Ankara wrap dress is crafted from high-quality cotton fabric featuring vibrant traditional prints. The classic wrap silhouette is flattering for all body types, with adjustable waist ties for the perfect fit.

The long sleeves add sophistication while the below-knee length makes it suitable for formal events, office wear, and traditional ceremonies. Machine-washable and colourfast after the first wash.`,
    price: 18_000,
    stock: 0,
    images: IMG.fashion,
    vendor: VENDOR,
    category: { id:"cat-1", name:"Clothing & Fashion", slug:"fashion", template:"fashion" },
    condition: "new",
    variantType: "variants",
    variants: [
      { id:"fv1", combination:{ color:"Red",   size:"S"   }, stock:4,  price:null },
      { id:"fv2", combination:{ color:"Red",   size:"M"   }, stock:12, price:null },
      { id:"fv3", combination:{ color:"Red",   size:"L"   }, stock:8,  price:null },
      { id:"fv4", combination:{ color:"Red",   size:"XL"  }, stock:3,  price:null },
      { id:"fv5", combination:{ color:"Blue",  size:"S"   }, stock:6,  price:null },
      { id:"fv6", combination:{ color:"Blue",  size:"M"   }, stock:9,  price:null },
      { id:"fv7", combination:{ color:"Blue",  size:"L"   }, stock:0,  price:null },
      { id:"fv8", combination:{ color:"Black", size:"M"   }, stock:15, price:null },
      { id:"fv9", combination:{ color:"Black", size:"L"   }, stock:7,  price:null },
      { id:"fv10",combination:{ color:"Black", size:"XL"  }, stock:2,  price:null },
      { id:"fv11",combination:{ color:"Green", size:"S"   }, stock:5,  price:null },
      { id:"fv12",combination:{ color:"Green", size:"M"   }, stock:0,  price:null },
    ],
    attributes: { material:"100% Cotton Ankara fabric", care:"Hand wash cold, line dry only", style:"Traditional / Formal Events / Office Wear" },
    quantityTiers: [{ min_qty:3, price:15000 }, { min_qty:6, price:12500 }, { min_qty:12, price:10000 }],
  },

  footwear: {
    name: "Handcrafted Italian Leather Oxford Shoes",
    description: `Elegantly crafted from genuine Italian leather, these Oxford shoes represent the pinnacle of Nigerian formal footwear. The Goodyear-welted construction ensures lasting durability while the leather sole develops a beautiful patina over time.

Perfect for boardroom meetings, weddings, and high-profile events. Available in EU sizes 40–46.`,
    price: 65_000,
    stock: 0,
    images: IMG.footwear,
    vendor: VENDOR,
    category: { id:"cat-2", name:"Shoes & Footwear", slug:"footwear", template:"footwear" },
    condition: "new",
    variantType: "variants",
    variants: [
      { id:"shv1", combination:{ size:"40", color:"Black" }, stock:5,  price:null },
      { id:"shv2", combination:{ size:"41", color:"Black" }, stock:8,  price:null },
      { id:"shv3", combination:{ size:"42", color:"Black" }, stock:10, price:null },
      { id:"shv4", combination:{ size:"43", color:"Black" }, stock:7,  price:null },
      { id:"shv5", combination:{ size:"44", color:"Black" }, stock:4,  price:null },
      { id:"shv6", combination:{ size:"41", color:"Brown" }, stock:6,  price:null },
      { id:"shv7", combination:{ size:"42", color:"Brown" }, stock:8,  price:null },
      { id:"shv8", combination:{ size:"43", color:"Brown" }, stock:5,  price:null },
      { id:"shv9", combination:{ size:"42", color:"Tan"   }, stock:4,  price:null },
      { id:"shv10",combination:{ size:"43", color:"Tan"   }, stock:3,  price:null },
      { id:"shv11",combination:{ size:"44", color:"Tan"   }, stock:0,  price:null },
    ],
    attributes: { material:"Genuine Italian Leather", sole:"Leather sole with rubber heel", closure:"Traditional lace-up" },
    quantityTiers: [{ min_qty:3, price:58000 }, { min_qty:6, price:52000 }],
  },

  accessories: {
    name: "Genuine Leather Tote Bag — Large",
    description: `This spacious tote is handcrafted from full-grain cowhide leather by Nigerian artisans in Lagos. The double-stitched handles can support up to 15kg. Interior features two zip pockets, four card slots, and a padded laptop sleeve (up to 15").

A perfect gift for the modern Nigerian professional woman.`,
    price: 38_500,
    stock: 0,
    images: IMG.accessories,
    vendor: VENDOR,
    category: { id:"cat-3", name:"Accessories", slug:"accessories", template:"accessories" },
    condition: "new",
    variantType: "variants",
    variants: [
      { id:"av1", combination:{ color:"Black" }, stock:12, price:null  },
      { id:"av2", combination:{ color:"Brown" }, stock:8,  price:null  },
      { id:"av3", combination:{ color:"Tan"   }, stock:5,  price:null  },
      { id:"av4", combination:{ color:"Beige" }, stock:3,  price:null  },
      { id:"av5", combination:{ color:"Navy"  }, stock:6,  price:null  },
    ],
    attributes: { material:"Full-grain cowhide leather", dimensions:"40cm × 32cm × 14cm", closure:"Magnetic snap + zip top" },
    quantityTiers: [{ min_qty:3, price:34000 }, { min_qty:5, price:30000 }],
  },

  electronics: {
    name: "Tecno Phantom X2 Pro — 5G Flagship Smartphone",
    description: `Experience flagship performance at a mid-range price. The Tecno Phantom X2 Pro packs a 6.8" AMOLED display at 120Hz, the Dimensity 9000 chipset, and a 50MP periscope telephoto camera capable of 10× optical zoom.

The 5000mAh battery supports 45W fast charging. Dual SIM, eSIM, and 5G ready. Ships with a 1-year Tecno Nigeria warranty.`,
    price: 320_000,
    stock: 0,
    images: IMG.electronics,
    vendor: VENDOR,
    category: { id:"cat-4", name:"Electronics & Gadgets", slug:"electronics", template:"electronics" },
    condition: "new",
    variantType: "variants",
    variants: [
      { id:"ev1",  combination:{ storage:"128GB", color:"Black" }, stock:8, price:300_000 },
      { id:"ev2",  combination:{ storage:"256GB", color:"Black" }, stock:5, price:340_000 },
      { id:"ev3",  combination:{ storage:"512GB", color:"Black" }, stock:2, price:390_000 },
      { id:"ev4",  combination:{ storage:"128GB", color:"White" }, stock:6, price:300_000 },
      { id:"ev5",  combination:{ storage:"256GB", color:"White" }, stock:4, price:340_000 },
      { id:"ev6",  combination:{ storage:"128GB", color:"Gold"  }, stock:3, price:310_000 },
      { id:"ev7",  combination:{ storage:"256GB", color:"Gold"  }, stock:0, price:350_000 },
    ],
    attributes: { brand:"Tecno", model:"Phantom X2 Pro", warranty:"1 Year Manufacturer Warranty", ram:["8GB","12GB","16GB"] },
    quantityTiers: [{ min_qty:3, price:290000 }, { min_qty:5, price:275000 }],
  },

  books_media: {
    name: "Things Fall Apart — Chinua Achebe (50th Anniversary Edition)",
    description: `Chinua Achebe's debut novel, Things Fall Apart, is one of the most important works of African literature ever written. Set in the fictional Igbo village of Umuofia in pre-colonial Nigeria, it tells the story of Okonkwo — a proud warrior and community leader whose world is upended by the arrival of European missionaries and colonial rule.

This 50th Anniversary Edition features a new introduction by Chimamanda Ngozi Adichie and a foreword by Achebe's son.`,
    price: 4_500,
    stock: 150,
    images: IMG.books,
    vendor: VENDOR,
    category: { id:"cat-5", name:"Books & Media", slug:"books", template:"books_media" },
    condition: "new",
    variantType: "none",
    variants: null,
    attributes: {},
    quantityTiers: [{ min_qty:5, price:3800 }, { min_qty:10, price:3200 }],
    isDigital: true,
    digitalPrice: 2_200,
    mediaAuthor: "Chinua Achebe",
    mediaPublisher: "Penguin Books / Heinemann",
    mediaIsbn: "978-0-385-47454-2",
    mediaEdition: "50th Anniversary Edition",
    mediaLanguage: "English",
    mediaPages: "224",
    mediaPublishDate: "2008-09-16",
    mediaFormat: "Hardcover",
    mediaGenre: ["African Literature","Classic Fiction","Historical Fiction","Post-Colonial"],
  },

  jewelry: {
    name: "18k Gold Solitaire Diamond Ring — 0.75ct",
    description: `A timeless piece from our luxury collection. This solitaire ring is set with a conflict-free round brilliant diamond (0.75 carats, F colour, VS1 clarity) in solid 18k yellow gold. Comes with GIA certification and a luxury presentation box.

Perfect for engagements, anniversaries, or as a personal indulgence. Complimentary resizing within 30 days of purchase.`,
    price: 850_000,
    stock: 4,
    images: IMG.jewelry,
    vendor: VENDOR,
    category: { id:"cat-6", name:"Jewelry & Luxury", slug:"jewelry", template:"jewelry" },
    condition: "new",
    variantType: "none",
    variants: null,
    attributes: { material:"18k Yellow Gold (750)", stone:"Round Brilliant Diamond — 0.75ct F/VS1 (GIA certified)", ring_size:"Size 7 (UK N½) — complimentary resizing", care:"Store in the provided box. Avoid chlorine and harsh chemicals." },
    quantityTiers: null,
  },

  fabric: {
    name: "Aso-oke Premium Gele & Iro Set — Hand-woven",
    description: `Authentic Yoruba hand-woven Aso-oke fabric, sourced directly from master weavers in Iseyin, Oyo State. This premium set includes 5 yards of head-tie (gele) fabric and 4 yards of iro wrapper fabric.

The metallic thread interlacing gives a beautiful shimmer under event lighting. Widely used for traditional weddings, owambes, and naming ceremonies.`,
    price: 22_000,
    stock: 0,
    images: IMG.fabric,
    vendor: VENDOR,
    category: { id:"cat-7", name:"Fabric & Textile", slug:"fabric", template:"fabric" },
    condition: "new",
    variantType: "variants",
    variants: [
      { id:"fbv1", combination:{ color:"Gold"     }, stock:15, price:22_000 },
      { id:"fbv2", combination:{ color:"Blue"     }, stock:10, price:22_000 },
      { id:"fbv3", combination:{ color:"Red"      }, stock:8,  price:22_000 },
      { id:"fbv4", combination:{ color:"Green"    }, stock:12, price:22_000 },
      { id:"fbv5", combination:{ color:"Silver"   }, stock:6,  price:24_000 },
      { id:"fbv6", combination:{ color:"Maroon"   }, stock:4,  price:22_000 },
      { id:"fbv7", combination:{ color:"Multicolor"},stock:7,  price:25_000 },
    ],
    attributes: { unit_type:"per_trouser", min_order:"5", fabric_type:"Aso-oke (hand-woven)", width:"45 inches" },
    quantityTiers: [{ min_qty:3, price:20000 }, { min_qty:6, price:18000 }, { min_qty:12, price:15500 }],
  },

  home_living: {
    name: "Solid Teak Dining Table Set — 6 Seater",
    description: `A stunning 6-seater dining set crafted from solid teak wood harvested from sustainable Nigerian plantations. The table features clean modern lines with a hand-rubbed tung oil finish that highlights the natural grain.

Chairs are upholstered in premium genuine leather. The set is partially assembled — only legs need to be attached (tools included). Delivery and in-home setup available in Lagos, Abuja, and Port Harcourt.`,
    price: 485_000,
    stock: 8,
    images: IMG.home,
    vendor: VENDOR,
    category: { id:"cat-8", name:"Home & Living", slug:"home-living", template:"home_living" },
    condition: "new",
    variantType: "none",
    variants: null,
    attributes: { material:"Solid Teak Wood + Genuine Leather seats", color:"Honey Teak with Ivory leather", dimensions:"180cm L × 90cm W × 76cm H (table)", weight:"62kg (complete set)", assembly:"yes" },
    quantityTiers: null,
  },

  consumables: {
    name: "Premium Stone-free Ofada Rice — 25kg Bag",
    description: `Ofada rice is the pride of Ogun State — a short-grain, slightly fermented local rice variety with a distinctive earthy flavour that pairs perfectly with Ayamase (Ofada stew). This premium grade has been triple-cleaned, stone-free, and sun-dried to optimal moisture.

NAFDAC approved and hygienically packaged in air-tight polypropylene bags. Retails as the highest quality available on the market.`,
    price: 42_000,
    stock: 320,
    images: IMG.food,
    vendor: VENDOR,
    category: { id:"cat-9", name:"Food & Consumables", slug:"food", template:"consumables" },
    condition: "new",
    variantType: "none",
    variants: null,
    attributes: { weight:"25kg per bag", expiry_info:"12 months from packaging date", ingredients:"100% natural Ofada rice (Oryza sativa glaberrima)", storage_info:"Store in a cool dry place, keep sealed after opening", certification:"NAFDAC Reg. No. 01-0001 · ISO 22000 certified" },
    quantityTiers: [{ min_qty:3, price:39000 }, { min_qty:6, price:36500 }, { min_qty:12, price:34000 }],
  },

  automotive: {
    name: "Bosch Iridium Spark Plug Set (×4) — OEM Grade",
    description: `Bosch Iridium spark plugs deliver a consistently strong spark throughout the plug's life. The ultra-fine 0.6mm iridium center electrode ensures maximum fuel efficiency, smooth engine idle, and reliable cold starts — critical in Nigerian climate conditions.

Compatible with most 4-cylinder petrol engines. Genuine Bosch product with hologram anti-counterfeit seal.`,
    price: 14_500,
    stock: 250,
    images: IMG.auto,
    vendor: VENDOR,
    category: { id:"cat-10", name:"Automotive & Tools", slug:"automotive", template:"automotive" },
    condition: "new",
    variantType: "none",
    variants: null,
    attributes: { brand:"Bosch", compatible_models:"Toyota Camry 2012–2022 · Honda Accord 2010–2020 · Hyundai Sonata · Kia Optima", part_number:"FR6KI332S / 0242245576", warranty:"18 months from installation" },
    quantityTiers: [{ min_qty:4, price:13000 }, { min_qty:8, price:11500 }],
  },

  sports: {
    name: "Nike Pro Elite Training Shorts + Jersey Set",
    description: `The Nike Pro Elite training set is engineered for intense workouts in tropical climates. The moisture-wicking Dri-FIT fabric moves sweat away from your skin while the mesh side panels provide superior ventilation.

Shorts feature an elastic waist with a drawstring and two side pockets. Shirt has a crew neck cut and a longer back hem for coverage during movement. Ideal for football, gym, track, and court sports.`,
    price: 28_000,
    stock: 0,
    images: IMG.sports,
    vendor: VENDOR,
    category: { id:"cat-11", name:"Sports & Fitness", slug:"sports", template:"sports" },
    condition: "new",
    variantType: "variants",
    variants: [
      { id:"spv1", combination:{ size:"S",   color:"Black" }, stock:10, price:null },
      { id:"spv2", combination:{ size:"M",   color:"Black" }, stock:15, price:null },
      { id:"spv3", combination:{ size:"L",   color:"Black" }, stock:12, price:null },
      { id:"spv4", combination:{ size:"XL",  color:"Black" }, stock:8,  price:null },
      { id:"spv5", combination:{ size:"S",   color:"Blue"  }, stock:7,  price:null },
      { id:"spv6", combination:{ size:"M",   color:"Blue"  }, stock:10, price:null },
      { id:"spv7", combination:{ size:"L",   color:"Blue"  }, stock:5,  price:null },
      { id:"spv8", combination:{ size:"S",   color:"Red"   }, stock:4,  price:null },
      { id:"spv9", combination:{ size:"M",   color:"Red"   }, stock:0,  price:null },
      { id:"spv10",combination:{ size:"L",   color:"Red"   }, stock:6,  price:null },
    ],
    attributes: { brand:"Nike", material:"100% Polyester Dri-FIT with mesh panels" },
    quantityTiers: [{ min_qty:3, price:24000 }, { min_qty:6, price:21000 }],
  },

  toys: {
    name: "LEGO Classic Creative Bricks & More — 1500 pieces",
    description: `Spark your child's imagination with this 1500-piece LEGO Classic set. The assorted bricks, plates, and specialty pieces come in 33 vibrant colours. Compatible with all LEGO sets.

Includes an idea booklet with 10 starter builds plus instructions for an open-ended city scene. Recommended for ages 4+. Bricks are BPA-free and meet all Nigerian Standard Organisation safety requirements.`,
    price: 24_500,
    stock: 85,
    images: IMG.toys,
    vendor: VENDOR,
    category: { id:"cat-12", name:"Toys & Children's Products", slug:"toys", template:"toys" },
    condition: "new",
    variantType: "none",
    variants: null,
    attributes: { age_range:"4 years and above (supervised for under 6)", material:"BPA-free ABS plastic", batteries:"No batteries required", brand:"LEGO" },
    quantityTiers: [{ min_qty:3, price:22000 }, { min_qty:5, price:20000 }],
  },

  video_games: {
    name: "EA Sports FC 25 — Ultimate Edition (PS5 + PS4)",
    description: `EA Sports FC 25 redefines the beautiful game with HyperMotionV technology, updated TTPAS (Total Team Play AI System), and the most authentic Nigerian Premier League rosters ever included in the series.

The Ultimate Edition includes 4600 FC Points, rare player items, and 3 FUT Ambassador Loan Player items. Physical disc + PSN code bundle — get both formats in one box.`,
    price: 48_000,
    stock: 67,
    images: IMG.games,
    vendor: VENDOR,
    category: { id:"cat-13", name:"Video Games", slug:"video-games", template:"video_games" },
    condition: "new",
    variantType: "none",
    variants: null,
    attributes: { platform:["PS5","PS4","PC / Steam"], genre:"Sports / Football Simulation", publisher:"EA Sports / Electronic Arts", age_rating:"PEGI 3 (Everyone)" },
    quantityTiers: null,
  },

  musical: {
    name: "Yamaha P-145 Digital Piano — 88 Weighted Keys",
    description: `The Yamaha P-145 is the perfect instrument for beginners and advancing pianists alike. Its 88 fully weighted Graded Hammer Standard keys deliver an authentic acoustic piano feel. The CFX Sampling technology reproduces the tone of Yamaha's flagship concert grand.

Includes a sustain pedal, power adapter, and music rest. Compatible with Yamaha Smart Pianist app for guided learning. Connect via Bluetooth MIDI or USB.`,
    price: 385_000,
    stock: 12,
    images: IMG.music,
    vendor: VENDOR,
    category: { id:"cat-14", name:"Musical Instruments", slug:"musical", template:"musical" },
    condition: "new",
    variantType: "none",
    variants: null,
    attributes: { brand:"Yamaha", instrument_type:"Digital Piano (88 weighted keys)", skill_level:"Beginner to Advanced", warranty:"2 Years Yamaha Nigeria Warranty" },
    quantityTiers: null,
  },

  standard: {
    name: "ErgoPlus Pro Ergonomic Office Chair",
    description: `The ErgoPlus Pro is designed for long-hour office use in Nigeria's demanding work environment. The breathable mesh backrest keeps you cool through Harmattan and humid seasons alike. Lumbar support is fully adjustable, as are the armrests (4D), seat depth, and headrest.

Supports up to 150kg. 5-year frame warranty. Available for Lagos island and mainland same-day delivery.`,
    price: 55_000,
    stock: 34,
    images: IMG.standard,
    vendor: VENDOR,
    category: { id:"cat-0", name:"General Products", slug:"general", template:"standard" },
    condition: "new",
    variantType: "none",
    variants: null,
    attributes: {},
    quantityTiers: [{ min_qty:3, price:50000 }, { min_qty:5, price:46000 }],
  },
};

// ── Category list for the picker ─────────────────────────────────────────────
const CATEGORIES = [
  { key:"fashion",     emoji:"👗", label:"Fashion"         },
  { key:"footwear",    emoji:"👟", label:"Footwear"        },
  { key:"accessories", emoji:"👜", label:"Accessories"     },
  { key:"electronics", emoji:"📱", label:"Electronics"     },
  { key:"books_media", emoji:"📚", label:"Books & Media"   },
  { key:"jewelry",     emoji:"💍", label:"Jewelry"         },
  { key:"fabric",      emoji:"🧵", label:"Fabric"          },
  { key:"home_living", emoji:"🛋️", label:"Home & Living"   },
  { key:"consumables", emoji:"🍚", label:"Food"            },
  { key:"automotive",  emoji:"🔧", label:"Automotive"      },
  { key:"sports",      emoji:"⚽", label:"Sports"          },
  { key:"toys",        emoji:"🧸", label:"Toys"            },
  { key:"video_games", emoji:"🎮", label:"Video Games"     },
  { key:"musical",     emoji:"🎹", label:"Music"           },
  { key:"standard",    emoji:"📦", label:"General"         },
];

const SCENARIO_LIST = [
  { key:"full",    label:"All Fields"       },
  { key:"sale",    label:"Sale / Discount"  },
  { key:"oos",     label:"Some OOS Variants"},
  { key:"tiers",   label:"Bulk Pricing"     },
  { key:"digital", label:"Digital + Physical"},
];

// ── Test page component ──────────────────────────────────────────────────────
export default function ProductPreviewPage() {
  const queryClient = useQueryClient();
  const [template, setTemplate] = useState("fashion");
  const [scenario, setScenario] = useState("full");

  const product = buildMock(template, scenario);

  useEffect(() => {
    if (!product) return;
    queryClient.setQueryData(["product-reviews", product.id], {
      reviews: MOCK_REVIEWS,
      total: MOCK_REVIEWS.length,
    });
    queryClient.setQueryData(["related-products", product.category?.id], {
      products: MOCK_RELATED,
    });
  }, [product?.id, queryClient]);

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      {/* ── Dev banner ─────────────────────────────────────────────────────── */}
      <div className="bg-indigo-600 text-white px-4 py-3 sticky top-0 z-[100] shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2.5">
            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full tracking-widest uppercase">Dev Preview</span>
            <p className="text-sm font-semibold">Product Detail Page — Template Preview</p>
            <span className="text-indigo-200 text-xs ml-auto hidden sm:inline">All data is mock — cart/wishlist actions work normally</span>
          </div>

          {/* Category picker */}
          <div className="flex gap-1.5 flex-wrap mb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => { setTemplate(cat.key); setScenario("full"); }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                  template === cat.key
                    ? "bg-white text-indigo-700 shadow"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {/* Scenario picker */}
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-indigo-300 text-xs self-center mr-1">Scenario:</span>
            {SCENARIO_LIST.map((sc) => {
              // Digital only makes sense for books_media
              if (sc.key === "digital" && template !== "books_media") return null;
              return (
                <button
                  key={sc.key}
                  onClick={() => setScenario(sc.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
                    scenario === sc.key
                      ? "bg-yellow-400 text-yellow-900 shadow"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Product detail (real component with mock data) ─────────────────── */}
      {product && <ProductDetailContent product={product} />}
    </div>
  );
}
