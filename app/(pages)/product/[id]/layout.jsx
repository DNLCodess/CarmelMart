import { createAdminClient } from "@/lib/supabase/admin";

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const admin = createAdminClient();
    const { data: product } = await admin
      .from("products")
      .select("name, description, images, price, sale_price, avg_rating, review_count")
      .eq("id", id)
      .single();

    if (!product) return { title: "Product Not Found | CarmelMart" };

    const image = Array.isArray(product.images) ? product.images[0] : null;
    const description = product.description?.slice(0, 155) ?? `Buy ${product.name} on CarmelMart — Nigeria's trusted multi-vendor marketplace.`;

    return {
      title: `${product.name} | CarmelMart`,
      description,
      openGraph: {
        title: product.name,
        description,
        images: image ? [{ url: image, width: 800, height: 800, alt: product.name }] : [],
        type: "website",
      },
    };
  } catch {
    return { title: "Product | CarmelMart" };
  }
}

async function getProductJsonLd(id) {
  try {
    const admin = createAdminClient();
    const { data: p } = await admin
      .from("products")
      .select(`
        name, description, images, price, sale_price, stock, avg_rating, review_count,
        categories ( name ),
        users!vendor_id ( vendors ( business_name ) )
      `)
      .eq("id", id)
      .single();

    if (!p) return null;

    const displayPrice = p.sale_price ?? p.price;

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: p.description ?? undefined,
      image: Array.isArray(p.images) ? p.images : [],
      brand: {
        "@type": "Brand",
        name: p.users?.vendors?.business_name ?? "CarmelMart Vendor",
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "NGN",
        price: displayPrice,
        availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: {
          "@type": "Organization",
          name: p.users?.vendors?.business_name ?? "CarmelMart Vendor",
        },
      },
      ...(p.avg_rating > 0 && p.review_count > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: p.avg_rating,
              reviewCount: p.review_count,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
    };
  } catch {
    return null;
  }
}

export default async function ProductLayout({ children, params }) {
  const { id } = await params;
  const jsonLd = await getProductJsonLd(id);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
