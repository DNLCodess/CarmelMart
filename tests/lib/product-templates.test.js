import { describe, it, expect } from "vitest";
import { TEMPLATES, getTemplate } from "@/lib/product-templates";

// ── Template registry ──────────────────────────────────────────────────────────

describe("TEMPLATES — registry", () => {
  const expectedSlugs = [
    "standard", "books_media", "fashion", "footwear", "accessories",
    "jewelry", "fabric", "electronics", "home_living", "consumables",
    "automotive", "sports", "toys", "video_games", "musical",
  ];

  it("exports all expected template slugs", () => {
    expectedSlugs.forEach((slug) => {
      expect(TEMPLATES).toHaveProperty(slug);
    });
  });

  it("every template has a label string", () => {
    Object.entries(TEMPLATES).forEach(([slug, tmpl]) => {
      expect(typeof tmpl.label, `${slug}.label`).toBe("string");
      expect(tmpl.label.length, `${slug}.label non-empty`).toBeGreaterThan(0);
    });
  });

  it("every template has a supportsVariants boolean", () => {
    Object.entries(TEMPLATES).forEach(([slug, tmpl]) => {
      expect(typeof tmpl.supportsVariants, `${slug}.supportsVariants`).toBe("boolean");
    });
  });

  it("every template has variantDimensions array", () => {
    Object.entries(TEMPLATES).forEach(([slug, tmpl]) => {
      expect(Array.isArray(tmpl.variantDimensions), `${slug}.variantDimensions`).toBe(true);
    });
  });

  it("every template has extraFields array", () => {
    Object.entries(TEMPLATES).forEach(([slug, tmpl]) => {
      expect(Array.isArray(tmpl.extraFields), `${slug}.extraFields`).toBe(true);
    });
  });

  it("templates that supportsVariants have at least one variantDimension", () => {
    Object.entries(TEMPLATES).forEach(([slug, tmpl]) => {
      if (tmpl.supportsVariants) {
        expect(
          tmpl.variantDimensions.length,
          `${slug} supportsVariants but has no variantDimensions`
        ).toBeGreaterThan(0);
      }
    });
  });

  it("templates that do not support variants have empty variantDimensions", () => {
    Object.entries(TEMPLATES).forEach(([slug, tmpl]) => {
      if (!tmpl.supportsVariants) {
        expect(tmpl.variantDimensions.length, `${slug}`).toBe(0);
      }
    });
  });

  it("every variantDimension has key, label, and non-empty options array", () => {
    Object.entries(TEMPLATES).forEach(([slug, tmpl]) => {
      tmpl.variantDimensions.forEach((dim, idx) => {
        expect(typeof dim.key,   `${slug}.variantDimensions[${idx}].key`).toBe("string");
        expect(typeof dim.label, `${slug}.variantDimensions[${idx}].label`).toBe("string");
        expect(Array.isArray(dim.options), `${slug}.variantDimensions[${idx}].options`).toBe(true);
        expect(dim.options.length, `${slug}.variantDimensions[${idx}].options non-empty`).toBeGreaterThan(0);
      });
    });
  });

  it("every extraField has key, label, and a valid type", () => {
    const VALID_TYPES = ["text", "number", "select", "multicheck"];
    Object.entries(TEMPLATES).forEach(([slug, tmpl]) => {
      tmpl.extraFields.forEach((field, idx) => {
        expect(typeof field.key,   `${slug}.extraFields[${idx}].key`).toBe("string");
        expect(typeof field.label, `${slug}.extraFields[${idx}].label`).toBe("string");
        expect(VALID_TYPES, `${slug}.extraFields[${idx}].type`).toContain(field.type);
      });
    });
  });

  it("select and multicheck fields have options array", () => {
    Object.entries(TEMPLATES).forEach(([slug, tmpl]) => {
      tmpl.extraFields.forEach((field, idx) => {
        if (field.type === "select" || field.type === "multicheck") {
          expect(Array.isArray(field.options), `${slug}.extraFields[${idx}].options`).toBe(true);
          expect(field.options.length, `${slug}.extraFields[${idx}].options non-empty`).toBeGreaterThan(0);
        }
      });
    });
  });
});

// ── Fashion template ───────────────────────────────────────────────────────────

describe("TEMPLATES.fashion", () => {
  const tmpl = TEMPLATES.fashion;

  it("supports variants", () => expect(tmpl.supportsVariants).toBe(true));

  it("has color and size variant dimensions", () => {
    const keys = tmpl.variantDimensions.map((d) => d.key);
    expect(keys).toContain("color");
    expect(keys).toContain("size");
  });

  it("color options include common colours", () => {
    const colorDim = tmpl.variantDimensions.find((d) => d.key === "color");
    expect(colorDim.options).toContain("Black");
    expect(colorDim.options).toContain("White");
  });

  it("size options include standard clothing sizes", () => {
    const sizeDim = tmpl.variantDimensions.find((d) => d.key === "size");
    expect(sizeDim.options).toContain("S");
    expect(sizeDim.options).toContain("L");
    expect(sizeDim.options).toContain("XL");
  });
});

// ── Fabric template ────────────────────────────────────────────────────────────

describe("TEMPLATES.fabric", () => {
  const tmpl = TEMPLATES.fabric;

  it("supports variants", () => expect(tmpl.supportsVariants).toBe(true));

  it("has a color variant dimension", () => {
    const keys = tmpl.variantDimensions.map((d) => d.key);
    expect(keys).toContain("color");
  });

  it("has a unit_type select field with per_yard and per_trouser options", () => {
    const field = tmpl.extraFields.find((f) => f.key === "unit_type");
    expect(field).toBeDefined();
    expect(field.type).toBe("select");
    expect(field.options).toContain("per_yard");
    expect(field.options).toContain("per_trouser");
  });

  it("unit_type field has matching displayOptions", () => {
    const field = tmpl.extraFields.find((f) => f.key === "unit_type");
    expect(field.displayOptions).toBeDefined();
    expect(field.displayOptions.length).toBe(field.options.length);
  });
});

// ── Electronics template ───────────────────────────────────────────────────────

describe("TEMPLATES.electronics", () => {
  const tmpl = TEMPLATES.electronics;

  it("supports variants", () => expect(tmpl.supportsVariants).toBe(true));

  it("has a brand extra field", () => {
    const field = tmpl.extraFields.find((f) => f.key === "brand");
    expect(field).toBeDefined();
  });
});

// ── Standard template ──────────────────────────────────────────────────────────

describe("TEMPLATES.standard", () => {
  const tmpl = TEMPLATES.standard;
  it("does not support variants", () => expect(tmpl.supportsVariants).toBe(false));
  it("has no variantDimensions", () => expect(tmpl.variantDimensions).toHaveLength(0));
});

// ── books_media template ───────────────────────────────────────────────────────

describe("TEMPLATES.books_media", () => {
  const tmpl = TEMPLATES.books_media;
  it("does not support variants", () => expect(tmpl.supportsVariants).toBe(false));
  it("has empty extraFields (handled by dedicated books section)", () => {
    expect(tmpl.extraFields).toHaveLength(0);
  });
});

// ── getTemplate ────────────────────────────────────────────────────────────────

describe("getTemplate()", () => {
  it("returns correct template for a valid slug", () => {
    const t = getTemplate("fashion");
    expect(t).toBe(TEMPLATES.fashion);
  });

  it("returns standard template when slug is unknown", () => {
    const t = getTemplate("totally_unknown_slug");
    expect(t).toBe(TEMPLATES.standard);
  });

  it("returns standard template when slug is null", () => {
    const t = getTemplate(null);
    expect(t).toBe(TEMPLATES.standard);
  });

  it("returns standard template when slug is undefined", () => {
    const t = getTemplate(undefined);
    expect(t).toBe(TEMPLATES.standard);
  });

  it("returns standard template when no argument is passed", () => {
    const t = getTemplate();
    expect(t).toBe(TEMPLATES.standard);
  });

  it("returns fabric template for 'fabric'", () => {
    expect(getTemplate("fabric")).toBe(TEMPLATES.fabric);
  });

  it("returns electronics template for 'electronics'", () => {
    expect(getTemplate("electronics")).toBe(TEMPLATES.electronics);
  });
});
