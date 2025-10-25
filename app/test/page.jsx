"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, X, AlertCircle, RefreshCw } from "lucide-react";

export default function ImageTestPage() {
  const [imageStates, setImageStates] = useState({});

  const testImages = [
    {
      id: "fashion",
      name: "Fashion",
      url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
      directUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b",
    },
    {
      id: "electronics",
      name: "Electronics",
      url: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80",
      directUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661",
    },
    {
      id: "home",
      name: "Home & Living",
      url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
      directUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace",
    },
    {
      id: "beauty",
      name: "Beauty",
      url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
      directUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348",
    },
    {
      id: "sports",
      name: "Sports",
      url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
      directUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211",
    },
    {
      id: "books",
      name: "Books",
      url: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=800&q=80",
      directUrl: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d",
    },
  ];

  const handleImageLoad = (id) => {
    setImageStates((prev) => ({ ...prev, [id]: "loaded" }));
  };

  const handleImageError = (id) => {
    setImageStates((prev) => ({ ...prev, [id]: "error" }));
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary-light to-accent bg-clip-text text-transparent">
            Unsplash Image Test Page
          </h1>
          <p className="text-xl text-gray-600">
            Testing image rendering from Unsplash CDN
          </p>
        </div>

        {/* Status Overview */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Loading Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {testImages.map((img) => (
              <div
                key={img.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
              >
                {imageStates[img.id] === "loaded" ? (
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : imageStates[img.id] === "error" ? (
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {img.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {imageStates[img.id] || "Loading..."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test 1: Next.js Image Component (Recommended) */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-linear-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white font-bold">
              1
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Next.js Image Component (Optimized)
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {testImages.map((img) => (
              <div key={img.id} className="space-y-2">
                <div className="relative h-48 rounded-xl overflow-hidden shadow-md ring-1 ring-gray-200 bg-gray-100">
                  <Image
                    src={img.directUrl}
                    alt={img.name}
                    fill
                    className="object-cover"
                    onLoad={() => handleImageLoad(img.id)}
                    onError={() => handleImageError(img.id)}
                  />
                </div>
                <p className="text-sm font-medium text-gray-700 text-center">
                  {img.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Test 2: Regular img tag (Fallback) */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-linear-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center text-white font-bold">
              2
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Regular img Tag (Fallback Test)
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {testImages.slice(0, 3).map((img) => (
              <div key={`regular-${img.id}`} className="space-y-2">
                <div className="relative h-64 rounded-xl overflow-hidden shadow-md ring-1 ring-gray-200 bg-gray-100">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm font-medium text-gray-700 text-center">
                  {img.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Test 3: Different Size Parameters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-linear-to-br from-primary-light to-primary rounded-lg flex items-center justify-center text-white font-bold">
              3
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Different Size Parameters
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {/* Small */}
            <div className="space-y-2">
              <div className="relative h-48 rounded-xl overflow-hidden shadow-md ring-1 ring-gray-200">
                <Image
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=80"
                  alt="Small (400px)"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-sm font-medium text-gray-700 text-center">
                Small (w=400)
              </p>
            </div>

            {/* Medium */}
            <div className="space-y-2">
              <div className="relative h-48 rounded-xl overflow-hidden shadow-md ring-1 ring-gray-200">
                <Image
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80"
                  alt="Medium (800px)"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-sm font-medium text-gray-700 text-center">
                Medium (w=800)
              </p>
            </div>

            {/* Large */}
            <div className="space-y-2">
              <div className="relative h-48 rounded-xl overflow-hidden shadow-md ring-1 ring-gray-200">
                <Image
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80"
                  alt="Large (1200px)"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-sm font-medium text-gray-700 text-center">
                Large (w=1200)
              </p>
            </div>
          </div>
        </div>

        {/* Test 4: With Category Card Styling */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-linear-to-br from-accent-dark to-primary rounded-lg flex items-center justify-center text-white font-bold">
              4
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Actual Category Card Styling
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {testImages.map((img) => (
              <div key={`styled-${img.id}`} className="group cursor-pointer">
                <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 ring-1 ring-gray-200 hover:ring-2 hover:ring-primary/50">
                  {/* Image */}
                  <Image
                    src={img.url}
                    alt={img.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />

                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                    <h3 className="text-lg font-bold mb-1 drop-shadow-lg">
                      {img.name}
                    </h3>
                    <p className="text-sm opacity-95 drop-shadow-md">
                      2,450 Items
                    </p>
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Debug Information */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900">
              Debug Information
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Image URLs Being Tested:
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-xs">
                {testImages.map((img) => (
                  <div key={`debug-${img.id}`} className="space-y-1">
                    <p className="text-gray-900 font-semibold">{img.name}:</p>
                    <p className="text-gray-600 break-all pl-4">{img.url}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Next.js Image Configuration:
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                <p className="text-gray-700">
                  Add to <span className="text-primary">next.config.js</span>:
                </p>
                <pre className="mt-2 text-xs text-gray-600">
                  {`module.exports = {
  images: {
    domains: ['images.unsplash.com'],
    // or use remotePatterns (Next.js 13+):
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Troubleshooting Steps:
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>
                    Check if all images above have loaded successfully (green
                    checkmarks)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>
                    If images show red X, check your network connection and
                    Unsplash service status
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>
                    If using Next.js Image component, verify next.config.js has
                    proper image domain configuration
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  <span>
                    Check browser console (F12) for any error messages
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">5.</span>
                  <span>
                    Try opening image URLs directly in browser to verify
                    accessibility
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Common Issues & Solutions:
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="font-semibold text-red-900 mb-1">
                    ❌ Issue: "hostname not configured"
                  </p>
                  <p className="text-red-700">
                    Solution: Add 'images.unsplash.com' to next.config.js
                    domains or remotePatterns
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="font-semibold text-yellow-900 mb-1">
                    ⚠️ Issue: Images load slowly
                  </p>
                  <p className="text-yellow-700">
                    Solution: This is normal for first load. Unsplash CDN will
                    cache images. Consider using priority prop for above-fold
                    images.
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-semibold text-blue-900 mb-1">
                    ℹ️ Issue: Images not showing in production
                  </p>
                  <p className="text-blue-700">
                    Solution: Verify next.config.js is deployed correctly and
                    rebuild your application.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Links */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Direct Image Links
          </h2>
          <p className="text-gray-600 mb-4">
            Click these links to open images directly in your browser:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {testImages.map((img) => (
              <a
                key={`link-${img.id}`}
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-primary/5 transition-colors group"
              >
                <div className="w-10 h-10 rounded bg-gray-200 flex-shrink-0 overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{img.name}</p>
                  <p className="text-xs text-gray-500 truncate">{img.url}</p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-8 text-white text-center">
          <Check className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">All Tests Complete!</h2>
          <p className="text-lg opacity-90">
            If all images above loaded successfully, your Unsplash integration
            is working perfectly.
          </p>
        </div>
      </div>
    </div>
  );
}
