"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Search, ShieldCheck, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const FALLBACK_HERO = {
  image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80",
  title: "Shop verified Nigerian vendors",
  description:
    "Find fashion, phones, home essentials, beauty products, and more from sellers checked for trust and delivery readiness.",
  ctaLabel: "Shop now",
  ctaHref: "/shop",
};

const QUICK_LINKS = [
  { label: "Fashion", href: "/shop?category=fashion" },
  { label: "Electronics", href: "/shop?category=electronics" },
  { label: "Home & Living", href: "/shop?category=home-living" },
  { label: "Beauty", href: "/shop?category=beauty" },
];

const TRUST_POINTS = [
  { icon: BadgeCheck, label: "Verified sellers" },
  { icon: ShieldCheck, label: "Buyer protection" },
  { icon: Truck, label: "Nationwide delivery" },
];

export default function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { data: bannerData } = useQuery({
    queryKey: ["hero-banners"],
    queryFn: () => fetch("/api/banners").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const hero = useMemo(() => {
    const banner = bannerData?.banners?.[0];
    if (!banner) return FALLBACK_HERO;
    return {
      image: banner.image_url || FALLBACK_HERO.image,
      title: banner.title || FALLBACK_HERO.title,
      description: banner.description || banner.subtitle || FALLBACK_HERO.description,
      ctaLabel: banner.cta_label || FALLBACK_HERO.ctaLabel,
      ctaHref: banner.cta_href || FALLBACK_HERO.ctaHref,
    };
  }, [bannerData]);

  const handleSearch = (event) => {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-24 bg-gray-50" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid lg:grid-cols-[1.02fr_0.98fr] gap-8 lg:gap-12 items-center">
          <div className="py-6 lg:py-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-2 text-sm font-semibold text-primary mb-5">
              <Store className="w-4 h-4" />
              CarmelMart marketplace
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-normal text-gray-950 leading-tight max-w-3xl">
              {hero.title}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl">
              {hero.description}
            </p>

            <form
              onSubmit={handleSearch}
              className="mt-7 flex flex-col sm:flex-row gap-3 max-w-2xl"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  type="search"
                  placeholder="Search products, brands, or vendors"
                  className="w-full h-13 rounded-xl border border-gray-200 bg-white pl-12 pr-4 text-sm text-gray-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <button
                type="submit"
                className="h-13 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-dark transition-colors"
              >
                Search
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-2xl">
              {TRUST_POINTS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                  <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[340px] lg:min-h-[520px]">
            <div className="relative h-[340px] sm:h-[420px] lg:h-[520px] overflow-hidden rounded-2xl bg-gray-100 border border-gray-100">
              <Image
                src={hero.image}
                alt={hero.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/45 via-black/5 to-transparent" />
              <div className="absolute left-5 right-5 bottom-5 rounded-xl bg-white/94 p-4 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Ready to shop</p>
                    <p className="mt-1 font-bold text-gray-950">Thousands of products from checked sellers</p>
                  </div>
                  <Link
                    href={hero.ctaHref}
                    className="shrink-0 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary transition-colors"
                  >
                    {hero.ctaLabel}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
