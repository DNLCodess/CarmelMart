import Link from "next/link";
import { SearchX, Home, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Page Not Found — CarmelMart",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 graphic */}
        <div className="relative mb-8">
          <p className="text-[8rem] font-black text-gray-100 leading-none select-none">404</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <SearchX className="w-10 h-10 text-primary" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          We couldn&apos;t find the page you were looking for. It may have been moved,
          deleted, or you may have mistyped the URL.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            href="/shop"
            className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}
