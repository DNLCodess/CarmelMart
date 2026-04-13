import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Providers from "./providers";
import InstallPrompt from "@/components/common/InstallPrompt";
import ServiceWorkerRegistration from "@/components/common/ServiceWorkerRegistration";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: {
    default: "CarmelMart — Nigeria's Trusted Marketplace",
    template: "%s | CarmelMart",
  },
  description:
    "Shop from verified Nigerian vendors or grow your business on CarmelMart — Nigeria's most trusted multi-vendor marketplace.",
  keywords: ["e-commerce", "Nigeria", "marketplace", "vendors", "online shopping", "Jumia alternative", "Konga alternative"],
  openGraph: {
    title: "CarmelMart — Nigeria's Trusted Marketplace",
    description: "Shop from verified Nigerian vendors or grow your business on CarmelMart.",
    type: "website",
    locale: "en_NG",
    siteName: "CarmelMart",
  },
  twitter: {
    card: "summary_large_image",
    title: "CarmelMart — Nigeria's Trusted Marketplace",
    description: "Shop from verified Nigerian vendors or grow your business on CarmelMart.",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "CarmelMart",
  description: "Nigeria's most trusted multi-vendor e-commerce marketplace.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://carmelmart.com",
  logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://carmelmart.com"}/logo-black.png`,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    areaServed: "NG",
    availableLanguage: "English",
  },
  sameAs: [],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.variable}`}>
      <head>
        {/* Preconnect to external origins for faster resource loading */}
        <link rel="preconnect" href="https://api.flutterwave.com" />
        <link rel="preconnect" href="https://checkout.flutterwave.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        {/* JSON-LD Organization schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script src="https://js.paystack.co/v1/inline.js" async></script>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#560238" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CarmelMart" />
      </head>
      <body className="antialiased font-sans">
        <Providers>
            <div role="status" aria-live="polite" aria-atomic="false">
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "#fff",
                    color: "#560238",
                    padding: "16px",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                  },
                  success: {
                    iconTheme: { primary: "#22c55e", secondary: "#fff" },
                  },
                  error: {
                    iconTheme: { primary: "#ef4444", secondary: "#fff" },
                  },
                }}
              />
            </div>
            {children}
            <InstallPrompt />
            <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
