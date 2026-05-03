// Server Component — no "use client" directive
// Interactive sections are extracted into focused client components

import HeroSection from "@/components/shared/home/hero";

import SectionErrorBoundary from "@/components/shared/home/SectionErrorBoundary";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <SectionErrorBoundary name="HeroSection">
        <HeroSection />
      </SectionErrorBoundary>

      {/* <SectionErrorBoundary name="TrustStrip">
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
      </SectionErrorBoundary> */}

      {/* <SectionErrorBoundary name="PromoBannersSection">
        <PromoBannersSection />
      </SectionErrorBoundary> */}

      {/* <SectionErrorBoundary name="NewArrivalsSection">
        <NewArrivalsSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="ShopByBrandSection">
        <ShopByBrandSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="TopVendorsSection">
        <TopVendorsSection />
      </SectionErrorBoundary> */}
      {/* 
      <SectionErrorBoundary name="HowItWorksSection">
        <HowItWorksSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="TestimonialsSection">
        <TestimonialsSection />
      </SectionErrorBoundary> */}

      {/* <SectionErrorBoundary name="CtaSection">
        <CtaSection />
      </SectionErrorBoundary> */}
    </div>
  );
}
