/**
 * Category template definitions.
 * Each template drives: extra product fields, available variant dimensions, and size/color options.
 * Used in: vendor product forms, product detail page, admin product forms.
 */

export const TEMPLATES = {
  standard: {
    label: "General Product",
    supportsVariants: false,
    variantDimensions: [],
    extraFields: [],
  },

  books_media: {
    label: "Books & Media",
    supportsVariants: false,
    variantDimensions: [],
    extraFields: [], // handled by the dedicated Books & Media section
  },

  fashion: {
    label: "Clothing & Fashion",
    supportsVariants: true,
    variantDimensions: [
      {
        key: "color",
        label: "Color",
        options: [
          "Black","White","Red","Blue","Green","Yellow","Brown","Gray",
          "Pink","Purple","Navy","Maroon","Beige","Orange","Cream","Sky Blue",
          "Olive","Burgundy","Teal","Coral","Gold","Silver","Multicolor",
        ],
      },
      {
        key: "size",
        label: "Size",
        options: ["XS","S","M","L","XL","XXL","XXXL","4XL","5XL","Free Size"],
      },
    ],
    extraFields: [
      { key: "material", label: "Material / Fabric", type: "text", placeholder: "e.g. 100% Cotton, Polyester blend" },
      { key: "care", label: "Care Instructions", type: "text", placeholder: "e.g. Machine wash cold, do not bleach" },
      { key: "style", label: "Style / Occasion", type: "text", placeholder: "e.g. Casual, Formal, Traditional, Party wear" },
    ],
  },

  footwear: {
    label: "Shoes & Footwear",
    supportsVariants: true,
    variantDimensions: [
      {
        key: "size",
        label: "Size (EU)",
        options: ["35","36","37","38","39","40","41","42","43","44","45","46","47","48"],
      },
      {
        key: "color",
        label: "Color",
        options: [
          "Black","White","Brown","Tan","Navy","Red","Gray","Beige",
          "Gold","Silver","Nude","Burgundy","Camel","Multicolor",
        ],
      },
    ],
    extraFields: [
      { key: "material", label: "Material / Upper", type: "text", placeholder: "e.g. Genuine Leather, Suede, Canvas" },
      { key: "sole", label: "Sole Type", type: "text", placeholder: "e.g. Rubber sole, Crepe sole" },
      { key: "closure", label: "Closure Type", type: "text", placeholder: "e.g. Lace-up, Slip-on, Buckle" },
    ],
  },

  accessories: {
    label: "Accessories (Bags, Belts, Hats)",
    supportsVariants: true,
    variantDimensions: [
      {
        key: "color",
        label: "Color",
        options: [
          "Black","Brown","Tan","White","Red","Navy","Gray","Beige",
          "Camel","Burgundy","Gold","Silver","Green","Multicolor",
        ],
      },
    ],
    extraFields: [
      { key: "material", label: "Material", type: "text", placeholder: "e.g. Genuine Leather, Canvas, Synthetic, Straw" },
      { key: "dimensions", label: "Size / Dimensions", type: "text", placeholder: "e.g. 30cm x 20cm x 10cm, One Size" },
      { key: "closure", label: "Closure", type: "text", placeholder: "e.g. Zip, Magnetic snap, Buckle" },
    ],
  },

  jewelry: {
    label: "Jewelry & Luxury",
    supportsVariants: false,
    variantDimensions: [],
    extraFields: [
      { key: "material", label: "Metal / Material", type: "text", placeholder: "e.g. 18k Gold, Sterling Silver, Platinum, Stainless Steel" },
      { key: "stone", label: "Gemstone / Stone", type: "text", placeholder: "e.g. Diamond, Ruby, Cubic Zirconia, No Stone" },
      { key: "ring_size", label: "Size (if applicable)", type: "text", placeholder: "e.g. Size 7, UK N, Adjustable" },
      { key: "care", label: "Care Instructions", type: "text", placeholder: "e.g. Keep away from water and chemicals" },
    ],
  },

  fabric: {
    label: "Fabric & Textile",
    supportsVariants: true,
    variantDimensions: [
      {
        key: "color",
        label: "Color / Design",
        options: [
          "White","Black","Red","Blue","Green","Yellow","Brown","Gray",
          "Ankara Print","Lace","Adire / Tie-dye","Aso-oke","George",
          "Kente","Plain","Striped","Floral","Checked","Dotted","Embroidered","Multicolor",
        ],
      },
    ],
    extraFields: [
      {
        key: "unit_type",
        label: "How is this fabric sold?",
        type: "select",
        options: ["per_yard", "per_trouser"],
        displayOptions: ["Per Yard", "Per Trouser Length"],
        required: true,
      },
      { key: "min_order", label: "Minimum Order (yards / pieces)", type: "number", placeholder: "e.g. 2" },
      { key: "fabric_type", label: "Fabric Type", type: "text", placeholder: "e.g. Ankara, George, Lace, Aso-oke, Cotton, Chiffon" },
      { key: "width", label: "Fabric Width", type: "text", placeholder: "e.g. 45 inches, 60 inches" },
    ],
  },

  electronics: {
    label: "Electronics & Gadgets",
    supportsVariants: true,
    variantDimensions: [
      {
        key: "storage",
        label: "Storage",
        options: ["16GB","32GB","64GB","128GB","256GB","512GB","1TB","2TB"],
      },
      {
        key: "color",
        label: "Color",
        options: ["Black","White","Silver","Gold","Blue","Space Gray","Rose Gold","Green","Purple"],
      },
    ],
    extraFields: [
      { key: "brand", label: "Brand", type: "text", placeholder: "e.g. Samsung, Apple, Tecno, Xiaomi" },
      { key: "model", label: "Model / SKU", type: "text", placeholder: "e.g. Galaxy S24 Ultra, iPhone 15 Pro" },
      { key: "warranty", label: "Warranty", type: "text", placeholder: "e.g. 1 Year Manufacturer Warranty" },
      {
        key: "ram",
        label: "RAM Options",
        type: "multicheck",
        options: ["2GB","3GB","4GB","6GB","8GB","12GB","16GB","32GB","64GB"],
      },
    ],
  },

  home_living: {
    label: "Home & Living",
    supportsVariants: false,
    variantDimensions: [],
    extraFields: [
      { key: "material", label: "Material", type: "text", placeholder: "e.g. Solid Oak, MDF, Stainless Steel, Ceramic" },
      { key: "color", label: "Color / Finish", type: "text", placeholder: "e.g. Walnut Brown, Matte Black, Off-white" },
      { key: "dimensions", label: "Dimensions", type: "text", placeholder: "e.g. 120cm L x 60cm W x 75cm H" },
      { key: "weight", label: "Weight", type: "text", placeholder: "e.g. 15kg" },
      {
        key: "assembly",
        label: "Assembly Required?",
        type: "select",
        options: ["no", "yes"],
        displayOptions: ["No — ready to use", "Yes — some assembly needed"],
      },
    ],
  },

  consumables: {
    label: "Food & Consumables",
    supportsVariants: false,
    variantDimensions: [],
    extraFields: [
      { key: "weight", label: "Weight / Volume per Pack", type: "text", placeholder: "e.g. 500g, 1kg, 1L, 750ml" },
      { key: "expiry_info", label: "Shelf Life / Best Before", type: "text", placeholder: "e.g. 12 months from manufacture" },
      { key: "ingredients", label: "Key Ingredients / Contents", type: "text", placeholder: "e.g. Rice, Wheat, Vegetable Oil…" },
      { key: "storage_info", label: "Storage Instructions", type: "text", placeholder: "e.g. Store in a cool, dry place" },
      { key: "certification", label: "Certification / Approval", type: "text", placeholder: "e.g. NAFDAC approved, Halal certified" },
    ],
  },

  automotive: {
    label: "Automotive & Tools",
    supportsVariants: false,
    variantDimensions: [],
    extraFields: [
      { key: "brand", label: "Brand", type: "text", placeholder: "e.g. Bosch, Toyota, Denso, NGK" },
      { key: "compatible_models", label: "Works With (Car Models)", type: "text", placeholder: "e.g. Toyota Camry 2015-2022, Honda Accord" },
      { key: "part_number", label: "Part Number / OEM Code", type: "text", placeholder: "e.g. 12345-67890" },
      { key: "warranty", label: "Warranty", type: "text", placeholder: "e.g. 6 months, 1 year" },
    ],
  },

  sports: {
    label: "Sports & Fitness",
    supportsVariants: true,
    variantDimensions: [
      {
        key: "size",
        label: "Size",
        options: ["XS","S","M","L","XL","XXL","XXXL","36","37","38","39","40","41","42","43","44","45","One Size"],
      },
      {
        key: "color",
        label: "Color",
        options: ["Black","White","Red","Blue","Green","Gray","Navy","Orange","Yellow","Pink","Purple","Multicolor"],
      },
    ],
    extraFields: [
      { key: "brand", label: "Brand", type: "text", placeholder: "e.g. Nike, Adidas, Puma, Under Armour" },
      { key: "material", label: "Material", type: "text", placeholder: "e.g. Nylon, Polyester, Rubber, Foam" },
    ],
  },

  toys: {
    label: "Toys & Children's Products",
    supportsVariants: false,
    variantDimensions: [],
    extraFields: [
      { key: "age_range", label: "Recommended Age Range", type: "text", placeholder: "e.g. 3–8 years, 12+ months" },
      { key: "material", label: "Material", type: "text", placeholder: "e.g. Plastic, Wood, Fabric, Foam" },
      { key: "batteries", label: "Batteries Needed?", type: "text", placeholder: "e.g. 2 × AA batteries (not included), No batteries needed" },
      { key: "brand", label: "Brand", type: "text", placeholder: "e.g. LEGO, Mattel, Fisher-Price" },
    ],
  },

  video_games: {
    label: "Video Games",
    supportsVariants: false,
    variantDimensions: [],
    extraFields: [
      {
        key: "platform",
        label: "Platform(s)",
        type: "multicheck",
        options: ["PS5","PS4","Xbox Series X/S","Xbox One","Nintendo Switch","PC / Steam","Mobile (iOS/Android)"],
      },
      { key: "genre", label: "Genre", type: "text", placeholder: "e.g. Action, RPG, Sports, Shooter, Puzzle" },
      { key: "publisher", label: "Publisher / Developer", type: "text", placeholder: "e.g. Activision, EA Sports, Ubisoft" },
      { key: "age_rating", label: "Age Rating", type: "text", placeholder: "e.g. PEGI 18, PEGI 3, Everyone" },
    ],
  },

  musical: {
    label: "Musical Instruments",
    supportsVariants: false,
    variantDimensions: [],
    extraFields: [
      { key: "brand", label: "Brand", type: "text", placeholder: "e.g. Yamaha, Gibson, Roland, Casio" },
      { key: "instrument_type", label: "Instrument Type", type: "text", placeholder: "e.g. Acoustic Guitar, Digital Piano, Drum Kit" },
      { key: "skill_level", label: "Best For", type: "text", placeholder: "e.g. Beginners, Intermediate players, Professionals" },
      { key: "warranty", label: "Warranty", type: "text", placeholder: "e.g. 1 Year" },
    ],
  },
};

/** Returns the template config for a given template slug, falling back to 'standard'. */
export function getTemplate(templateSlug) {
  return TEMPLATES[templateSlug] ?? TEMPLATES.standard;
}

/** Flat ordered list of all templates for use in admin/vendor UIs. */
export const TEMPLATE_OPTIONS = [
  { value: "standard",    label: "General Product",               supportsVariants: false },
  { value: "fashion",     label: "Clothing & Fashion",            supportsVariants: true  },
  { value: "footwear",    label: "Shoes & Footwear",              supportsVariants: true  },
  { value: "accessories", label: "Accessories (Bags, Belts, Hats)", supportsVariants: true },
  { value: "fabric",      label: "Fabric & Textile",              supportsVariants: true  },
  { value: "electronics", label: "Electronics & Gadgets",         supportsVariants: true  },
  { value: "sports",      label: "Sports & Fitness",              supportsVariants: true  },
  { value: "jewelry",     label: "Jewelry & Luxury",              supportsVariants: false },
  { value: "home_living", label: "Home & Living",                 supportsVariants: false },
  { value: "consumables", label: "Food & Consumables",            supportsVariants: false },
  { value: "automotive",  label: "Automotive & Tools",            supportsVariants: false },
  { value: "toys",        label: "Toys & Children's Products",    supportsVariants: false },
  { value: "video_games", label: "Video Games",                   supportsVariants: false },
  { value: "musical",     label: "Musical Instruments",           supportsVariants: false },
  { value: "books_media", label: "Books & Media",                 supportsVariants: false },
];

/** Returns true if the given template supports real per-variant stock tracking. */
export function templateSupportsVariants(templateSlug) {
  return !!(TEMPLATES[templateSlug]?.supportsVariants);
}
