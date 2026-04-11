const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Make NEXT_PUBLIC_APP_ENV available to client components.
  // Its value comes from .env.development or .env.production (loaded by Next.js
  // automatically based on NODE_ENV). .env.local can override it.
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "development",
  },
};

export default nextConfig;
