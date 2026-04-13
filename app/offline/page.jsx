import Link from "next/link";

export const metadata = {
  title: "You're Offline",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 17.657a9 9 0 010-12.728M9.172 14.828a5 5 0 010-7.072M12 12h.01"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re Offline</h1>
      <p className="text-gray-500 text-sm max-w-xs mb-8">
        No internet connection. Check your network and try again — your cart is
        saved and will be ready when you&apos;re back online.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="bg-primary text-white font-semibold px-8 py-3 rounded-full hover:opacity-90 transition-opacity mb-4"
      >
        Try Again
      </button>

      <Link href="/" className="text-sm text-primary font-medium hover:underline">
        Go to Homepage
      </Link>
    </div>
  );
}
