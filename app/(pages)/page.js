// Server Component — no "use client" directive
// Interactive sections are extracted into focused client components

import HeroSection from "@/components/shared/home/hero";
import CategoriesSection from "@/components/shared/home/categories";
import FlashSaleSection from "@/components/shared/home/FlashSaleSection";
import FeaturedProductsSection from "@/components/shared/home/FeaturedProductsSection";
import PromoBannersSection from "@/components/shared/home/PromoBannersSection";
import DailyDealsSection from "@/components/shared/home/DailyDealsSection";
import NewArrivalsSection from "@/components/shared/home/NewArrivalsSection";
import ShopByBrandSection from "@/components/shared/home/ShopByBrandSection";
import LiveActivityTicker from "@/components/shared/home/LiveActivityTicker";
import TopVendorsSection from "@/components/shared/home/TopVendorsSection";
import TrustStrip from "@/components/shared/home/TrustStrip";
import HowItWorksSection from "@/components/shared/home/HowItWorksSection";
import TestimonialsSection from "@/components/shared/home/TestimonialsSection";
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

      <SectionErrorBoundary name="DailyDealsSection">
        <DailyDealsSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="FeaturedProductsSection">
        <FeaturedProductsSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="LiveActivityTicker">
        <LiveActivityTicker />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="PromoBannersSection">
        <PromoBannersSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="NewArrivalsSection">
        <NewArrivalsSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="ShopByBrandSection">
        <ShopByBrandSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="TopVendorsSection">
        <TopVendorsSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="HowItWorksSection">
        <HowItWorksSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="TestimonialsSection">
        <TestimonialsSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="CtaSection">
        <CtaSection />
      </SectionErrorBoundary>
    </div>
  );
}
