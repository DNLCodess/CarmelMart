export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/vendor/dashboard/",
          "/my-account/",
          "/cart/",
          "/checkout/",
          "/api/",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://carmelmart.com"}/sitemap.xml`,
  };
}
