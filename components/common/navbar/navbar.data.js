import {
  Zap, Laptop, Shirt, Home as HomeIcon, Gem, Dumbbell,
  BookOpen, Phone, LayoutGrid,
} from "lucide-react";

export const PROMO_MESSAGES = [
  { text: "Shop from verified Nigerian vendors — nationwide delivery", icon: "🚚" },
  { text: "Flash Sale is LIVE — Up to 70% off today only",             icon: "⚡" },
  { text: "Sell on CarmelMart — Join thousands of verified vendors",    icon: "🏪" },
];

export const SEARCH_SUGGESTIONS = [
  { label: "Nike Sneakers",       category: "Fashion"     },
  { label: "iPhone 15 Pro",       category: "Electronics" },
  { label: "Standing Desk",       category: "Home"        },
  { label: "Face Serum",          category: "Beauty"      },
  { label: "Gaming Chair",        category: "Home"        },
  { label: "Wireless Earbuds",    category: "Electronics" },
  { label: "African Print Dress", category: "Fashion"     },
  { label: "Protein Supplement",  category: "Sports"      },
  { label: "Laptop Backpack",     category: "Electronics" },
  { label: "Skincare Bundle",     category: "Beauty"      },
];

export const SEARCH_CATEGORIES = [
  "All Categories", "Fashion", "Electronics", "Phones",
  "Home & Living", "Beauty", "Sports", "Books",
];

export const CATEGORIES = [
  { name: "All Departments", href: "/shop",                       icon: LayoutGrid          },
  { name: "Fashion",         href: "/shop?category=fashion",      icon: Shirt               },
  { name: "Electronics",     href: "/shop?category=electronics",  icon: Laptop              },
  { name: "Phones",          href: "/shop?category=phones",       icon: Phone               },
  { name: "Home",            href: "/shop?category=home-living",  icon: HomeIcon            },
  { name: "Beauty",          href: "/shop?category=beauty",       icon: Gem                 },
  { name: "Sports",          href: "/shop?category=sports",       icon: Dumbbell            },
  { name: "Books",           href: "/shop?category=books",        icon: BookOpen            },
  { name: "Flash Sale",      href: "/shop?sort=flash_sale",       icon: Zap,   hot: true    },
];

export const CATEGORY_SUBS = {
  Fashion:     { subs: ["Men's Wear", "Women's Wear", "Shoes & Sneakers", "Bags & Accessories", "Watches", "Traditional Wear"], href: "/shop?category=fashion"    },
  Electronics: { subs: ["Laptops & Computers", "Televisions", "Audio & Headphones", "Cameras", "Gaming", "Smart Home"],        href: "/shop?category=electronics" },
  Phones:      { subs: ["Smartphones", "Feature Phones", "Phone Cases", "Chargers & Cables", "Screen Protectors", "Power Banks"], href: "/shop?category=phones"   },
  Home:        { subs: ["Furniture", "Kitchen & Dining", "Bedding & Pillows", "Home Decor", "Lighting", "Storage"],             href: "/shop?category=home-living" },
  Beauty:      { subs: ["Skincare", "Makeup", "Hair Care", "Fragrances", "Nail Care", "Personal Care"],                        href: "/shop?category=beauty"      },
  Sports:      { subs: ["Gym Equipment", "Sportswear", "Supplements", "Outdoor & Camping", "Cycling", "Swimming"],             href: "/shop?category=sports"      },
  Books:       { subs: ["Fiction", "Non-Fiction", "Academic & Textbooks", "Children's Books", "Business", "Self Help"],        href: "/shop?category=books"       },
};

export const NIGERIAN_STATES = [
  "Lagos", "Abuja (FCT)", "Rivers", "Kano", "Oyo", "Delta",
  "Anambra", "Kaduna", "Enugu", "Ondo", "Osun", "Ogun", "Edo", "Kwara", "Plateau",
];
