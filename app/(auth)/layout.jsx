import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";

import "../globals.css";

import Footer from "@/components/common/footer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "CarmelMart Auth - Nigeria's Trusted Marketplace",
  description:
    "Join Nigeria's leading multi-vendor e-commerce platform. Shop from verified vendors or grow your business.",
  keywords: "e-commerce, Nigeria, marketplace, vendors, shopping",
};

export default function AuthLayout({ children }) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased font-sans">
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
              iconTheme: {
                primary: "#22c55e",
                secondary: "#fff",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />

        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
