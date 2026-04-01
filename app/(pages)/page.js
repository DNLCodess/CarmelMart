// Server Component — no "use client" directive
// Interactive sections are extracted into focused client components

import HeroSection            from "@/components/shared/home/hero";
import CategoriesSection      from "@/components/shared/home/categories";
import FlashSaleSection       from "@/components/shared/home/FlashSaleSection";
import FeaturedProductsSection from "@/components/shared/home/FeaturedProductsSection";
import PromoBannersSection    from "@/components/shared/home/PromoBannersSection";
import NewArrivalsSection     from "@/components/shared/home/NewArrivalsSection";
import ShopByBrandSection    from "@/components/shared/home/ShopByBrandSection";
import TopVendorsSection      from "@/components/shared/home/TopVendorsSection";
import TrustStrip              from "@/components/shared/home/TrustStrip";
import HowItWorksSection      from "@/components/shared/home/HowItWorksSection";
import TestimonialsSection    from "@/components/shared/home/TestimonialsSection";
import CtaSection             from "@/components/shared/home/CtaSection";
import NewsletterSection      from "@/components/shared/home/NewsletterSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 1. Hero with auto-play carousel */}
      <HeroSection />

      {/* 1b. Trust strip — payment badges, returns, buyer protection */}
      <TrustStrip />

      {/* 2. Categories — horizontal scroll mobile, grid desktop */}
      <CategoriesSection />

      {/* 3. Flash Sale — countdown timer, up to 50% off */}
      <FlashSaleSection />

      {/* 4. Featured / Trending products */}
      <FeaturedProductsSection />

      {/* 5. Promotional banners — Electronics Week, Free Delivery, Buyer Protection */}
      <PromoBannersSection />

      {/* 6. New Arrivals */}
      <NewArrivalsSection />

      {/* 6b. Shop by Brand */}
      <ShopByBrandSection />

      {/* 7. Top verified vendors */}
      <TopVendorsSection />

      {/* 8. How It Works + trust strip */}
      <HowItWorksSection />

      {/* 9. Customer testimonials */}
      <TestimonialsSection />

      {/* 10. CTA banner */}
      <CtaSection />

      {/* 11. Newsletter */}
      <NewsletterSection />
    </div>
  );
}
