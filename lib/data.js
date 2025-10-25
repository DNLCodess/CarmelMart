export const categories = [
  {
    name: "Fashion & Style",
    image:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80",
    count: "2,450+",
    gradient: "from-pink-600/90 to-purple-600/90",
  },
  {
    name: "Electronics",
    image:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
    count: "1,820+",
    gradient: "from-blue-600/90 to-cyan-600/90",
  },
  {
    name: "Home & Living",
    image:
      "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&q=80",
    count: "3,120+",
    gradient: "from-green-600/90 to-emerald-600/90",
  },
  {
    name: "Beauty & Care",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
    count: "980+",
    gradient: "from-rose-600/90 to-pink-600/90",
  },
  {
    name: "Sports & Fitness",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    count: "560+",
    gradient: "from-orange-600/90 to-red-600/90",
  },
  {
    name: "Books & Media",
    image:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80",
    count: "1,240+",
    gradient: "from-indigo-600/90 to-purple-600/90",
  },
];

export const featuredProducts = [
  {
    id: 1,
    name: "Premium Noise-Cancelling Headphones",
    price: 45000,
    originalPrice: 65000,
    vendor: "TechHub Nigeria",
    rating: 4.8,
    reviews: 124,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    badge: "30% OFF",
    location: "Lagos",
  },
  {
    id: 2,
    name: "Elegant African Print Dress",
    price: 18500,
    vendor: "Afrique Styles",
    rating: 4.9,
    reviews: 89,
    image:
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80",
    badge: "Trending",
    location: "Abuja",
  },
  {
    id: 3,
    name: "Smart Fitness Tracker Watch",
    price: 32000,
    originalPrice: 45000,
    vendor: "FitGear Store",
    rating: 4.7,
    reviews: 203,
    image:
      "https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?w=600&q=80",
    badge: "Best Seller",
    location: "Port Harcourt",
  },
  {
    id: 4,
    name: "Organic Skincare Collection",
    price: 25000,
    vendor: "Beauty Haven",
    rating: 5.0,
    reviews: 156,
    image:
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80",
    badge: "New",
    location: "Ibadan",
  },
  {
    id: 5,
    name: "Professional DSLR Camera",
    price: 125000,
    originalPrice: 180000,
    vendor: "Photo Pro NG",
    rating: 4.9,
    reviews: 67,
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80",
    badge: "Sale",
    location: "Lagos",
  },
  {
    id: 6,
    name: "Modern Office Chair",
    price: 48000,
    vendor: "Home & Office",
    rating: 4.6,
    reviews: 145,
    image:
      "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600&q=80",
    location: "Abuja",
  },
  {
    id: 7,
    name: "Gaming Laptop Pro",
    price: 285000,
    originalPrice: 350000,
    vendor: "TechZone Nigeria",
    rating: 4.8,
    reviews: 92,
    image:
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80",
    badge: "Hot",
    location: "Lagos",
  },
  {
    id: 8,
    name: "Luxury Leather Handbag",
    price: 35000,
    vendor: "Luxury Collections",
    rating: 4.7,
    reviews: 78,
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80",
    location: "Port Harcourt",
  },
];

export const topVendors = [
  {
    name: "Fashion Hub NG",
    description: "Premium African fashion & accessories",
    products: 245,
    rating: 4.9,
    sales: "5.2K",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80",
    verified: true,
  },
  {
    name: "TechZone Nigeria",
    description: "Latest gadgets & electronics",
    products: 189,
    rating: 4.8,
    sales: "3.8K",
    image:
      "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=600&q=80",
    verified: true,
  },
  {
    name: "Home Essentials",
    description: "Quality furniture & home decor",
    products: 312,
    rating: 4.9,
    sales: "7.1K",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
    verified: true,
  },
  {
    name: "Beauty Palace",
    description: "Authentic beauty & skincare",
    products: 156,
    rating: 5.0,
    sales: "4.5K",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80",
    verified: true,
  },
];

export const footerLinks = {
  shop: [
    { name: "All Products", href: "/products" },
    { name: "Categories", href: "/categories" },
    { name: "Today's Deals", href: "/deals" },
    { name: "New Arrivals", href: "/new" },
    { name: "Best Sellers", href: "/bestsellers" },
  ],
  support: [
    { name: "Help Center", href: "/help" },
    { name: "Track Order", href: "/track" },
    { name: "Shipping Info", href: "/shipping" },
    { name: "Returns & Refunds", href: "/returns" },
    { name: "Contact Us", href: "/contact" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "Careers", href: "/careers" },
    { name: "Press & Media", href: "/press" },
    { name: "Partnerships", href: "/partnerships" },
    { name: "Blog", href: "/blog" },
  ],
  vendors: [
    { name: "Start Selling", href: "/vendor/register" },
    { name: "Seller Guide", href: "/vendor/guide" },
    { name: "Pricing & Fees", href: "/vendor/pricing" },
    { name: "Seller Support", href: "/vendor/support" },
    { name: "Seller Portal", href: "/vendor/login" },
  ],
};

export const socialLinks = [
  {
    name: "Facebook",
    href: "#",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Twitter",
    href: "#",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "#",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "#",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
];
