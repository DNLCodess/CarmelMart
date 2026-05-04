// Server Component — no "use client" directive
// Interactive sections are extracted into focused client components

import HeroSection from "@/components/shared/home/hero";
import CategoriesSection from "@/components/shared/home/categories";
import FlashSaleSection from "@/components/shared/home/FlashSaleSection";
import FeaturedProductsSection from "@/components/shared/home/FeaturedProductsSection";
import NewArrivalsSection from "@/components/shared/home/NewArrivalsSection";
import TopVendorsSection from "@/components/shared/home/TopVendorsSection";
import TrustStrip from "@/components/shared/home/TrustStrip";
import CtaSection from "@/components/shared/home/CtaSection";
import SectionErrorBoundary from "@/components/shared/home/SectionErrorBoundary";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <SectionErrorBoundary name="HeroSection">
        <HeroSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="TrustStrip">
        <TrustStrip />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="CategoriesSection">
        <CategoriesSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="FlashSaleSection">
        <FlashSaleSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="FeaturedProductsSection">
        <FeaturedProductsSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="NewArrivalsSection">
        <NewArrivalsSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="TopVendorsSection">
        <TopVendorsSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="CtaSection">
        <CtaSection />
      </SectionErrorBoundary>
    </div>
  );
}
