import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export async function generateMetadata({ searchParams }) {
  const q = (await searchParams)?.q;
  return {
    title: q ? `"${q}" — Search Results | CarmelMart` : "Search Products | CarmelMart",
    description: q
      ? `Find the best deals for "${q}" on CarmelMart — Nigeria's trusted multi-vendor marketplace.`
      : "Search millions of products from verified Nigerian vendors on CarmelMart.",
  };
}

function SearchFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  );
}

export default function SearchLayout({ children }) {
  return <Suspense fallback={<SearchFallback />}>{children}</Suspense>;
}
