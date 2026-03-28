// Server Component — no "use client" directive
// Interactive sections are extracted into focused client components

import HeroSection             from "@/components/shared/home/hero";
import CategoriesSection       from "@/components/shared/home/categories";
import FeaturedProductsSection from "@/components/shared/home/FeaturedProductsSection";
import TopVendorsSection       from "@/components/shared/home/TopVendorsSection";
import CtaSection              from "@/components/shared/home/CtaSection";
import NewsletterSection       from "@/components/shared/home/NewsletterSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <CategoriesSection />
      <FeaturedProductsSection />
      <TopVendorsSection />
      <CtaSection />
      <NewsletterSection />
    </div>
  );
}
