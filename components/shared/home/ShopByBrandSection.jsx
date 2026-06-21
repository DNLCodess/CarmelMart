"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

const BRANDS = [
  { name: "Apple",    logo: "🍎", color: "bg-gray-50 hover:bg-gray-100",      href: "/shop?brand=Apple"    },
  { name: "Samsung",  logo: "🔵", color: "bg-blue-50 hover:bg-blue-100",      href: "/shop?brand=Samsung"  },
  { name: "Nike",     logo: "✔",  color: "bg-black hover:bg-gray-900 text-white", href: "/shop?brand=Nike" },
  { name: "Adidas",   logo: "🎽", color: "bg-gray-50 hover:bg-gray-100",      href: "/shop?brand=Adidas"   },
  { name: "Sony",     logo: "🎮", color: "bg-gray-50 hover:bg-gray-100",      href: "/shop?brand=Sony"     },
  { name: "LG",       logo: "📺", color: "bg-red-50 hover:bg-red-100",        href: "/shop?brand=LG"       },
  { name: "HP",       logo: "💻", color: "bg-blue-50 hover:bg-blue-100",      href: "/shop?brand=HP"       },
  { name: "Infinix",  logo: "📱", color: "bg-green-50 hover:bg-green-100",    href: "/shop?brand=Infinix"  },
  { name: "Tecno",    logo: "📲", color: "bg-purple-50 hover:bg-purple-100",  href: "/shop?brand=Tecno"    },
  { name: "Xiaomi",   logo: "🟠", color: "bg-orange-50 hover:bg-orange-100",  href: "/shop?brand=Xiaomi"   },
  { name: "Lenovo",   logo: "🖥",  color: "bg-gray-50 hover:bg-gray-100",     href: "/shop?brand=Lenovo"   },
  { name: "Hisense",  logo: "❄",  color: "bg-cyan-50 hover:bg-cyan-100",      href: "/shop?brand=Hisense"  },
];

export default function ShopByBrandSection() {
  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Shop by Brand</h2>
            <p className="text-gray-500 text-sm mt-1">Find your favourite brands on CarmelMart</p>
          </div>
          <Link
            href="/shop"
            className="hidden sm:flex items-center gap-1 text-primary text-sm font-semibold hover:gap-2 transition-all"
          >
            All brands <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Scrollable on mobile, grid on desktop */}
        <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-6 lg:grid-cols-12 sm:overflow-visible sm:pb-0">
          {BRANDS.map((brand, i) => (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              className="shrink-0 sm:shrink"
            >
              <Link href={brand.href}>
                <div className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-gray-100 p-3 w-20 sm:w-auto sm:aspect-square transition-all duration-200 shadow-sm hover:shadow-md ${brand.color}`}>
                  <span className="text-xl" aria-hidden="true">{brand.logo}</span>
                  <span className={`text-xs font-bold truncate ${brand.color.includes("text-white") ? "text-white" : "text-gray-700"}`}>
                    {brand.name}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
